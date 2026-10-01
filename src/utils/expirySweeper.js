const { withTransaction } = require("./transaction");
const { expirePendingBookings } = require("../queries/sweeper");

const SWEEP_INTERVAL_MS = Number(process.env.SWEEP_INTERVAL_MS) || 60 * 1000;

async function sweepOnce() {
  try {
    const result = await withTransaction((client) =>
      expirePendingBookings(client),
    );
    if (result.bookingsCancelled > 0 || result.seatsFreed > 0) {
      console.log(
        `Expiry sweeper: cancelled ${result.bookingsCancelled} booking(s), freed ${result.seatsFreed} lone seat(s)`,
      );
    }
  } catch (err) {
    console.error("Expiry sweeper failed:", err);
  }
}

function startExpirySweeper() {
  const timer = setInterval(sweepOnce, SWEEP_INTERVAL_MS);
  timer.unref();
  return timer;
}

module.exports = { startExpirySweeper };
