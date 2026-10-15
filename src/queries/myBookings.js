const { pool } = require("../../db/db");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt, parseNonNegativeInt } = require("../utils/validate");

// GROUP_CONCAT gives "A1,A2" (or NULL); the API returns seats as an array
function withSeatArray(row) {
  return { ...row, seats: row.seats ? row.seats.split(",") : [] };
}

async function listMyBookings(userId, query) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) {
    throw httpError(401, "Invalid user");
  }

  const limit =
    query.limit === undefined ? 50 : parsePositiveInt(query.limit, "limit");
  if (limit > 100) {
    throw httpError(400, "limit cannot exceed 100");
  }
  const offset =
    query.offset === undefined
      ? 0
      : parseNonNegativeInt(query.offset, "offset");

  const [rows] = await pool.query(
    `SELECT b.booking_id,
            b.booking_time,
            b.status,
            b.total_amount,
            sh.show_id,
            sh.show_time,
            m.title AS movie_title,
            c.name AS cinema_name,
            c.city,
            sc.screen_name,
            GROUP_CONCAT(se.seat_number ORDER BY se.seat_number) AS seats,
            MIN(CASE WHEN b.status = 'pending' THEN ss.locked_until END) AS pay_by,
            (
              SELECT p.status
              FROM payments p
              WHERE p.booking_id = b.booking_id
              ORDER BY p.payment_id DESC
              LIMIT 1
            ) AS payment_status
     FROM bookings b
     LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
     LEFT JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
     LEFT JOIN seats se ON se.seat_id = ss.seat_id
     LEFT JOIN shows sh ON sh.show_id = ss.show_id
     LEFT JOIN movies m ON m.movie_id = sh.movie_id
     LEFT JOIN screens sc ON sc.screen_id = sh.screen_id
     LEFT JOIN cinemas c ON c.cinema_id = sc.cinema_id
     WHERE b.user_id = ?
     GROUP BY b.booking_id, sh.show_id, m.movie_id,
              c.cinema_id, sc.screen_id
     ORDER BY b.booking_time DESC, b.booking_id DESC
     LIMIT ? OFFSET ?`,
    [uid, limit, offset],
  );

  return rows.map(withSeatArray);
}

module.exports = { listMyBookings };
