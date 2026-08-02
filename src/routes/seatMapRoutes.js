const express = require("express");
const router = express.Router();
const { getSeatMap } = require("../controllers/showSeatController");

router.get("/:showId", getSeatMap); // GET /api/seatmap/:showId

module.exports = router;
