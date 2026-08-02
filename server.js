const express = require("express");
require("dotenv").config();
const { pool, checkConnection } = require("./db/db");

const movieRoutes = require("./src/routes/movieRoutes");
const cinemaRoutes = require("./src/routes/cinemaRoutes");
const showRoutes = require("./src/routes/showRoutes");
const seatMapRoutes = require("./src/routes/seatMapRoutes");

const authRoutes = require("./src/routes/auth");

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

app.use("/api/movies", movieRoutes);
app.use("/api/cinemas", cinemaRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/seatmap", seatMapRoutes);
app.use("/api/auth", authRoutes);

async function start() {
  try {
    await checkConnection(); // blocks here until DB confirms — or throws
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(-1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start();
