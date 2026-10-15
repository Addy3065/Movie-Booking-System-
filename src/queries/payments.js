const { httpError } = require("../utils/httpError");
const { parsePositiveInt } = require("../utils/validate");

function parsePaymentRequest({ bookingId, simulate, userId }) {
  const uid = Number(userId);

  if (!Number.isInteger(uid) || uid <= 0) {
    throw httpError(401, "Invalid user");
  }
  const bid = parsePositiveInt(bookingId, "bookingId");

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
       SELECT show_seat_id FROM booking_seats WHERE booking_id = ?
     )`,
    [bookingId],
  );
  await client.query(`DELETE FROM booking_seats WHERE booking_id = ?`, [
    bookingId,
  ]);
  await client.query(
    `UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?`,
    [bookingId],
  );
}

async function processPayment(client, request) {
  const { uid, bid, simulate } = parsePaymentRequest(request);

  const [bookingRows] = await client.query(
    `SELECT booking_id, user_id, status, total_amount
     FROM bookings
     WHERE booking_id = ?
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

  const [seatRows] = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            ss.locked_by,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW(3)) AS lock_active
     FROM show_seats ss
     WHERE ss.show_seat_id IN (
       SELECT bs.show_seat_id FROM booking_seats bs WHERE bs.booking_id = ?
     )
     ORDER BY ss.show_seat_id
     FOR UPDATE`,
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
    const [result] = await client.query(
      `INSERT INTO payments (booking_id, amount, status)
       VALUES (?, ?, 'failed')`,
      [bid, booking.total_amount],
    );
    await cancelBookingAndFreeSeats(client, bid);
    return {
      outcome: "failed",
      paymentId: result.insertId,
      bookingId: bid,
      amount: booking.total_amount,
    };
  }

  const [result] = await client.query(
    `INSERT INTO payments (booking_id, amount, status)
     VALUES (?, ?, 'success')`,
    [bid, booking.total_amount],
  );
  await client.query(
    `UPDATE show_seats
     SET status = 'booked', locked_by = NULL, locked_until = NULL
     WHERE show_seat_id IN (
       SELECT show_seat_id FROM booking_seats WHERE booking_id = ?
     )`,
    [bid],
  );
  await client.query(
    `UPDATE bookings SET status = 'confirmed' WHERE booking_id = ?`,
    [bid],
  );

  return {
    outcome: "success",
    paymentId: result.insertId,
    bookingId: bid,
    amount: booking.total_amount,
  };
}

module.exports = { processPayment };
