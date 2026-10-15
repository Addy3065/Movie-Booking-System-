const { pool } = require("../../db/db");

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    "SELECT user_id, name, email, password_hash, role FROM users WHERE lower(email) = ?",
    [email],
  );
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES (?, ?, ?)`,
    [name, email, passwordHash],
  );
  const [rows] = await pool.query(
    "SELECT user_id, name, email, role FROM users WHERE user_id = ?",
    [result.insertId],
  );
  return rows[0];
}

module.exports = { findUserByEmail, createUser };
