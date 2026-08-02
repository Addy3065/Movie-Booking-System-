const { pool } = require("../../db/db");

async function findUserByEmail(email) {
  const result = await pool.query(
    "SELECT user_id, name, email, password_hash FROM users WHERE email = $1",
    [email],
  );
  return result.rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING user_id, name, email`,
    [name, email, passwordHash],
  );
  return result.rows[0];
}

module.exports = { findUserByEmail, createUser };
