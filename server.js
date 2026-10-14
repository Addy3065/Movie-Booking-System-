const express = require("express");
require("dotenv").config();
const { pool, checkConnection } = require("./db/db");
const { startExpirySweeper } = require("./src/utils/expirySweeper");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const movieRoutes = require("./src/routes/movieRoutes");
const cinemaRoutes = require("./src/routes/cinemaRoutes");
const showRoutes = require("./src/routes/showRoutes");
const seatMapRoutes = require("./src/routes/seatMapRoutes");
const adminRoutes = require("./src/routes/admin");

const authRoutes = require("./src/routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // parsing incoming http requestions with json payload

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
app.use("/api/bookings", require("./src/routes/bookings"));
app.use("/api/payments", require("./src/routes/payments"));
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET is not set");
    process.exit(-1);
  }
  try {
    await checkConnection(); // blocks here until DB confirms — or throws
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(-1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    startExpirySweeper();
  });
}

start();
