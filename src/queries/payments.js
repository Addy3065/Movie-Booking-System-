const { httpError } = require("../utils/httpError");

function parsePaymentRequest({ bookingId, simulate, userId }) {
  const uid = Number(userId);
  const bid = Number(bookingId);

  if (!Number.isInteger(uid) || uid <= 0) {
    throw httpError(401, "Invalid user");
  }
  if (!Number.isInteger(bid) || bid <= 0) {
    throw httpError(400, "bookingId must be a positive integer");
  }
  if (simulate !== "success" && simulate !== "failure") {
    throw httpError(400, "simulate must be 'success' or 'failure'");
  }

  return { uid, bid, simulate };
}

async function cancelBookingAndFreeSeats(client, bookingId) {
  await client.query(
    `UPDATE show_seats
     SET status = 'available', locked_by = NULL, locked_until = NULL
     WHERE show_seat_id IN (
       SELECT show_seat_id FROM booking_seats WHERE booking_id = $1
     )`,
    [bookingId],
  );
  await client.query(`DELETE FROM booking_seats WHERE booking_id = $1`, [
    bookingId,
  ]);
  await client.query(
    `UPDATE bookings SET status = 'cancelled' WHERE booking_id = $1`,
    [bookingId],
  );
}

async function processPayment(client, request) {
  const { uid, bid, simulate } = parsePaymentRequest(request);

  const { rows: bookingRows } = await client.query(
    `SELECT booking_id, user_id, status, total_amount
     FROM bookings
     WHERE booking_id = $1
     FOR UPDATE`,
    [bid],
  );

  if (bookingRows.length === 0) {
    throw httpError(404, "Booking not found");
  }

  const booking = bookingRows[0];

  if (booking.user_id !== uid) {
    throw httpError(403, "This booking does not belong to you");
  }
  if (booking.status !== "pending") {
    throw httpError(409, `Booking is already ${booking.status}`);
  }

  const { rows: seatRows } = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            ss.locked_by,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW()) AS lock_active
     FROM booking_seats bs
     JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
     WHERE bs.booking_id = $1
     ORDER BY ss.show_seat_id
     FOR UPDATE OF ss`,
    [bid],
  );

  const stillHeld =
    seatRows.length > 0 &&
    seatRows.every(
      (r) => r.status === "locked" && r.locked_by === uid && r.lock_active,
    );

  if (!stillHeld) {
    await cancelBookingAndFreeSeats(client, bid);
    return { outcome: "expired", bookingId: bid };
  }

  if (simulate === "failure") {
    const { rows } = await client.query(
      `INSERT INTO payments (booking_id, amount, status)
       VALUES ($1, $2, 'failed')
       RETURNING payment_id`,
      [bid, booking.total_amount],
    );
    await cancelBookingAndFreeSeats(client, bid);
    return {
      outcome: "failed",
      paymentId: rows[0].payment_id,
      bookingId: bid,
      amount: booking.total_amount,
    };
  }

  const { rows } = await client.query(
    `INSERT INTO payments (booking_id, amount, status)
     VALUES ($1, $2, 'success')
     RETURNING payment_id`,
    [bid, booking.total_amount],
  );
  await client.query(
    `UPDATE show_seats
     SET status = 'booked', locked_by = NULL, locked_until = NULL
     WHERE show_seat_id IN (
       SELECT show_seat_id FROM booking_seats WHERE booking_id = $1
     )`,
    [bid],
  );
  await client.query(
    `UPDATE bookings SET status = 'confirmed' WHERE booking_id = $1`,
    [bid],
  );

  return {
    outcome: "success",
    paymentId: rows[0].payment_id,
    bookingId: bid,
    amount: booking.total_amount,
  };
}

module.exports = { processPayment };
