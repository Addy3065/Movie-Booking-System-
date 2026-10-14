const { getAllMovies, getMovieById } = require("../queries/movieQueries");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt } = require("../utils/validate");

const listMovies = async (req, res) => {
  const movies = await getAllMovies();
  res.json(movies);
};

const showMovie = async (req, res) => {
  const id = parsePositiveInt(req.params.id, "id");
  const movie = await getMovieById(id);
  if (!movie) {
    throw httpError(404, "Movie not found");
  }
  res.json(movie);
};

module.exports = { listMovies, showMovie };
