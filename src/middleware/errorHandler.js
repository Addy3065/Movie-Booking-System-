const DB_ERRORS = {
  ER_DATA_TOO_LONG: [400, "A value is too long"],
  ER_WARN_DATA_OUT_OF_RANGE: [400, "A numeric value is out of range"],
  ER_TRUNCATED_WRONG_VALUE: [400, "Invalid date or time value"],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, "Invalid input value"],
  ER_ROW_IS_REFERENCED_2: [409, "Record is referenced by other records"],
  ER_NO_REFERENCED_ROW_2: [409, "Record is referenced by other records"],
  ER_DUP_ENTRY: [409, "Record already exists"],
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

  const dbError = typeof err.code === "string" ? DB_ERRORS[err.code] : undefined;
  if (dbError) {
    return res.status(dbError[0]).json({ error: dbError[1] });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

module.exports = { notFound, errorHandler };
