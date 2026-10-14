const {
  listBookings,
  revenueByMovie,
  showOccupancy,
} = require("../queries/adminReports");

async function listBookingsHandler(req, res) {
  const bookings = await listBookings(req.query);
  return res.status(200).json({ count: bookings.length, bookings });
}

async function revenueHandler(req, res) {
  const movies = await revenueByMovie();
  return res.status(200).json({ movies });
}

async function showOccupancyHandler(req, res) {
  const shows = await showOccupancy(req.query);
  return res.status(200).json({ shows });
}

module.exports = {
  listBookingsHandler,
  revenueHandler,
  showOccupancyHandler,
};
