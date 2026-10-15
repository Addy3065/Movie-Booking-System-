const mysql = require("mysql2/promise");
require("dotenv").config(); // to acces data from .env file without actually showing our sensitive INFO

const pool = mysql.createPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  connectionLimit: 10, // pool size
});

// Quick sanity check on startup — confirms credentials + DB are reachable
// A promise server.js can await before starting
async function checkConnection() {
  const [rows] = await pool.query("SELECT NOW() AS now");
  console.log("✅ Database connected at", rows[0].now);
}

module.exports = { pool, checkConnection };
