const { withTransaction } = require("../utils/transaction");
const { createShow, deleteShow } = require("../queries/adminShows");

function sendError(res, err) {
  if (err.status) {
    const body = { error: err.message };
    if (err.unavailable) {
      if (err.status === 409 && err.message.startsWith("Screen")) {
        body.conflictingShows = err.unavailable;
      } else {
        body.unavailable = err.unavailable;
      }
    }
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
  if (err.code === "23503") {
    return res
      .status(409)
      .json({ error: "Show is referenced by other records" });
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

async function deleteShowHandler(req, res) {
  try {
    const result = await withTransaction((client) =>
      deleteShow(client, req.params.id),
    );
    return res.status(200).json({
      message: "Show deleted",
      showId: result.showId,
      seatsRemoved: result.seatsRemoved,
    });
  } catch (err) {
    return sendError(res, err);
  }
}

module.exports = { createShowHandler, deleteShowHandler };
