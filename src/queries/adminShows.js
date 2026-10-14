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

  const { rows: screenRows } = await client.query(
    "SELECT screen_id FROM screens WHERE screen_id = $1 FOR UPDATE",
    [sid],
  );
  if (screenRows.length === 0) {
    throw httpError(404, "Screen not found");
  }

  const { rows: movieRows } = await client.query(
    "SELECT duration_min FROM movies WHERE movie_id = $1 FOR SHARE",
    [mid],
  );
  if (movieRows.length === 0) {
    throw httpError(404, "Movie not found");
  }
  const duration = movieRows[0].duration_min;

  const { rows: future } = await client.query(
    "SELECT $1::timestamp > NOW()::timestamp AS is_future",
    [showTime],
  );
  if (!future[0].is_future) {
    throw httpError(400, "show_time must be in the future");
  }

  const { rows: clash } = await client.query(
    `SELECT s.show_id
     FROM shows s
     JOIN movies m ON m.movie_id = s.movie_id
     WHERE s.screen_id = $1
       AND s.show_time < $2::timestamp + make_interval(mins => $3::int)
       AND s.show_time + make_interval(mins => m.duration_min) > $2::timestamp
     LIMIT 1`,
    [sid, showTime, duration],
  );
  if (clash.length > 0) {
    throw httpError(409, "Screen already has a show overlapping this time", {
      conflictingShows: [clash[0].show_id],
    });
  }

  const { rows: showRows } = await client.query(
    `INSERT INTO shows (movie_id, screen_id, show_time, base_price)
     VALUES ($1, $2, $3, $4)
     RETURNING show_id, movie_id, screen_id, show_time, base_price`,
    [mid, sid, showTime, price],
  );
  const show = showRows[0];

  const { rows: seatRows } = await client.query(
    `INSERT INTO show_seats (show_id, seat_id)
     SELECT $1, seat_id FROM seats WHERE screen_id = $2
     RETURNING show_seat_id`,
    [show.show_id, sid],
  );
  if (seatRows.length === 0) {
    throw httpError(409, "Screen has no seats configured");
  }

  return { show, seatsCreated: seatRows.length };
}

async function deleteShow(client, id) {
  const showId = parsePositiveInt(id, "show id");

  const { rows: showRows } = await client.query(
    "SELECT show_id FROM shows WHERE show_id = $1",
    [showId],
  );
  if (showRows.length === 0) {
    throw httpError(404, "Show not found");
  }

  const { rows: seats } = await client.query(
    `SELECT ss.show_seat_id,
            ss.status,
            (ss.locked_until IS NOT NULL AND ss.locked_until > NOW()) AS lock_active,
            EXISTS (
              SELECT 1 FROM booking_seats bs
              WHERE bs.show_seat_id = ss.show_seat_id
            ) AS has_booking
     FROM show_seats ss
     WHERE ss.show_id = $1
     ORDER BY ss.show_seat_id
     FOR UPDATE OF ss`,
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

  const { rows } = await client.query(
    "DELETE FROM shows WHERE show_id = $1 RETURNING show_id",
    [showId],
  );
  if (rows.length === 0) {
    throw httpError(404, "Show not found");
  }

  return { showId: rows[0].show_id, seatsRemoved: seats.length };
}

module.exports = { createShow, deleteShow };
