const { withTransaction } = require("../utils/transaction");
const {
  lockSeats,
  confirmBooking,
  releaseSeats,
} = require("../queries/bookings");
const { listMyBookings } = require("../queries/myBookings");

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

async function listMyBookingsHandler(req, res) {
  const bookings = await listMyBookings(req.user.id, req.query);
  return res.status(200).json({ count: bookings.length, bookings });
}

module.exports = {
  lockSeatsHandler,
  confirmBookingHandler,
  releaseSeatsHandler,
  listMyBookingsHandler,
};
