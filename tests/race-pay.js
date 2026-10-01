require("dotenv").config();
const { pool } = require("../db/db");

const [argToken1, argToken2, argShowId] = process.argv.slice(2);
const TOKEN1 = argToken1 || process.env.TOKEN1;
const TOKEN2 = argToken2 || process.env.TOKEN2;
const SHOW_ID = Number(argShowId || process.env.SHOW_ID || 1);
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DOUBLE_PAY_ATTEMPTS = 10;
const STALE_ROUNDS = 10;

const created = { bookingIds: [], seatIds: [] };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function pickSeats(count) {
  const { rows } = await pool.query(
    `SELECT show_seat_id
     FROM show_seats
     WHERE show_id = $1 AND status = 'available'
     ORDER BY show_seat_id
     LIMIT $2`,
    [SHOW_ID, count],
  );
  if (rows.length < count) {
    throw new Error(
      `Need ${count} available seats on show ${SHOW_ID}, found ${rows.length}`,
    );
  }
  const ids = rows.map((r) => r.show_seat_id);
  created.seatIds.push(...ids);
  return ids;
}

async function createPendingBooking(token, seatId) {
  const body = { showId: SHOW_ID, showSeatIds: [seatId] };
  const lock = await api("POST", "/api/bookings/lock", token, body);
  if (lock.status !== 200) {
    throw new Error(
      `Setup lock failed: ${lock.status} ${JSON.stringify(lock.data)}`,
    );
  }
  const confirm = await api("POST", "/api/bookings/confirm", token, body);
  if (confirm.status !== 201) {
    throw new Error(
      `Setup confirm failed: ${confirm.status} ${JSON.stringify(confirm.data)}`,
    );
  }
  const bookingId = confirm.data.booking.booking_id;
  created.bookingIds.push(bookingId);
  return bookingId;
}

async function snapshot(bookingId, seatId) {
  const booking = await pool.query(
    "SELECT status FROM bookings WHERE booking_id = $1",
    [bookingId],
  );
  const bookingSeats = await pool.query(
    "SELECT COUNT(*)::int AS n FROM booking_seats WHERE booking_id = $1",
    [bookingId],
  );
  const payments = await pool.query(
    "SELECT status FROM payments WHERE booking_id = $1",
    [bookingId],
  );
  const seat = await pool.query(
    "SELECT status, locked_by FROM show_seats WHERE show_seat_id = $1",
    [seatId],
  );
  return {
    bookingStatus: booking.rows[0].status,
    bookingSeatCount: bookingSeats.rows[0].n,
    payments: payments.rows,
    seat: seat.rows[0],
  };
}

async function doublePayTest() {
  console.log(
    `\nTest 1: ${DOUBLE_PAY_ATTEMPTS} simultaneous pay calls on one booking`,
  );
  const [seatId] = await pickSeats(1);
  const bookingId = await createPendingBooking(TOKEN1, seatId);

  const results = await Promise.all(
    Array.from({ length: DOUBLE_PAY_ATTEMPTS }, () =>
      api("POST", "/api/payments/pay", TOKEN1, {
        bookingId,
        simulate: "success",
      }),
    ),
  );

  const ok = results.filter((r) => r.status === 200).length;
  const conflict = results.filter((r) => r.status === 409).length;
  const snap = await snapshot(bookingId, seatId);

  const problems = [];
  if (ok !== 1) problems.push(`expected exactly one 200, got ${ok}`);
  if (conflict !== DOUBLE_PAY_ATTEMPTS - 1) {
    problems.push(
      `expected ${DOUBLE_PAY_ATTEMPTS - 1} conflicts, got ${conflict}`,
    );
  }
  if (snap.payments.length !== 1) {
    problems.push(`expected 1 payment row, got ${snap.payments.length}`);
  }
  if (snap.bookingStatus !== "confirmed") {
    problems.push(`booking is ${snap.bookingStatus}`);
  }
  if (snap.seat.status !== "booked") {
    problems.push(`seat is ${snap.seat.status}`);
  }

  console.log(
    `  200s: ${ok}, 409s: ${conflict}, payment rows: ${snap.payments.length}`,
  );
  console.log(
    problems.length === 0 ? "  PASS" : `  FAIL: ${problems.join("; ")}`,
  );
  return problems.length === 0;
}

async function staleRaceTest() {
  console.log(`\nTest 2: pay vs stale-release race, ${STALE_ROUNDS} rounds`);
  const seatIds = await pickSeats(STALE_ROUNDS);
  const outcomes = {};
  let failures = 0;

  for (let i = 0; i < seatIds.length; i++) {
    const seatId = seatIds[i];
    const bookingId = await createPendingBooking(TOKEN1, seatId);

    await pool.query(
      `UPDATE show_seats
       SET locked_until = NOW() + interval '1500 milliseconds'
       WHERE show_seat_id = $1`,
      [seatId],
    );

    await sleep(1400 + Math.random() * 200);

    const [pay, lock] = await Promise.all([
      api("POST", "/api/payments/pay", TOKEN1, {
        bookingId,
        simulate: "success",
      }),
      api("POST", "/api/bookings/lock", TOKEN2, {
        showId: SHOW_ID,
        showSeatIds: [seatId],
      }),
    ]);

    const snap = await snapshot(bookingId, seatId);
    const key = `pay ${pay.status} / lock ${lock.status} / booking ${snap.bookingStatus}`;
    outcomes[key] = (outcomes[key] || 0) + 1;

    const problems = [];
    if (pay.status === 200 && lock.status === 200) {
      problems.push("both pay and the other user's lock succeeded");
    }
    if (pay.status === 200 && snap.bookingStatus !== "confirmed") {
      problems.push(`pay returned 200 but booking is ${snap.bookingStatus}`);
    }
    if (snap.bookingStatus === "confirmed" && snap.bookingSeatCount === 0) {
      problems.push("confirmed booking lost its booking_seats");
    }
    if (snap.bookingStatus === "confirmed" && snap.seat.status !== "booked") {
      problems.push(`confirmed booking but seat is ${snap.seat.status}`);
    }
    if (snap.bookingStatus === "cancelled" && snap.bookingSeatCount > 0) {
      problems.push("cancelled booking still has booking_seats");
    }

    if (problems.length > 0) {
      failures++;
      console.log(`  round ${i + 1} FAIL (${key}): ${problems.join("; ")}`);
    }
  }

  console.log("  outcomes:");
  for (const [key, n] of Object.entries(outcomes)) {
    console.log(`    ${n}x ${key}`);
  }
  console.log(failures === 0 ? "  PASS" : `  FAIL: ${failures} bad round(s)`);
  return failures === 0;
}

async function cleanup() {
  if (created.bookingIds.length > 0) {
    await pool.query("DELETE FROM payments WHERE booking_id = ANY($1::int[])", [
      created.bookingIds,
    ]);
    await pool.query(
      "DELETE FROM booking_seats WHERE booking_id = ANY($1::int[])",
      [created.bookingIds],
    );
    await pool.query("DELETE FROM bookings WHERE booking_id = ANY($1::int[])", [
      created.bookingIds,
    ]);
  }
  if (created.seatIds.length > 0) {
    await pool.query(
      `UPDATE show_seats
       SET status = 'available', locked_by = NULL, locked_until = NULL
       WHERE show_seat_id = ANY($1::int[])`,
      [created.seatIds],
    );
  }
}

async function main() {
  if (!TOKEN1 || !TOKEN2) {
    console.error("Usage: node tests/race-pay.js <token1> <token2> [showId]");
    process.exit(1);
  }

  let allPassed = false;
  try {
    const first = await doublePayTest();
    const second = await staleRaceTest();
    allPassed = first && second;
  } catch (err) {
    console.error(err);
  } finally {
    await cleanup();
    await pool.end();
  }

  console.log(allPassed ? "\nAll race tests passed" : "\nRace tests failed");
  process.exit(allPassed ? 0 : 1);
}

main();
