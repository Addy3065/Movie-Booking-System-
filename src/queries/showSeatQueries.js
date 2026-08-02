const pool = require("../../db/db");

const getSeatMapForShow = async (showId) => {
  const result = await pool.query(
    `
    SELECT
      ss.show_seat_id,
      ss.status,
      ss.locked_until,
      se.seat_id,
      se.seat_number,
      st.type_name,
      st.price_multiplier,
      sh.base_price,
      ROUND(sh.base_price * st.price_multiplier, 2) AS seat_price
    FROM show_seats ss
    JOIN seats se ON ss.seat_id = se.seat_id
    JOIN seat_types st ON se.seat_type_id = st.seat_type_id
    JOIN shows sh ON ss.show_id = sh.show_id
    WHERE ss.show_id = $1
    ORDER BY se.seat_number
    `,
    [showId],
  );
  return result.rows;
};

module.exports = { getSeatMapForShow };
