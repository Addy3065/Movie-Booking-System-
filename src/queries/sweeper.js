async function expirePendingBookings(client) {
  const { rows: bookingRows } = await client.query(
    `WITH stale AS (
       SELECT b.booking_id
       FROM bookings b
       WHERE b.status = 'pending'
         AND EXISTS (
           SELECT 1
           FROM booking_seats bs
           JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
           WHERE bs.booking_id = b.booking_id
             AND (ss.locked_until IS NULL OR ss.locked_until <= NOW())
         )
       ORDER BY b.booking_id
       FOR UPDATE OF b SKIP LOCKED
     ),
     cancelled AS (
       UPDATE bookings
       SET status = 'cancelled'
       WHERE booking_id IN (SELECT booking_id FROM stale)
         AND status = 'pending'
       RETURNING booking_id
     ),
     freed AS (
       UPDATE show_seats
       SET status = 'available', locked_by = NULL, locked_until = NULL
       WHERE show_seat_id IN (
         SELECT ss.show_seat_id
         FROM show_seats ss
         WHERE ss.show_seat_id IN (
           SELECT bs.show_seat_id
           FROM booking_seats bs
           WHERE bs.booking_id IN (SELECT booking_id FROM cancelled)
         )
         ORDER BY ss.show_seat_id
         FOR UPDATE OF ss
       )
       RETURNING show_seat_id
     ),
     removed AS (
       DELETE FROM booking_seats
       WHERE booking_id IN (SELECT booking_id FROM cancelled)
       RETURNING booking_seat_id
     )
     SELECT (SELECT COUNT(*) FROM cancelled)::int AS cancelled`,
  );

  const { rows: seatRows } = await client.query(
    `UPDATE show_seats
     SET status = 'available', locked_by = NULL, locked_until = NULL
     WHERE show_seat_id IN (
       SELECT ss.show_seat_id
       FROM show_seats ss
       WHERE ss.status = 'locked'
         AND ss.locked_until IS NOT NULL
         AND ss.locked_until <= NOW()
         AND NOT EXISTS (
           SELECT 1 FROM booking_seats bs
           WHERE bs.show_seat_id = ss.show_seat_id
         )
       ORDER BY ss.show_seat_id
       FOR UPDATE OF ss SKIP LOCKED
     )
     RETURNING show_seat_id`,
  );

  return {
    bookingsCancelled: bookingRows[0].cancelled,
    seatsFreed: seatRows.length,
  };
}

module.exports = { expirePendingBookings };
