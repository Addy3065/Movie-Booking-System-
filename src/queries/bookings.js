const { httpError } = require("../utils/httpError");

const LOCK_MINUTES = 5;
const PAYMENT_WINDOW_MINUTES = 10;

function parseSeatRequest({ showId, showSeatIds, userId }) {
  const uid = Number(userId);
  const sid = Number(showId);

  if (!Number.isInteger(uid) || uid <= 0) {
    throw httpError(401, "Invalid user");
  }
  if (!Number.isInteger(sid) || sid <= 0) {
    throw httpError(400, "showId must be a positive integer");
  }
  if (!Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    throw httpError(400, "showSeatIds must be a non-empty array");
  }

  const ids = [...new Set(showSeatIds.map(Number))];

  if (!ids.every((n) => Number.isInteger(n) && n > 0)) {
    throw httpError(400, "showSeatIds must contain only positive integers");
  }

  return { uid, sid, ids };
}

async function releaseStalePendingBookings(client, ids) {
  await client.query(
    `WITH stale AS (
       SELECT DISTINCT b.booking_id
       FROM bookings b
       JOIN booking_seats bs ON bs.booking_id = b.booking_id
       JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
       WHERE b.status = 'pending'
         AND bs.show_seat_id = ANY($1::int[])
         AND (ss.locked_until IS NULL OR ss.locked_until <= NOW())
     ),
     cancelled AS (
       UPDATE bookings
       SET status = 'cancelled'
       WHERE booking_id IN (SELECT booking_id FROM stale)
         AND status = 'pending'
       RETURNING booking_id
     )
     DELETE FROM booking_seats
     WHERE booking_id IN (SELECT booking_id FROM cancelled)`,
    [ids],
  );
}

async function lockSeats(client, request) {
  const { uid, sid, ids } = parseSeatRequest(request);

  await releaseStalePendingBookings(client, ids);

  const { rows } = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            ss.locked_by,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW()) AS lock_active,
            EXISTS (
              SELECT 1 FROM booking_seats bs
              WHERE bs.show_seat_id = ss.show_seat_id
            ) AS has_booking
     FROM show_seats ss
     WHERE ss.show_id = $1 AND ss.show_seat_id = ANY($2::int[])
     ORDER BY ss.show_seat_id
     FOR UPDATE OF ss`,
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

  const { rows: locked } = await client.query(
    `UPDATE show_seats
     SET status = 'locked',
         locked_by = $2,
         locked_until = NOW() + make_interval(mins => $3::int)
     WHERE show_seat_id = ANY($1::int[])
     RETURNING show_seat_id, locked_until`,
    [ids, uid, LOCK_MINUTES],
  );

  return locked;
}

async function confirmBooking(client, request) {
  const { uid, sid, ids } = parseSeatRequest(request);

  const { rows } = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            ss.locked_by,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW()) AS lock_active,
            ROUND(sh.base_price * st.price_multiplier, 2) AS price,
            EXISTS (
              SELECT 1 FROM booking_seats bs
              WHERE bs.show_seat_id = ss.show_seat_id
            ) AS has_booking
     FROM show_seats ss
     JOIN shows sh ON sh.show_id = ss.show_id
     JOIN seats s ON s.seat_id = ss.seat_id
     JOIN seat_types st ON st.seat_type_id = s.seat_type_id
     WHERE ss.show_id = $1 AND ss.show_seat_id = ANY($2::int[])
     ORDER BY ss.show_seat_id
     FOR UPDATE OF ss`,
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

  const { rows: bookingRows } = await client.query(
    `INSERT INTO bookings (user_id, status, total_amount)
     VALUES ($1, 'pending', $2)
     RETURNING booking_id, booking_time, status, total_amount`,
    [uid, total],
  );
  const booking = bookingRows[0];

  await client.query(
    `INSERT INTO booking_seats (booking_id, show_seat_id, price)
     SELECT $1, x.id, x.price
     FROM unnest($2::int[], $3::numeric[]) AS x(id, price)`,
    [
      booking.booking_id,
      rows.map((r) => r.show_seat_id),
      rows.map((r) => r.price),
    ],
  );

  const { rows: extended } = await client.query(
    `UPDATE show_seats
     SET locked_until = NOW() + make_interval(mins => $2::int)
     WHERE show_seat_id = ANY($1::int[])
     RETURNING locked_until`,
    [ids, PAYMENT_WINDOW_MINUTES],
  );

  return {
    booking,
    seats: rows.map((r) => ({ show_seat_id: r.show_seat_id, price: r.price })),
    payBy: extended[0].locked_until,
  };
}

async function releaseSeats(client, request) {
  const { uid, sid, ids } = parseSeatRequest(request);

  const { rows } = await client.query(
    `WITH target AS (
       SELECT ss.show_seat_id
       FROM show_seats ss
       WHERE ss.show_id = $1
         AND ss.show_seat_id = ANY($2::int[])
         AND ss.status = 'locked'
         AND ss.locked_by = $3
         AND NOT EXISTS (
           SELECT 1 FROM booking_seats bs
           WHERE bs.show_seat_id = ss.show_seat_id
         )
       ORDER BY ss.show_seat_id
       FOR UPDATE OF ss
     )
     UPDATE show_seats
     SET status = 'available', locked_by = NULL, locked_until = NULL
     WHERE show_seat_id IN (SELECT show_seat_id FROM target)
     RETURNING show_seat_id`,
    [sid, ids, uid],
  );

  return rows.map((r) => r.show_seat_id);
}

module.exports = { lockSeats, confirmBooking, releaseSeats };
