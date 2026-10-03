const { withTransaction } = require("../utils/transaction");
const { createShow } = require("../queries/adminShows");

function sendError(res, err) {
  if (err.status) {
    const body = { error: err.message };
    if (err.unavailable) body.conflictingShows = err.unavailable;
    return res.status(err.status).json(body);
  }
  if (err.code === "22007" || err.code === "22008") {
    return res.status(400).json({ error: "show_time is not a valid date" });
  }
  if (err.code === "23505") {
    return res
      .status(409)
      .json({ error: "Screen already has a show at this time" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

async function createShowHandler(req, res) {
  try {
    const result = await withTransaction((client) =>
      createShow(client, req.body || {}),
    );
    return res.status(201).json({
      message: "Show created",
      show: result.show,
      seatsCreated: result.seatsCreated,
    });
  } catch (err) {
    return sendError(res, err);
  }
}

module.exports = { createShowHandler };
