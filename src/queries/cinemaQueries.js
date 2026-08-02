const pool = require("../../db/db");

const getAllCinemas = async () => {
  const result = await pool.query("SELECT * FROM cinemas ORDER BY city, name");
  return result.rows;
};

const getCinemaById = async (cinemaId) => {
  const result = await pool.query(
    "SELECT * FROM cinemas WHERE cinema_id = $1",
    [cinemaId],
  );
  return result.rows[0];
};

module.exports = { getAllCinemas, getCinemaById };
