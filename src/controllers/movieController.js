const { getAllMovies, getMovieById } = require("../queries/movieQueries");

const listMovies = async (req, res) => {
  try {
    const movies = await getAllMovies();
    res.json(movies);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch movies" });
  }
};

const showMovie = async (req, res) => {
  try {
    const movie = await getMovieById(req.params.id);
    if (!movie) {
      return res
        .status(404)
        .json({ status: "error", message: "Movie not found" });
    }
    res.json(movie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Failed to fetch movie" });
  }
};

module.exports = { listMovies, showMovie };
