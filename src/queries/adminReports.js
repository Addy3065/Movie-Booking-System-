const { pool } = require("../../db/db");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt, parseNonNegativeInt } = require("../utils/validate");

const STATUSES = ["pending", "confirmed", "cancelled"];
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value, name) {
  if (typeof value !== "string" || !DATE_FORMAT.test(value)) {
    throw httpError(400, `${name} must look like 2027-01-15`);
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw httpError(400, `${name} is not a valid date`);
  }
  return value;
}

// GROUP_CONCAT gives "A1,A2" (or NULL); the API returns seats as an array
function withSeatArray(row) {
  return { ...row, seats: row.seats ? row.seats.split(",") : [] };
}

async function listBookings(query) {
  const conditions = [];
  const params = [];

  if (query.status !== undefined) {
    if (!STATUSES.includes(query.status)) {
      throw httpError(400, "status must be pending, confirmed or cancelled");
    }
    params.push(query.status);
    conditions.push("b.status = ?");
  }
  if (query.user_id !== undefined) {
    params.push(parsePositiveInt(query.user_id, "user_id"));
    conditions.push("b.user_id = ?");
  }
  if (query.show_id !== undefined) {
    params.push(parsePositiveInt(query.show_id, "show_id"));
    conditions.push("sh.show_id = ?");
  }
  const from =
    query.from === undefined ? undefined : parseDate(query.from, "from");
  const to = query.to === undefined ? undefined : parseDate(query.to, "to");
  if (from !== undefined && to !== undefined && from > to) {
    throw httpError(400, "from must not be after to");
  }
  if (from !== undefined) {
    params.push(from);
    conditions.push("b.booking_time >= CAST(? AS DATE)");
  }
  if (to !== undefined) {
    params.push(to);
    conditions.push("b.booking_time < CAST(? AS DATE) + INTERVAL 1 DAY");
  }

  const limit =
    query.limit === undefined ? 50 : parsePositiveInt(query.limit, "limit");
  if (limit > 200) {
    throw httpError(400, "limit cannot exceed 200");
  }
  const offset =
    query.offset === undefined
      ? 0
      : parseNonNegativeInt(query.offset, "offset");
  params.push(limit, offset);

  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const [rows] = await pool.query(
    `SELECT b.booking_id,
            b.booking_time,
            b.status,
            b.total_amount,
            u.user_id,
            u.name AS user_name,
            u.email,
            sh.show_id,
            sh.show_time,
            m.title AS movie_title,
            c.name AS cinema_name,
            sc.screen_name,
            GROUP_CONCAT(se.seat_number ORDER BY se.seat_number) AS seats,
            (
              SELECT p.status
              FROM payments p
              WHERE p.booking_id = b.booking_id
              ORDER BY p.payment_id DESC
              LIMIT 1
            ) AS payment_status
     FROM bookings b
     JOIN users u ON u.user_id = b.user_id
     LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
     LEFT JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
     LEFT JOIN seats se ON se.seat_id = ss.seat_id
     LEFT JOIN shows sh ON sh.show_id = ss.show_id
     LEFT JOIN movies m ON m.movie_id = sh.movie_id
     LEFT JOIN screens sc ON sc.screen_id = sh.screen_id
     LEFT JOIN cinemas c ON c.cinema_id = sc.cinema_id
     ${where}
     GROUP BY b.booking_id, u.user_id, sh.show_id, m.movie_id,
              c.cinema_id, sc.screen_id
     ORDER BY b.booking_time DESC, b.booking_id DESC
     LIMIT ? OFFSET ?`,
    params,
  );

  return rows.map(withSeatArray);
}

async function revenueByMovie() {
  const [rows] = await pool.query(
    `WITH booking_show AS (
       SELECT DISTINCT bs.booking_id, ss.show_id
       FROM booking_seats bs
       JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
     )
     SELECT m.movie_id,
            m.title,
            COUNT(DISTINCT p.booking_id) AS paid_bookings,
            COALESCE(SUM(p.amount), 0) AS revenue
     FROM movies m
     LEFT JOIN shows sh ON sh.movie_id = m.movie_id
     LEFT JOIN booking_show bsh ON bsh.show_id = sh.show_id
     LEFT JOIN payments p
            ON p.booking_id = bsh.booking_id AND p.status = 'success'
     GROUP BY m.movie_id, m.title
     ORDER BY revenue DESC, m.title`,
  );
  return rows;
}

async function showOccupancy(query) {
  const params = [];
  let where = "";

  if (query.movie_id !== undefined) {
    params.push(parsePositiveInt(query.movie_id, "movie_id"));
    where = "WHERE sh.movie_id = ?";
  }

  const [rows] = await pool.query(
    `SELECT sh.show_id,
            m.title AS movie_title,
            c.name AS cinema_name,
            sc.screen_name,
            sh.show_time,
            COUNT(ss.show_seat_id) AS total_seats,
            COUNT(CASE WHEN ss.status = 'booked' THEN 1 END) AS booked_seats,
            COUNT(
              CASE WHEN ss.status = 'locked' AND ss.locked_until > NOW(3) THEN 1 END
            ) AS held_seats,
            ROUND(
              100.0 * COUNT(CASE WHEN ss.status = 'booked' THEN 1 END)
              / NULLIF(COUNT(ss.show_seat_id), 0),
              1
            ) AS occupancy_pct,
            COALESCE(
              SUM(CASE WHEN ss.status = 'booked' THEN bs.price END),
              0
            ) AS seat_revenue
     FROM shows sh
     JOIN movies m ON m.movie_id = sh.movie_id
     JOIN screens sc ON sc.screen_id = sh.screen_id
     JOIN cinemas c ON c.cinema_id = sc.cinema_id
     LEFT JOIN show_seats ss ON ss.show_id = sh.show_id
     LEFT JOIN booking_seats bs ON bs.show_seat_id = ss.show_seat_id
     ${where}
     GROUP BY sh.show_id, m.movie_id, c.cinema_id, sc.screen_id
     ORDER BY sh.show_time, sh.show_id`,
    params,
  );
  return rows;
}

module.exports = { listBookings, revenueByMovie, showOccupancy };
