const { pool } = require("../../db/db");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt, parseString } = require("../utils/validate");

function parseMovie({ title, duration_min, language }) {
  return {
    title: parseString(title, "title", { max: 200 }),
    duration_min: parsePositiveInt(duration_min, "duration_min"),
    language: parseString(language, "language", { max: 50 }),
  };
}

async function createMovie(body) {
  const m = parseMovie(body);
  const [result] = await pool.query(
    `INSERT INTO movies (title, duration_min, language)
     VALUES (?, ?, ?)`,
    [m.title, m.duration_min, m.language],
  );
  const [rows] = await pool.query(
    "SELECT movie_id, title, duration_min, language FROM movies WHERE movie_id = ?",
    [result.insertId],
  );
  return rows[0];
}

async function updateMovie(id, body) {
  const movieId = parsePositiveInt(id, "movie id");
  const m = parseMovie(body);
  await pool.query(
    `UPDATE movies
     SET title = ?, duration_min = ?, language = ?
     WHERE movie_id = ?`,
    [m.title, m.duration_min, m.language, movieId],
  );
  const [rows] = await pool.query(
    "SELECT movie_id, title, duration_min, language FROM movies WHERE movie_id = ?",
    [movieId],
  );
  if (rows.length === 0) {
    throw httpError(404, "Movie not found");
  }
  return rows[0];
}

async function deleteMovie(id) {
  const movieId = parsePositiveInt(id, "movie id");
  const [result] = await pool.query(
    `DELETE FROM movies
     WHERE movie_id = ?
       AND NOT EXISTS (SELECT 1 FROM shows WHERE shows.movie_id = ?)`,
    [movieId, movieId],
  );
  if (result.affectedRows > 0) {
    return movieId;
  }

  const [exists] = await pool.query(
    "SELECT 1 FROM movies WHERE movie_id = ?",
    [movieId],
  );
  if (exists.length === 0) {
    throw httpError(404, "Movie not found");
  }
  throw httpError(409, "Movie has shows; remove or cancel them first");
}

module.exports = { createMovie, updateMovie, deleteMovie };
