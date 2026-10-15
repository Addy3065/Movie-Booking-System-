const { pool } = require("../../db/db");

async function withTransaction(callback) {
  const client = await pool.getConnection();
  let broken = false;
  try {
    // match Postgres' default so locking reads always see the latest committed rows
    await client.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    await client.beginTransaction();
    const result = await callback(client);
    await client.commit();
    return result;
  } catch (err) {
    try {
      await client.rollback();
    } catch (rollbackErr) {
      broken = true; // connection if broken destroy it on release
      console.error("ROLLBACK failed:", rollbackErr);
    }
    throw err;
  } finally {
    if (broken) {
      client.destroy();
    } else {
      client.release();
    }
  }
}

module.exports = { withTransaction };
