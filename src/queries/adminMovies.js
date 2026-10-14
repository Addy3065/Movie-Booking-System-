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
  const { rows } = await pool.query(
    `INSERT INTO movies (title, duration_min, language)
     VALUES ($1, $2, $3)
     RETURNING movie_id, title, duration_min, language`,
    [m.title, m.duration_min, m.language],
  );
  return rows[0];
}

async function updateMovie(id, body) {
  const movieId = parsePositiveInt(id, "movie id");
  const m = parseMovie(body);
  const { rows } = await pool.query(
    `UPDATE movies
     SET title = $2, duration_min = $3, language = $4
     WHERE movie_id = $1
     RETURNING movie_id, title, duration_min, language`,
    [movieId, m.title, m.duration_min, m.language],
  );
  if (rows.length === 0) {
    throw httpError(404, "Movie not found");
  }
  return rows[0];
}

async function deleteMovie(id) {
  const movieId = parsePositiveInt(id, "movie id");
  const { rows } = await pool.query(
    `DELETE FROM movies
     WHERE movie_id = $1
       AND NOT EXISTS (SELECT 1 FROM shows WHERE shows.movie_id = $1)
     RETURNING movie_id`,
    [movieId],
  );
  if (rows.length > 0) {
    return rows[0].movie_id;
  }

  const { rows: exists } = await pool.query(
    "SELECT 1 FROM movies WHERE movie_id = $1",
    [movieId],
  );
  if (exists.length === 0) {
    throw httpError(404, "Movie not found");
  }
  throw httpError(409, "Movie has shows; remove or cancel them first");
}

module.exports = { createMovie, updateMovie, deleteMovie };
