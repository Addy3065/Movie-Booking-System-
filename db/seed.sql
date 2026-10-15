-- =========================================================
-- Movie Ticket Booking System - Seed Data
-- Run AFTER schema.sql
-- 10 cinemas (2 screens each), 10 movies, 5 upcoming showtimes
-- per movie (and per cinema), demo users incl. an admin, and
-- bookings covering every lifecycle state:
-- confirmed+paid, past show (history), pending+locked, cancelled+refunded.
-- Safe to re-run: resets all tables and AUTO_INCREMENT counters first,
-- so the explicit ids below are stable.
--
-- Demo logins:
--   admin  -> admin@example.com  / Admin@12345   (role 'admin')
--   users  -> aditya@example.com / password123
--             riya@example.com   / password123
--             karan@example.com  / password123
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE payments;
TRUNCATE TABLE booking_seats;
TRUNCATE TABLE bookings;
TRUNCATE TABLE show_seats;
TRUNCATE TABLE shows;
TRUNCATE TABLE seats;
TRUNCATE TABLE movies;
TRUNCATE TABLE users;
TRUNCATE TABLE seat_types;
TRUNCATE TABLE screens;
TRUNCATE TABLE cinemas;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------
-- 1. Cinemas (ids 1-10)
-- ---------------------------------------------------------
INSERT INTO cinemas (name, city) VALUES
('PVR Alpha One', 'Amritsar'),
('INOX Elante', 'Chandigarh'),
('PVR Director''s Cut', 'New Delhi'),
('Cinepolis Andheri', 'Mumbai'),
('INOX Garuda Mall', 'Bengaluru'),
('AMB Cinemas', 'Hyderabad'),
('PVR Grand Galada', 'Chennai'),
('INOX South City', 'Kolkata'),
('Cinepolis Westend', 'Pune'),
('Rajmandir Cinema', 'Jaipur');

-- ---------------------------------------------------------
-- 2. Screens: 2 per cinema -> cinema c has screens 2c-1 and 2c
-- ---------------------------------------------------------
INSERT INTO screens (cinema_id, screen_name, total_seats)
SELECT c.cinema_id, s.screen_name, 48
FROM cinemas c
CROSS JOIN (SELECT 1 AS n, 'Screen 1' AS screen_name UNION ALL SELECT 2, 'Screen 2') s
ORDER BY c.cinema_id, s.n;

-- ---------------------------------------------------------
-- 3. Seat types
-- ---------------------------------------------------------
INSERT INTO seat_types (type_name, price_multiplier) VALUES
('Regular', 1.00),
('Premium', 1.50),
('Recliner', 2.00);

-- ---------------------------------------------------------
-- 4. Seats: every screen gets the same 48-seat layout
--    rows A-C Regular, D-E Premium, F Recliner; seats 1-8 per row
-- ---------------------------------------------------------
INSERT INTO seats (screen_id, seat_number, seat_type_id)
SELECT s.screen_id, CONCAT(r.row_label, n.num), st.seat_type_id
FROM screens s
CROSS JOIN (
              SELECT 'A' AS row_label, 'Regular' AS type_name
    UNION ALL SELECT 'B', 'Regular'  UNION ALL SELECT 'C', 'Regular'
    UNION ALL SELECT 'D', 'Premium'  UNION ALL SELECT 'E', 'Premium'
    UNION ALL SELECT 'F', 'Recliner'
) AS r
CROSS JOIN (
              SELECT 1 AS num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
) AS n
JOIN seat_types st ON st.type_name = r.type_name
ORDER BY s.screen_id, r.row_label, n.num;

-- ---------------------------------------------------------
-- 5. Movies (ids 1-10)
-- Title, runtime and primary language as listed on OMDb
-- (https://www.omdbapi.com/?i=<imdb id>).
-- ---------------------------------------------------------
INSERT INTO movies (title, duration_min, language) VALUES
('Inception', 148, 'English'),        -- tt1375666
('Interstellar', 169, 'English'),     -- tt0816692
('The Dark Knight', 152, 'English'),  -- tt0468569
('Oppenheimer', 180, 'English'),      -- tt15398776
('Dune: Part Two', 166, 'English'),   -- tt15239678
('3 Idiots', 170, 'Hindi'),           -- tt1187043
('Dangal', 161, 'Hindi'),             -- tt5074352
('RRR', 187, 'Telugu'),               -- tt8178634
('Parasite', 132, 'Korean'),          -- tt6751668
('Spirited Away', 124, 'Japanese');   -- tt0245429

-- ---------------------------------------------------------
-- 6. Users (ids: aditya 1, riya 2, karan 3, admin 4)
-- hashes below are real bcrypt hashes (see demo logins at the top)
-- ---------------------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
('Aditya Sharma', 'aditya@example.com', '$2b$10$L5yzNcRzZ8zaX6jXw.6q4uXYZD1q2BVz13tKM.a37DsdVrkeLjlG.', 'user'),
('Riya Kapoor',   'riya@example.com',   '$2b$10$qRHOZbvhHFXYmKEEd2a3.O4MNv2CMFFo74F84SJqiWCQ7WTlQOZGq', 'user'),
('Karan Mehta',   'karan@example.com',  '$2b$10$YCOgU6/9kw6GG19PoqVwR.YOY4XSewnSEoISsVT9gX7VB.FluI35i', 'user'),
('Site Admin',    'admin@example.com',  '$2b$10$v/m2.xl0Lb2/bxkCXFkDg.R4vLoxYtchkASLoHXfFexhbhIztNi0u', 'admin');

-- ---------------------------------------------------------
-- 7. Shows (ids 1-50 upcoming, 51 past)
-- Movie m's k-th show (k = 0..4) plays at cinema ((m-1) + 2k) % 10 + 1,
-- so every movie has 5 showtimes and every cinema hosts 5 shows.
-- Spread over the next 3 days; slot times differ per k, so no
-- screen ever has two shows at once.
-- ---------------------------------------------------------
INSERT INTO shows (movie_id, screen_id, show_time, base_price) VALUES
(1, 1, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 250.00),
(1, 6, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 220.00),
(1, 9, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 240.00),
(1, 14, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 200.00),
(1, 17, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 230.00),
(2, 3, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 280.00),
(2, 8, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 300.00),
(2, 11, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 260.00),
(2, 16, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 320.00),
(2, 19, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 270.00),
(3, 5, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 220.00),
(3, 10, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 240.00),
(3, 13, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 200.00),
(3, 18, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 230.00),
(3, 1, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 250.00),
(4, 7, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 300.00),
(4, 12, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 260.00),
(4, 15, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 320.00),
(4, 20, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 270.00),
(4, 3, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 280.00),
(5, 9, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 240.00),
(5, 14, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 200.00),
(5, 17, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 230.00),
(5, 2, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 250.00),
(5, 5, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 220.00),
(6, 11, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 260.00),
(6, 16, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 320.00),
(6, 19, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 270.00),
(6, 4, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 280.00),
(6, 7, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 300.00),
(7, 13, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 200.00),
(7, 18, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 230.00),
(7, 1, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 250.00),
(7, 6, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 220.00),
(7, 9, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 240.00),
(8, 15, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 320.00),
(8, 20, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 270.00),
(8, 3, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 280.00),
(8, 8, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 300.00),
(8, 11, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 260.00),
(9, 17, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 230.00),
(9, 2, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 250.00),
(9, 5, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 220.00),
(9, 10, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 240.00),
(9, 13, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 200.00),
(10, 19, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '10:30:00'), 270.00),
(10, 4, TIMESTAMP(CURRENT_DATE + INTERVAL 1 DAY, '14:00:00'), 280.00),
(10, 7, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '17:30:00'), 300.00),
(10, 12, TIMESTAMP(CURRENT_DATE + INTERVAL 2 DAY, '21:00:00'), 260.00),
(10, 15, TIMESTAMP(CURRENT_DATE + INTERVAL 3 DAY, '19:00:00'), 320.00),
-- 51: past show, used below for booking history
(1, 2, TIMESTAMP(CURRENT_DATE - INTERVAL 1 DAY, '19:00:00'), 250.00);

-- ---------------------------------------------------------
-- 8. show_seats: one row per physical seat per show, all 'available'
-- ---------------------------------------------------------
INSERT INTO show_seats (show_id, seat_id, status, locked_until)
SELECT sh.show_id, se.seat_id, 'available', NULL
FROM shows sh
JOIN seats se ON se.screen_id = sh.screen_id;

-- ---------------------------------------------------------
-- 9. Demo bookings
--   A. Confirmed + paid            (Aditya, Inception show 1, A1 + A2)
--   B. Confirmed + paid, past show (Karan, show 51, D1 + D2)
--   C. Pending + seat locked       (Riya, Interstellar show 6, F1)
--   D. Cancelled + refunded        (Aditya, The Dark Knight show 11, A1)
-- Seat prices = show base_price * seat type multiplier.
-- ---------------------------------------------------------

-- helper view of seat prices for the demo bookings
CREATE TEMPORARY TABLE demo_seats AS
SELECT b.booking, ss.show_seat_id, sh.base_price * st.price_multiplier AS price
FROM (
              SELECT 'A' AS booking, 1 AS show_id, 'A1' AS seat_number
    UNION ALL SELECT 'A', 1, 'A2'
    UNION ALL SELECT 'B', 51, 'D1'
    UNION ALL SELECT 'B', 51, 'D2'
    UNION ALL SELECT 'C', 6, 'F1'
    UNION ALL SELECT 'D', 11, 'A1'
) b
JOIN shows sh ON sh.show_id = b.show_id
JOIN show_seats ss ON ss.show_id = sh.show_id
JOIN seats se ON se.seat_id = ss.seat_id AND se.seat_number = b.seat_number
JOIN seat_types st ON st.seat_type_id = se.seat_type_id;

-- booking ids: A 1, B 2, C 3, D 4
INSERT INTO bookings (user_id, status, total_amount)
SELECT 1, 'confirmed', SUM(price) FROM demo_seats WHERE booking = 'A';
INSERT INTO bookings (user_id, status, total_amount)
SELECT 3, 'confirmed', SUM(price) FROM demo_seats WHERE booking = 'B';
INSERT INTO bookings (user_id, status, total_amount)
SELECT 2, 'pending', SUM(price) FROM demo_seats WHERE booking = 'C';
INSERT INTO bookings (user_id, status, total_amount)
SELECT 1, 'cancelled', SUM(price) FROM demo_seats WHERE booking = 'D';

INSERT INTO booking_seats (booking_id, show_seat_id, price)
SELECT CASE booking WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 4 END,
       show_seat_id, price
FROM demo_seats;

-- A and B hold their seats; C's seat is locked for checkout; D's seat stays available
UPDATE show_seats ss
JOIN demo_seats d ON d.show_seat_id = ss.show_seat_id AND d.booking IN ('A', 'B')
SET ss.status = 'booked';

UPDATE show_seats ss
JOIN demo_seats d ON d.show_seat_id = ss.show_seat_id AND d.booking = 'C'
SET ss.status = 'locked', ss.locked_until = NOW(3) + INTERVAL 10 MINUTE;

INSERT INTO payments (booking_id, amount, status)
SELECT booking_id, total_amount,
       CASE status WHEN 'confirmed' THEN 'success'
                   WHEN 'pending' THEN 'pending'
                   ELSE 'refunded' END
FROM bookings
ORDER BY booking_id;

DROP TEMPORARY TABLE demo_seats;

-- ---------------------------------------------------------
-- 10. Sanity check: row counts per table
-- ---------------------------------------------------------
SELECT 'cinemas' AS table_name, COUNT(*) FROM cinemas
UNION ALL SELECT 'screens', COUNT(*) FROM screens
UNION ALL SELECT 'seat_types', COUNT(*) FROM seat_types
UNION ALL SELECT 'seats', COUNT(*) FROM seats
UNION ALL SELECT 'movies', COUNT(*) FROM movies
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'shows', COUNT(*) FROM shows
UNION ALL SELECT 'show_seats', COUNT(*) FROM show_seats
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'booking_seats', COUNT(*) FROM booking_seats
UNION ALL SELECT 'payments', COUNT(*) FROM payments;

-- ---------------------------------------------------------
-- Optional: uncomment to SEE the double-booking guard fire.
-- Tries to add Aditya's already-booked seat A1 (Booking A) to
-- Booking B -> violates UNIQUE(show_seat_id) on booking_seats.
-- ---------------------------------------------------------
-- INSERT INTO booking_seats (booking_id, show_seat_id, price)
-- SELECT 2, ss.show_seat_id, 250.00
-- FROM show_seats ss
-- JOIN seats se ON se.seat_id = ss.seat_id AND se.seat_number = 'A1'
-- WHERE ss.show_id = 1;
