const { pool } = require("../../db/db");

async function withTransaction(callback) {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      broken = true; // connection if broken destroy it on release
      console.error("ROLLBACK failed:", rollbackErr);
    }
    throw err;
  } finally {
    client.release(broken);
  }
}

module.exports = { withTransaction };
