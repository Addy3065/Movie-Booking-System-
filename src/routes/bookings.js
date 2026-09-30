const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  lockSeatsHandler,
  confirmBookingHandler,
  releaseSeatsHandler,
} = require("../controllers/bookingController");

const router = express.Router();

router.post("/lock", requireAuth, lockSeatsHandler);
router.post("/confirm", requireAuth, confirmBookingHandler);
router.delete("/lock", requireAuth, releaseSeatsHandler);

module.exports = router;
