const {
  createMovie,
  updateMovie,
  deleteMovie,
} = require("../queries/adminMovies");

function sendError(res, err) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

async function createMovieHandler(req, res) {
  try {
    const movie = await createMovie(req.body || {});
    return res.status(201).json({ message: "Movie created", movie });
  } catch (err) {
    return sendError(res, err);
  }
}

async function updateMovieHandler(req, res) {
  try {
    const movie = await updateMovie(req.params.id, req.body || {});
    return res.status(200).json({ message: "Movie updated", movie });
  } catch (err) {
    return sendError(res, err);
  }
}

async function deleteMovieHandler(req, res) {
  try {
    const movieId = await deleteMovie(req.params.id);
    return res.status(200).json({ message: "Movie deleted", movieId });
  } catch (err) {
    return sendError(res, err);
  }
}

module.exports = {
  createMovieHandler,
  updateMovieHandler,
  deleteMovieHandler,
};
