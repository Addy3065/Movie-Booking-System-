const { pool } = require("../../db/db");

const getAllCinemas = async () => {
  const [rows] = await pool.query("SELECT * FROM cinemas ORDER BY city, name");
  return rows;
};

const getCinemaById = async (cinemaId) => {
  const [rows] = await pool.query(
    "SELECT * FROM cinemas WHERE cinema_id = ?",
    [cinemaId],
  );
  return rows[0];
};

module.exports = { getAllCinemas, getCinemaById };
