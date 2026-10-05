const {
  listBookings,
  revenueByMovie,
  showOccupancy,
} = require("../queries/adminReports");

function sendError(res, err) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.code === "22007" || err.code === "22008") {
    return res.status(400).json({ error: "from/to is not a valid date" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

async function listBookingsHandler(req, res) {
  try {
    const bookings = await listBookings(req.query);
    return res.status(200).json({ count: bookings.length, bookings });
  } catch (err) {
    return sendError(res, err);
  }
}

async function revenueHandler(req, res) {
  try {
    const movies = await revenueByMovie();
    return res.status(200).json({ movies });
  } catch (err) {
    return sendError(res, err);
  }
}

async function showOccupancyHandler(req, res) {
  try {
    const shows = await showOccupancy(req.query);
    return res.status(200).json({ shows });
  } catch (err) {
    return sendError(res, err);
  }
}

module.exports = {
  listBookingsHandler,
  revenueHandler,
  showOccupancyHandler,
};
