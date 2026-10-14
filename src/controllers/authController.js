const bcrypt = require("bcrypt");
const { findUserByEmail, createUser } = require("../queries/users");
const { signToken } = require("../utils/jwt");
const { httpError } = require("../utils/httpError");
const { parseString, parseEmail, parsePassword } = require("../utils/validate");

const SALT_ROUNDS = 10; // determines the computational time to calculate hash function         on server computation is increased to tackle brute-force attacks
const MIN_PASSWORD_LENGTH = 8; // for security
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

async function register(req, res) {
  const body = req.body || {};

  if (!body.name || !body.email || !body.password) {
    throw httpError(400, "name, email, and password are required");
  }

  const name = parseString(body.name, "name", { max: 100 });
  const email = parseEmail(body.email);
  const password = parsePassword(body.password, { min: MIN_PASSWORD_LENGTH });

  const existing = await findUserByEmail(email);
  if (existing) {
    throw httpError(409, "Email already registered");
  }

  // HASHING PASSWORD HERE
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // creating user here
  let user;
  try {
    user = await createUser({ name, email, passwordHash });
  } catch (err) {
    if (err.code === "23505") {
      // postgres error if unique constraint is violated for a column
      throw httpError(409, "Email already registered");
    }
    throw err;
  }

  // creating token here
  const token = signToken({
    userId: user.user_id,
    email: user.email,
    role: user.role,
  });
  res.status(201).json({
    user: { user_id: user.user_id, name: user.name, email: user.email },
    token,
  });
}

async function login(req, res) {
  const body = req.body || {};

  if (!body.email || !body.password) {
    throw httpError(400, "email and password are required");
  }

  const email = parseEmail(body.email);
  const password = parsePassword(body.password, { min: 1 });

  const user = await findUserByEmail(email);
  const match = await bcrypt.compare(
    password,
    user ? user.password_hash : DUMMY_HASH,
  );
  if (!user || !match) {
    throw httpError(401, "Invalid credentials");
  }

  const token = signToken({
    userId: user.user_id,
    email: user.email,
    role: user.role,
  });
  res.json({
    user: { user_id: user.user_id, name: user.name, email: user.email },
    token,
  });
}

async function getMe(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, getMe };
