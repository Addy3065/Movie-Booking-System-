const { withTransaction } = require("../utils/transaction");
const {
  lockSeats,
  confirmBooking,
  releaseSeats,
} = require("../queries/bookings");

function sendError(res, err) {
  if (err.status) {
    const body = { error: err.message };
    if (err.unavailable) body.unavailable = err.unavailable;
    return res.status(err.status).json(body);
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

async function lockSeatsHandler(req, res) {
  const { showId, showSeatIds } = req.body || {};

  try {
    const locked = await withTransaction((client) =>
      lockSeats(client, { showId, showSeatIds, userId: req.user.id }),
    );

    return res.status(200).json({
      message: "Seats locked",
      lockedUntil: locked[0].locked_until,
      seats: locked.map((s) => s.show_seat_id),
    });
  } catch (err) {
    return sendError(res, err);
  }
}

async function confirmBookingHandler(req, res) {
  const { showId, showSeatIds } = req.body || {};

  try {
    const result = await withTransaction((client) =>
      confirmBooking(client, { showId, showSeatIds, userId: req.user.id }),
    );

    return res.status(201).json({
      message: "Booking created, payment pending",
      booking: result.booking,
      seats: result.seats,
      payBy: result.payBy,
    });
  } catch (err) {
    return sendError(res, err);
  }
}

async function releaseSeatsHandler(req, res) {
  const { showId, showSeatIds } = req.body || {};

  try {
    const released = await withTransaction((client) =>
      releaseSeats(client, { showId, showSeatIds, userId: req.user.id }),
    );

    return res.status(200).json({ message: "Seats released", released });
  } catch (err) {
    return sendError(res, err);
  }
}

module.exports = {
  lockSeatsHandler,
  confirmBookingHandler,
  releaseSeatsHandler,
};
