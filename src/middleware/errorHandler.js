const PG_ERRORS = {
  22001: [400, "A value is too long"],
  22003: [400, "A numeric value is out of range"],
  22007: [400, "Invalid date or time value"],
  22008: [400, "Invalid date or time value"],
  "22P02": [400, "Invalid input value"],
  23503: [409, "Record is referenced by other records"],
  23505: [409, "Record already exists"],
};

const EXTRA_FIELDS = ["unavailable", "conflictingShows"];

function notFound(req, res) {
  res.status(404).json({ error: "Route not found" });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    const body = { error: err.message };
    for (const field of EXTRA_FIELDS) {
      if (err[field]) body[field] = err[field];
    }
    return res.status(err.status).json(body);
  }

  const pg = typeof err.code === "string" ? PG_ERRORS[err.code] : undefined;
  if (pg) {
    return res.status(pg[0]).json({ error: pg[1] });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

module.exports = { notFound, errorHandler };
