const pool = require("../../db/db");

const getAllShows = async (movieId, city) => {
  let query = `
    SELECT
      s.show_id,
      s.show_time,
      s.base_price,
      m.movie_id,
      m.title AS movie_title,
      m.duration_min,
      sc.screen_id,
      sc.screen_name,
      c.cinema_id,
      c.name AS cinema_name,
      c.city
    FROM shows s
    JOIN movies m ON s.movie_id = m.movie_id
    JOIN screens sc ON s.screen_id = sc.screen_id
    JOIN cinemas c ON sc.cinema_id = c.cinema_id
  `;

  const conditions = [];
  const params = [];

  if (movieId) {
    params.push(movieId);
    conditions.push(`s.movie_id = $${params.length}`);
  }

  if (city) {
    params.push(city);
    conditions.push(`c.city ILIKE $${params.length}`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY s.show_time";

  const result = await pool.query(query, params);
  return result.rows;
};

const getShowById = async (showId) => {
  const result = await pool.query(
    `
    SELECT
      s.show_id,
      s.show_time,
      s.base_price,
      m.movie_id,
      m.title AS movie_title,
      m.duration_min,
      sc.screen_id,
      sc.screen_name,
      c.cinema_id,
      c.name AS cinema_name,
      c.city
    FROM shows s
    JOIN movies m ON s.movie_id = m.movie_id
    JOIN screens sc ON s.screen_id = sc.screen_id
    JOIN cinemas c ON sc.cinema_id = c.cinema_id
    WHERE s.show_id = $1
    `,
    [showId],
  );
  return result.rows[0];
};

module.exports = { getAllShows, getShowById };
