const { httpError } = require("../utils/httpError");
const { parsePositiveInt } = require("../utils/validate");

const LOCK_MINUTES = 5;
const PAYMENT_WINDOW_MINUTES = 10;
const MAX_SEATS_PER_REQUEST = 10;
const BOOKING_CUTOFF_MINUTES = 30;

function parseSeatRequest({ showId, showSeatIds, userId }) {
  const uid = Number(userId);

  if (!Number.isInteger(uid) || uid <= 0) {
    throw httpError(401, "Invalid user");
  }
  const sid = parsePositiveInt(showId, "showId");

  if (!Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    throw httpError(400, "showSeatIds must be a non-empty array");
  }
  if (showSeatIds.length > MAX_SEATS_PER_REQUEST) {
    throw httpError(
      400,
      `showSeatIds cannot contain more than ${MAX_SEATS_PER_REQUEST} seats`,
    );
  }

  const ids = [
    ...new Set(
      showSeatIds.map((v) => parsePositiveInt(v, "each showSeatIds entry")),
    ),
  ];

  return { uid, sid, ids };
}

async function assertShowBookable(client, showId, cutoffMinutes) {
  const [rows] = await client.query(
    `SELECT show_time > NOW() AS not_started,
            show_time > NOW() + INTERVAL ? MINUTE AS before_cutoff
     FROM shows
     WHERE show_id = ?`,
    [cutoffMinutes, showId],
  );
  if (rows.length === 0) {
    throw httpError(404, "Show not found");
  }
  if (!rows[0].not_started) {
    throw httpError(409, "Show has already started; booking is closed");
  }
  if (!rows[0].before_cutoff) {
    throw httpError(
      409,
      `Booking closes ${cutoffMinutes} minutes before the show starts`,
    );
  }
}

async function releaseStalePendingBookings(client, ids) {
  const [stale] = await client.query(
    `SELECT DISTINCT b.booking_id
     FROM bookings b
     JOIN booking_seats bs ON bs.booking_id = b.booking_id
     JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
     WHERE b.status = 'pending'
       AND bs.show_seat_id IN (?)
       AND (ss.locked_until IS NULL OR ss.locked_until <= NOW(3))`,
    [ids],
  );
  if (stale.length === 0) return;

  // lock + re-check status so a booking paid meanwhile is left alone
  const [cancelled] = await client.query(
    `SELECT booking_id
     FROM bookings
     WHERE booking_id IN (?) AND status = 'pending'
     ORDER BY booking_id
     FOR UPDATE`,
    [stale.map((r) => r.booking_id)],
  );
  if (cancelled.length === 0) return;

  const cancelledIds = cancelled.map((r) => r.booking_id);
  await client.query(
    "UPDATE bookings SET status = 'cancelled' WHERE booking_id IN (?)",
    [cancelledIds],
  );
  await client.query("DELETE FROM booking_seats WHERE booking_id IN (?)", [
    cancelledIds,
  ]);
}

async function lockSeats(client, request) {
  const { uid, sid, ids } = parseSeatRequest(request);

  await assertShowBookable(client, sid, BOOKING_CUTOFF_MINUTES);

  await releaseStalePendingBookings(client, ids);
  // read
  const [rows] = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            ss.locked_by,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW(3)) AS lock_active,
            EXISTS (
              SELECT 1 FROM booking_seats bs
              WHERE bs.show_seat_id = ss.show_seat_id
            ) AS has_booking
     FROM show_seats ss
     WHERE ss.show_id = ? AND ss.show_seat_id IN (?)
     ORDER BY ss.show_seat_id
     FOR UPDATE`,
    [sid, ids],
  );

  if (rows.length !== ids.length) {
    throw httpError(404, "One or more seats do not belong to this show");
  }

  const unavailable = rows
    .filter(
      (r) =>
        r.status === "booked" ||
        r.has_booking ||
        (r.status === "locked" && r.lock_active && r.locked_by !== uid),
    )
    .map((r) => r.show_seat_id);

  if (unavailable.length > 0) {
    const err = httpError(409, "Some seats are no longer available");
    err.unavailable = unavailable;
    throw err;
  }
  // write
  await client.query(
    `UPDATE show_seats
     SET status = 'locked',
         locked_by = ?,
         locked_until = NOW(3) + INTERVAL ? MINUTE
     WHERE show_seat_id IN (?)`,
    [uid, LOCK_MINUTES, ids],
  );
  const [locked] = await client.query(
    `SELECT show_seat_id, locked_until
     FROM show_seats
     WHERE show_seat_id IN (?)
     ORDER BY show_seat_id`,
    [ids],
  );

  return locked;
}

async function confirmBooking(client, request) {
  const { uid, sid, ids } = parseSeatRequest(request);

  await assertShowBookable(client, sid, 0);

  // lock only the show_seats rows; FOR UPDATE would also lock every joined table
  await client.query(
    `SELECT show_seat_id FROM show_seats
     WHERE show_id = ? AND show_seat_id IN (?)
     ORDER BY show_seat_id
     FOR UPDATE`,
    [sid, ids],
  );
  const [rows] = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            ss.locked_by,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW(3)) AS lock_active,
            ROUND(sh.base_price * st.price_multiplier, 2) AS price,
            EXISTS (
              SELECT 1 FROM booking_seats bs
              WHERE bs.show_seat_id = ss.show_seat_id
            ) AS has_booking
     FROM show_seats ss
     JOIN shows sh ON sh.show_id = ss.show_id
     JOIN seats s ON s.seat_id = ss.seat_id
     JOIN seat_types st ON st.seat_type_id = s.seat_type_id
     WHERE ss.show_id = ? AND ss.show_seat_id IN (?)
     ORDER BY ss.show_seat_id`,
    [sid, ids],
  );

  if (rows.length !== ids.length) {
    throw httpError(404, "One or more seats do not belong to this show");
  }

  const notHeld = rows
    .filter(
      (r) =>
        r.has_booking ||
        r.status !== "locked" ||
        r.locked_by !== uid ||
        !r.lock_active,
    )
    .map((r) => r.show_seat_id);

  if (notHeld.length > 0) {
    const err = httpError(409, "Seat lock missing, expired, or already used");
    err.unavailable = notHeld;
    throw err;
  }

  const totalPaise = rows.reduce(
    (sum, r) => sum + Math.round(Number(r.price) * 100),
    0,
  );
  const total = (totalPaise / 100).toFixed(2);

  const [inserted] = await client.query(
    `INSERT INTO bookings (user_id, status, total_amount)
     VALUES (?, 'pending', ?)`,
    [uid, total],
  );
  const [bookingRows] = await client.query(
    `SELECT booking_id, booking_time, status, total_amount
     FROM bookings WHERE booking_id = ?`,
    [inserted.insertId],
  );
  const booking = bookingRows[0];

  await client.query(
    `INSERT INTO booking_seats (booking_id, show_seat_id, price) VALUES ?`,
    [rows.map((r) => [booking.booking_id, r.show_seat_id, r.price])],
  );

  await client.query(
    `UPDATE show_seats
     SET locked_until = NOW(3) + INTERVAL ? MINUTE
     WHERE show_seat_id IN (?)`,
    [PAYMENT_WINDOW_MINUTES, ids],
  );
  const [extended] = await client.query(
    "SELECT locked_until FROM show_seats WHERE show_seat_id IN (?) LIMIT 1",
    [ids],
  );

  return {
    booking,
    seats: rows.map((r) => ({ show_seat_id: r.show_seat_id, price: r.price })),
    payBy: extended[0].locked_until,
  };
}

async function releaseSeats(client, request) {
  const { uid, sid, ids } = parseSeatRequest(request);

  const [rows] = await client.query(
    `SELECT ss.show_seat_id
     FROM show_seats ss
     WHERE ss.show_id = ?
       AND ss.show_seat_id IN (?)
       AND ss.status = 'locked'
       AND ss.locked_by = ?
       AND NOT EXISTS (
         SELECT 1 FROM booking_seats bs
         WHERE bs.show_seat_id = ss.show_seat_id
       )
     ORDER BY ss.show_seat_id
     FOR UPDATE`,
    [sid, ids, uid],
  );
  const released = rows.map((r) => r.show_seat_id);
  if (released.length === 0) return released;

  await client.query(
    `UPDATE show_seats
     SET status = 'available', locked_by = NULL, locked_until = NULL
     WHERE show_seat_id IN (?)`,
    [released],
  );

  return released;
}

module.exports = { lockSeats, confirmBooking, releaseSeats };
