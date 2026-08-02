const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
