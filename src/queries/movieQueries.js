const { pool } = require("../../db/db");

const getAllMovies = async () => {
  const [rows] = await pool.query("SELECT * FROM movies ORDER BY title");
  return rows;
};

const getMovieById = async (movieId) => {
  const [rows] = await pool.query("SELECT * FROM movies WHERE movie_id = ?", [
    movieId,
  ]);
  return rows[0]; // undefined if not found
};

module.exports = { getAllMovies, getMovieById };
