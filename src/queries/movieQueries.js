const pool = require("../../db/db");

const getAllMovies = async () => {
  const result = await pool.query("SELECT * FROM movies ORDER BY title");
  return result.rows;
};

const getMovieById = async (movieId) => {
  const result = await pool.query("SELECT * FROM movies WHERE movie_id = $1", [
    movieId,
  ]);
  return result.rows[0]; // undefined if not found
};

module.exports = { getAllMovies, getMovieById };
