const express = require("express");
const { requireAuth } = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/ping", (req, res) => {
  res.json({ message: "admin ok", user: req.user });
});

module.exports = router;
