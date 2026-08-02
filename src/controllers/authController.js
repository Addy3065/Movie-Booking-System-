const bcrypt = require("bcrypt");
const { findUserByEmail, createUser } = require("../queries/users");
const { signToken } = require("../utils/jwt");

const SALT_ROUNDS = 10;

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "name, email, and password are required" });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ name, email, passwordHash });

  const token = signToken({ userId: user.user_id, email: user.email });
  res.status(201).json({ user, token });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ userId: user.user_id, email: user.email });
  res.json({
    user: { user_id: user.user_id, name: user.name, email: user.email },
    token,
  });
}
async function getMe(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, getMe };
