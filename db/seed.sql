-- =========================================================
-- Movie Ticket Booking System - Seed Data
-- Run AFTER schema.sql
-- Designed to demonstrate: cinemas/screens/seats hierarchy,
-- shows, per-show seat generation, and all 3 booking lifecycle
-- states -> confirmed+paid, pending+locked (in-progress checkout),
-- cancelled+refunded.
-- Safe to re-run: resets all tables and serial counters first.
-- =========================================================

TRUNCATE TABLE
    payments, booking_seats, bookings, show_seats, shows,
    seats, movies, users, seat_types, screens, cinemas
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------
-- 1. Cinemas
-- ---------------------------------------------------------
INSERT INTO cinemas (name, city) VALUES
('PVR Cinemas', 'Amritsar'),
('INOX Megaplex', 'Chandigarh');

-- ---------------------------------------------------------
-- 2. Screens (2 per cinema)
-- ---------------------------------------------------------
INSERT INTO screens (cinema_id, screen_name, total_seats)
SELECT cinema_id, 'Screen 1', 12 FROM cinemas WHERE name = 'PVR Cinemas'
UNION ALL
SELECT cinema_id, 'Screen 2', 12 FROM cinemas WHERE name = 'PVR Cinemas'
UNION ALL
SELECT cinema_id, 'Screen 1', 12 FROM cinemas WHERE name = 'INOX Megaplex'
UNION ALL
SELECT cinema_id, 'Screen 2', 12 FROM cinemas WHERE name = 'INOX Megaplex';

-- ---------------------------------------------------------
-- 3. Seat types
-- ---------------------------------------------------------
INSERT INTO seat_types (type_name, price_multiplier) VALUES
('Regular', 1.00),
('Premium', 1.50),
('Recliner', 2.00);

-- ---------------------------------------------------------
-- 4. Seats
-- Every screen gets the same 12-seat layout:
-- A1-A4 Regular, B1-B4 Premium, C1-C4 Recliner
-- Generated as a cross join so it scales to any number of screens.
-- ---------------------------------------------------------
INSERT INTO seats (screen_id, seat_number, seat_type_id)
SELECT s.screen_id, layout.seat_number, st.seat_type_id
FROM screens s
CROSS JOIN (VALUES
    ('A1','Regular'), ('A2','Regular'), ('A3','Regular'), ('A4','Regular'),
    ('B1','Premium'), ('B2','Premium'), ('B3','Premium'), ('B4','Premium'),
    ('C1','Recliner'),('C2','Recliner'),('C3','Recliner'),('C4','Recliner')
) AS layout(seat_number, type_name)
JOIN seat_types st ON st.type_name = layout.type_name;

-- ---------------------------------------------------------
-- 5. Movies
-- ---------------------------------------------------------
INSERT INTO movies (title, duration_min, language) VALUES
('Interstellar Odyssey', 148, 'English'),
('The Last Monsoon', 132, 'Hindi'),
('Silicon Dreams', 115, 'English'),
('Rangla Punjab', 140, 'Punjabi');

-- ---------------------------------------------------------
-- 6. Users
-- Demo login for all 3 users once auth (Phase 4) is built:
--   password = "password123"
-- (hashes below are real bcrypt hashes, not placeholders)
-- ---------------------------------------------------------
INSERT INTO users (name, email, password_hash) VALUES
('Aditya Sharma', 'aditya@example.com', '$2b$10$L5yzNcRzZ8zaX6jXw.6q4uXYZD1q2BVz13tKM.a37DsdVrkeLjlG.'),
('Riya Kapoor',   'riya@example.com',   '$2b$10$qRHOZbvhHFXYmKEEd2a3.O4MNv2CMFFo74F84SJqiWCQ7WTlQOZGq'),
('Karan Mehta',   'karan@example.com',  '$2b$10$YCOgU6/9kw6GG19PoqVwR.YOY4XSewnSEoISsVT9gX7VB.FluI35i');

-- ---------------------------------------------------------
-- 7. Shows
-- Mix of past (for booking history) and upcoming shows
-- across both cinemas, both screens each.
-- ---------------------------------------------------------
INSERT INTO shows (movie_id, screen_id, show_time, base_price)
SELECT m.movie_id, sc.screen_id, CURRENT_DATE + INTERVAL '1 day' + TIME '18:00', 250.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 1'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
WHERE m.title = 'Interstellar Odyssey'
UNION ALL
SELECT m.movie_id, sc.screen_id, CURRENT_DATE + INTERVAL '1 day' + TIME '20:00', 260.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 1'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'INOX Megaplex'
WHERE m.title = 'Interstellar Odyssey'
UNION ALL
SELECT m.movie_id, sc.screen_id, CURRENT_DATE + INTERVAL '1 day' + TIME '21:30', 220.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 1'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
WHERE m.title = 'The Last Monsoon'
UNION ALL
SELECT m.movie_id, sc.screen_id, CURRENT_DATE + INTERVAL '2 day' + TIME '15:00', 200.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 2'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
WHERE m.title = 'The Last Monsoon'
UNION ALL
SELECT m.movie_id, sc.screen_id, CURRENT_DATE + INTERVAL '2 day' + TIME '18:30', 240.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 1'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'INOX Megaplex'
WHERE m.title = 'Silicon Dreams'
UNION ALL
SELECT m.movie_id, sc.screen_id, CURRENT_DATE + INTERVAL '2 day' + TIME '21:00', 240.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 2'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'INOX Megaplex'
WHERE m.title = 'Silicon Dreams'
UNION ALL
SELECT m.movie_id, sc.screen_id, CURRENT_DATE + INTERVAL '3 day' + TIME '17:00', 210.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 2'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
WHERE m.title = 'Rangla Punjab'
UNION ALL
-- past show, used below for a completed/paid booking (history demo)
SELECT m.movie_id, sc.screen_id, CURRENT_DATE - INTERVAL '1 day' + TIME '19:00', 250.00
FROM movies m JOIN screens sc ON sc.screen_name = 'Screen 2'
  JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'INOX Megaplex'
WHERE m.title = 'Interstellar Odyssey';

-- ---------------------------------------------------------
-- 8. show_seats
-- Cross product: every seat belonging to a show's screen
-- gets one row per show. All start out 'available'.
-- ---------------------------------------------------------
INSERT INTO show_seats (show_id, seat_id, status, locked_until)
SELECT sh.show_id, se.seat_id, 'available', NULL
FROM shows sh
JOIN seats se ON se.screen_id = sh.screen_id;

-- ---------------------------------------------------------
-- 9. Demo bookings
-- Four scenarios covering every status your app needs to handle:
--   A. Confirmed + paid            (normal successful booking)
--   B. Confirmed + paid, past show (booking history / "my tickets")
--   C. Pending + seat locked       (user mid-checkout, not yet paid)
--   D. Cancelled + refunded        (user cancelled after booking)
-- ---------------------------------------------------------

-- ===== Booking A: Aditya books A1 + A2 for Interstellar Odyssey @ PVR Screen 1 =====
INSERT INTO bookings (user_id, status, total_amount)
SELECT user_id, 'confirmed', 500.00 FROM users WHERE email = 'aditya@example.com';

INSERT INTO booking_seats (booking_id, show_seat_id, price)
SELECT bk.booking_id, ss.show_seat_id, sh.base_price * st.price_multiplier
FROM bookings bk
JOIN users u ON u.user_id = bk.user_id AND u.email = 'aditya@example.com'
CROSS JOIN show_seats ss
JOIN shows sh ON sh.show_id = ss.show_id
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'Interstellar Odyssey'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 1'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
JOIN seats se ON se.seat_id = ss.seat_id AND se.seat_number IN ('A1', 'A2')
JOIN seat_types st ON st.seat_type_id = se.seat_type_id
WHERE bk.status = 'confirmed' AND bk.total_amount = 500.00;

UPDATE show_seats ss SET status = 'booked'
FROM shows sh
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'Interstellar Odyssey'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 1'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
JOIN seats se ON se.screen_id = sc.screen_id AND se.seat_number IN ('A1', 'A2')
WHERE ss.show_id = sh.show_id AND ss.seat_id = se.seat_id;

INSERT INTO payments (booking_id, amount, status)
SELECT booking_id, total_amount, 'success' FROM bookings
WHERE status = 'confirmed' AND total_amount = 500.00;

-- ===== Booking B: Karan booked B1 + B2 on a PAST show (booking history demo) =====
INSERT INTO bookings (user_id, status, total_amount)
SELECT user_id, 'confirmed', 750.00 FROM users WHERE email = 'karan@example.com';

INSERT INTO booking_seats (booking_id, show_seat_id, price)
SELECT bk.booking_id, ss.show_seat_id, sh.base_price * st.price_multiplier
FROM bookings bk
JOIN users u ON u.user_id = bk.user_id AND u.email = 'karan@example.com'
CROSS JOIN show_seats ss
JOIN shows sh ON sh.show_id = ss.show_id AND sh.show_time < NOW()
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'Interstellar Odyssey'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 2'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'INOX Megaplex'
JOIN seats se ON se.seat_id = ss.seat_id AND se.seat_number IN ('B1', 'B2')
JOIN seat_types st ON st.seat_type_id = se.seat_type_id
WHERE bk.status = 'confirmed' AND bk.total_amount = 750.00;

UPDATE show_seats ss SET status = 'booked'
FROM shows sh
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'Interstellar Odyssey'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 2'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'INOX Megaplex'
JOIN seats se ON se.screen_id = sc.screen_id AND se.seat_number IN ('B1', 'B2')
WHERE ss.show_id = sh.show_id AND ss.seat_id = se.seat_id AND sh.show_time < NOW();

INSERT INTO payments (booking_id, amount, status)
SELECT booking_id, total_amount, 'success' FROM bookings
WHERE status = 'confirmed' AND total_amount = 750.00;

-- ===== Booking C: Riya mid-checkout on C1, Last Monsoon @ PVR Screen 2 =====
-- Demonstrates the seat-locking mechanic (Phase 6): seat is locked,
-- booking/payment are 'pending' until she completes payment.
INSERT INTO bookings (user_id, status, total_amount)
SELECT user_id, 'pending', 400.00 FROM users WHERE email = 'riya@example.com';

INSERT INTO booking_seats (booking_id, show_seat_id, price)
SELECT bk.booking_id, ss.show_seat_id, sh.base_price * st.price_multiplier
FROM bookings bk
JOIN users u ON u.user_id = bk.user_id AND u.email = 'riya@example.com'
CROSS JOIN show_seats ss
JOIN shows sh ON sh.show_id = ss.show_id
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'The Last Monsoon'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 2'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
JOIN seats se ON se.seat_id = ss.seat_id AND se.seat_number = 'C1'
JOIN seat_types st ON st.seat_type_id = se.seat_type_id
WHERE bk.status = 'pending' AND bk.total_amount = 400.00;

UPDATE show_seats ss SET status = 'locked', locked_until = NOW() + INTERVAL '10 minutes'
FROM shows sh
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'The Last Monsoon'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 2'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
JOIN seats se ON se.screen_id = sc.screen_id AND se.seat_number = 'C1'
WHERE ss.show_id = sh.show_id AND ss.seat_id = se.seat_id;

INSERT INTO payments (booking_id, amount, status)
SELECT booking_id, total_amount, 'pending' FROM bookings
WHERE status = 'pending' AND total_amount = 400.00;

-- ===== Booking D: Aditya booked then cancelled A1, Last Monsoon @ PVR Screen 1 =====
INSERT INTO bookings (user_id, status, total_amount)
SELECT user_id, 'cancelled', 220.00 FROM users WHERE email = 'aditya@example.com';

INSERT INTO booking_seats (booking_id, show_seat_id, price)
SELECT bk.booking_id, ss.show_seat_id, sh.base_price * st.price_multiplier
FROM bookings bk
JOIN users u ON u.user_id = bk.user_id AND u.email = 'aditya@example.com'
CROSS JOIN show_seats ss
JOIN shows sh ON sh.show_id = ss.show_id
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'The Last Monsoon'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 1'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
JOIN seats se ON se.seat_id = ss.seat_id AND se.seat_number = 'A1'
JOIN seat_types st ON st.seat_type_id = se.seat_type_id
WHERE bk.status = 'cancelled' AND bk.total_amount = 220.00;

-- seat reverts to available once the booking is cancelled
-- (show_seats.status already 'available' by default; kept explicit here for clarity)
UPDATE show_seats ss SET status = 'available', locked_until = NULL
FROM shows sh
JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'The Last Monsoon'
JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 1'
JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
JOIN seats se ON se.screen_id = sc.screen_id AND se.seat_number = 'A1'
WHERE ss.show_id = sh.show_id AND ss.seat_id = se.seat_id;

INSERT INTO payments (booking_id, amount, status)
SELECT booking_id, total_amount, 'refunded' FROM bookings
WHERE status = 'cancelled' AND total_amount = 220.00;

-- ---------------------------------------------------------
-- 10. Sanity check: row counts per table
-- Run this after seeding to confirm everything loaded.
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
-- This tries to book an already-booked show_seat (Aditya's A1/A2
-- from Booking A) a second time -> violates UNIQUE(show_seat_id)
-- on booking_seats and the whole statement will error out.
-- ---------------------------------------------------------
-- INSERT INTO booking_seats (booking_id, show_seat_id, price)
-- SELECT (SELECT booking_id FROM bookings WHERE total_amount = 750.00 AND status='confirmed'),
--        ss.show_seat_id, 250.00
-- FROM show_seats ss
-- JOIN shows sh ON sh.show_id = ss.show_id
-- JOIN movies m ON m.movie_id = sh.movie_id AND m.title = 'Interstellar Odyssey'
-- JOIN screens sc ON sc.screen_id = sh.screen_id AND sc.screen_name = 'Screen 1'
-- JOIN cinemas c ON c.cinema_id = sc.cinema_id AND c.name = 'PVR Cinemas'
-- JOIN seats se ON se.seat_id = ss.seat_id AND se.seat_number = 'A1'
-- LIMIT 1;
