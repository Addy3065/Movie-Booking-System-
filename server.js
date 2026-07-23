const express = require("express");
require("dotenv").config();
const pool = require("./db/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Temporary health-check route to confirm server + DB are alive
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      server: "running",
      db_time: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Database not reachable" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
