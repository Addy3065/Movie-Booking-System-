const { pool } = require("../../db/db");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt, parseNonNegativeInt } = require("../utils/validate");

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

  const { rows } = await pool.query(
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
            COALESCE(
              ARRAY_AGG(se.seat_number ORDER BY se.seat_number)
                FILTER (WHERE se.seat_number IS NOT NULL),
              '{}'
            ) AS seats,
            MIN(ss.locked_until) FILTER (WHERE b.status = 'pending') AS pay_by,
            p.status AS payment_status
     FROM bookings b
     LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
     LEFT JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
     LEFT JOIN seats se ON se.seat_id = ss.seat_id
     LEFT JOIN shows sh ON sh.show_id = ss.show_id
     LEFT JOIN movies m ON m.movie_id = sh.movie_id
     LEFT JOIN screens sc ON sc.screen_id = sh.screen_id
     LEFT JOIN cinemas c ON c.cinema_id = sc.cinema_id
     LEFT JOIN LATERAL (
       SELECT status
       FROM payments
       WHERE booking_id = b.booking_id
       ORDER BY payment_id DESC
       LIMIT 1
     ) p ON TRUE
     WHERE b.user_id = $1
     GROUP BY b.booking_id, sh.show_id, m.movie_id,
              c.cinema_id, sc.screen_id, p.status
     ORDER BY b.booking_time DESC, b.booking_id DESC
     LIMIT $2 OFFSET $3`,
    [uid, limit, offset],
  );

  return rows;
}

module.exports = { listMyBookings };
