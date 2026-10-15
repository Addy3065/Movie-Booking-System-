const { httpError } = require("../utils/httpError");
const { parsePositiveInt, parsePrice } = require("../utils/validate");

const TIME_FORMAT = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;
const MAX_PRICE = 999999.99;

function parseShow({ movie_id, screen_id, show_time, base_price }) {
  const mid = parsePositiveInt(movie_id, "movie_id");
  const sid = parsePositiveInt(screen_id, "screen_id");

  if (typeof show_time !== "string" || !TIME_FORMAT.test(show_time.trim())) {
    throw httpError(400, "show_time must look like 2027-01-15T18:00:00");
  }
  const price = parsePrice(base_price, "base_price", { max: MAX_PRICE });

  return { mid, sid, showTime: show_time.trim(), price };
}

async function createShow(client, body) {
  const { mid, sid, showTime, price } = parseShow(body);

  const [screenRows] = await client.query(
    "SELECT screen_id FROM screens WHERE screen_id = ? FOR UPDATE",
    [sid],
  );
  if (screenRows.length === 0) {
    throw httpError(404, "Screen not found");
  }

  const [movieRows] = await client.query(
    "SELECT duration_min FROM movies WHERE movie_id = ? FOR SHARE",
    [mid],
  );
  if (movieRows.length === 0) {
    throw httpError(404, "Movie not found");
  }
  const duration = movieRows[0].duration_min;

  const [future] = await client.query(
    "SELECT CAST(? AS DATETIME) > NOW() AS is_future",
    [showTime],
  );
  if (!future[0].is_future) {
    throw httpError(400, "show_time must be in the future");
  }

  const [clash] = await client.query(
    `SELECT s.show_id
     FROM shows s
     JOIN movies m ON m.movie_id = s.movie_id
     WHERE s.screen_id = ?
       AND s.show_time < CAST(? AS DATETIME) + INTERVAL ? MINUTE
       AND s.show_time + INTERVAL m.duration_min MINUTE > CAST(? AS DATETIME)
     LIMIT 1`,
    [sid, showTime, duration, showTime],
  );
  if (clash.length > 0) {
    throw httpError(409, "Screen already has a show overlapping this time", {
      conflictingShows: [clash[0].show_id],
    });
  }

  const [inserted] = await client.query(
    `INSERT INTO shows (movie_id, screen_id, show_time, base_price)
     VALUES (?, ?, ?, ?)`,
    [mid, sid, showTime, price],
  );
  const [showRows] = await client.query(
    `SELECT show_id, movie_id, screen_id, show_time, base_price
     FROM shows WHERE show_id = ?`,
    [inserted.insertId],
  );
  const show = showRows[0];

  const [seatResult] = await client.query(
    `INSERT INTO show_seats (show_id, seat_id)
     SELECT ?, seat_id FROM seats WHERE screen_id = ?`,
    [show.show_id, sid],
  );
  if (seatResult.affectedRows === 0) {
    throw httpError(409, "Screen has no seats configured");
  }

  return { show, seatsCreated: seatResult.affectedRows };
}

async function deleteShow(client, id) {
  const showId = parsePositiveInt(id, "show id");

  const [showRows] = await client.query(
    "SELECT show_id FROM shows WHERE show_id = ?",
    [showId],
  );
  if (showRows.length === 0) {
    throw httpError(404, "Show not found");
  }

  const [seats] = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW(3)) AS lock_active,
            EXISTS (
              SELECT 1 FROM booking_seats bs
              WHERE bs.show_seat_id = ss.show_seat_id
            ) AS has_booking
     FROM show_seats ss
     WHERE ss.show_id = ?
     ORDER BY ss.show_seat_id
     FOR UPDATE`,
    [showId],
  );

  const blocked = seats
    .filter(
      (r) =>
        r.has_booking ||
        r.status === "booked" ||
        (r.status === "locked" && r.lock_active),
    )
    .map((r) => r.show_seat_id);

  if (blocked.length > 0) {
    throw httpError(
      409,
      "Show has bookings or seats currently held; it cannot be deleted",
      { unavailable: blocked },
    );
  }

  const [result] = await client.query("DELETE FROM shows WHERE show_id = ?", [
    showId,
  ]);
  if (result.affectedRows === 0) {
    throw httpError(404, "Show not found");
  }

  return { showId, seatsRemoved: seats.length };
}

module.exports = { createShow, deleteShow };
