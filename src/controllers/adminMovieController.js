const {
  createMovie,
  updateMovie,
  deleteMovie,
} = require("../queries/adminMovies");

async function createMovieHandler(req, res) {
  const movie = await createMovie(req.body || {});
  return res.status(201).json({ message: "Movie created", movie });
}

async function updateMovieHandler(req, res) {
  const movie = await updateMovie(req.params.id, req.body || {});
  return res.status(200).json({ message: "Movie updated", movie });
}

async function deleteMovieHandler(req, res) {
  const movieId = await deleteMovie(req.params.id);
  return res.status(200).json({ message: "Movie deleted", movieId });
}

module.exports = {
  createMovieHandler,
  updateMovieHandler,
  deleteMovieHandler,
};
