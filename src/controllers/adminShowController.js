const { withTransaction } = require("../utils/transaction");
const { createShow, deleteShow } = require("../queries/adminShows");

async function createShowHandler(req, res) {
  const result = await withTransaction((client) =>
    createShow(client, req.body || {}),
  );
  return res.status(201).json({
    message: "Show created",
    show: result.show,
    seatsCreated: result.seatsCreated,
  });
}

async function deleteShowHandler(req, res) {
  const result = await withTransaction((client) =>
    deleteShow(client, req.params.id),
  );
  return res.status(200).json({
    message: "Show deleted",
    showId: result.showId,
    seatsRemoved: result.seatsRemoved,
  });
}

module.exports = { createShowHandler, deleteShowHandler };
