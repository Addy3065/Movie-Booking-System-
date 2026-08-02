const { Pool } = require("pg");
require("dotenv").config(); // to acces data from .env file without actually showing our sensitive INFO

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Fail fast if the pool itself errors (idle client crash, etc.)
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Quick sanity check on startup — confirms credentials + DB are reachable
// A promise server.js can await before starting
async function checkConnection() {
  const res = await pool.query("SELECT NOW()");
  console.log("✅ Database connected at", res.rows[0].now);
}

module.exports = { pool, checkConnection };
