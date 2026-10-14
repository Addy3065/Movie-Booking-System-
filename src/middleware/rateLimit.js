const rateLimit = require("express-rate-limit");
const { httpError } = require("../utils/httpError");

const LOGIN_MAX = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10;
const REGISTER_MAX = Number(process.env.REGISTER_RATE_LIMIT_MAX) || 10;

function limiter({ windowMs, limit, skipSuccessfulRequests }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(httpError(429, "Too many attempts; please try again later")),
  });
}

const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: LOGIN_MAX,
  skipSuccessfulRequests: true,
});

const registerLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: REGISTER_MAX,
  skipSuccessfulRequests: false,
});

module.exports = { loginLimiter, registerLimiter };
