const express = require("express");
const { requireAuth } = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const {
  createMovieHandler,
  updateMovieHandler,
  deleteMovieHandler,
} = require("../controllers/adminMovieController");
const {
  createShowHandler,
  deleteShowHandler,
} = require("../controllers/adminShowController");
const {
  listBookingsHandler,
  revenueHandler,
  showOccupancyHandler,
} = require("../controllers/adminReportController");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.post("/movies", createMovieHandler);
router.put("/movies/:id", updateMovieHandler);
router.delete("/movies/:id", deleteMovieHandler);

router.post("/shows", createShowHandler);
router.delete("/shows/:id", deleteShowHandler);

router.get("/bookings", listBookingsHandler);
router.get("/reports/revenue", revenueHandler);
router.get("/reports/shows", showOccupancyHandler);

module.exports = router;
