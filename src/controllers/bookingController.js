const { withTransaction } = require("../utils/transaction");
const {
  lockSeats,
  confirmBooking,
  releaseSeats,
} = require("../queries/bookings");

async function lockSeatsHandler(req, res) {
  const { showId, showSeatIds } = req.body || {};

  const locked = await withTransaction((client) =>
    lockSeats(client, { showId, showSeatIds, userId: req.user.id }),
  );

  return res.status(200).json({
    message: "Seats locked",
    lockedUntil: locked[0].locked_until,
    seats: locked.map((s) => s.show_seat_id),
  });
}

async function confirmBookingHandler(req, res) {
  const { showId, showSeatIds } = req.body || {};

  const result = await withTransaction((client) =>
    confirmBooking(client, { showId, showSeatIds, userId: req.user.id }),
  );

  return res.status(201).json({
    message: "Booking created, payment pending",
    booking: result.booking,
    seats: result.seats,
    payBy: result.payBy,
  });
}

async function releaseSeatsHandler(req, res) {
  const { showId, showSeatIds } = req.body || {};

  const released = await withTransaction((client) =>
    releaseSeats(client, { showId, showSeatIds, userId: req.user.id }),
  );

  return res.status(200).json({ message: "Seats released", released });
}

module.exports = {
  lockSeatsHandler,
  confirmBookingHandler,
  releaseSeatsHandler,
};
