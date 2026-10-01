const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { payHandler } = require("../controllers/paymentController");

const router = express.Router();

router.post("/pay", requireAuth, payHandler);

module.exports = router;
