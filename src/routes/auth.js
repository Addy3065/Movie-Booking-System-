const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimit");

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, getMe);

module.exports = router;
