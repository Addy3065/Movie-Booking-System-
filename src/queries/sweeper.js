async function expirePendingBookings(client) {
  const [stale] = await client.query(
    `SELECT b.booking_id
     FROM bookings b
     WHERE b.status = 'pending'
       AND EXISTS (
         SELECT 1
         FROM booking_seats bs
         JOIN show_seats ss ON ss.show_seat_id = bs.show_seat_id
         WHERE bs.booking_id = b.booking_id
           AND (ss.locked_until IS NULL OR ss.locked_until <= NOW(3))
       )
     ORDER BY b.booking_id
     FOR UPDATE SKIP LOCKED`,
  );
  const cancelledIds = stale.map((r) => r.booking_id);

  if (cancelledIds.length > 0) {
    await client.query(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE booking_id IN (?)
         AND status = 'pending'`,
      [cancelledIds],
    );

    const [seats] = await client.query(
      `SELECT ss.show_seat_id
       FROM show_seats ss
       WHERE ss.show_seat_id IN (
         SELECT bs.show_seat_id
         FROM booking_seats bs
         WHERE bs.booking_id IN (?)
       )
       ORDER BY ss.show_seat_id
       FOR UPDATE`,
      [cancelledIds],
    );
    if (seats.length > 0) {
      await client.query(
        `UPDATE show_seats
         SET status = 'available', locked_by = NULL, locked_until = NULL
         WHERE show_seat_id IN (?)`,
        [seats.map((r) => r.show_seat_id)],
      );
    }

    await client.query("DELETE FROM booking_seats WHERE booking_id IN (?)", [
      cancelledIds,
    ]);
  }

  const [loneSeats] = await client.query(
    `SELECT ss.show_seat_id
     FROM show_seats ss
     WHERE ss.status = 'locked'
       AND ss.locked_until IS NOT NULL
       AND ss.locked_until <= NOW(3)
       AND NOT EXISTS (
         SELECT 1 FROM booking_seats bs
         WHERE bs.show_seat_id = ss.show_seat_id
       )
     ORDER BY ss.show_seat_id
     FOR UPDATE SKIP LOCKED`,
  );
  if (loneSeats.length > 0) {
    await client.query(
      `UPDATE show_seats
       SET status = 'available', locked_by = NULL, locked_until = NULL
       WHERE show_seat_id IN (?)`,
      [loneSeats.map((r) => r.show_seat_id)],
    );
  }

  return {
    bookingsCancelled: cancelledIds.length,
    seatsFreed: loneSeats.length,
  };
}

module.exports = { expirePendingBookings };
