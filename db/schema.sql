-- =========================================================
-- Movie Ticket Booking System - Database Schema
-- PostgreSQL DDL
-- Creation order respects FK dependencies (parents before children)
-- =========================================================

-- ---------------------------------------------------------
-- 1. cinemas
-- ---------------------------------------------------------
CREATE TABLE cinemas (
    cinema_id   SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    city        VARCHAR(100) NOT NULL
);

-- ---------------------------------------------------------
-- 2. screens (belongs to a cinema)
-- ---------------------------------------------------------
CREATE TABLE screens (
    screen_id     SERIAL PRIMARY KEY,
    cinema_id     INT NOT NULL REFERENCES cinemas(cinema_id) ON DELETE CASCADE,
    screen_name   VARCHAR(50) NOT NULL,
    total_seats   INT NOT NULL CHECK (total_seats > 0),
    UNIQUE (cinema_id, screen_name)
);

CREATE INDEX idx_screens_cinema_id ON screens(cinema_id);

-- ---------------------------------------------------------
-- 3. seat_types (lookup table)
-- ---------------------------------------------------------
CREATE TABLE seat_types (
    seat_type_id      SERIAL PRIMARY KEY,
    type_name         VARCHAR(50) NOT NULL UNIQUE,
    price_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.00 CHECK (price_multiplier > 0)
);

-- ---------------------------------------------------------
-- 4. seats (physical seat, belongs to a screen)
-- ---------------------------------------------------------
CREATE TABLE seats (
    seat_id       SERIAL PRIMARY KEY,
    screen_id     INT NOT NULL REFERENCES screens(screen_id) ON DELETE CASCADE,
    seat_number   VARCHAR(10) NOT NULL,
    seat_type_id  INT NOT NULL REFERENCES seat_types(seat_type_id) ON DELETE RESTRICT,
    UNIQUE (screen_id, seat_number)
);

CREATE INDEX idx_seats_screen_id ON seats(screen_id);
CREATE INDEX idx_seats_seat_type_id ON seats(seat_type_id);

-- ---------------------------------------------------------
-- 5. movies
-- ---------------------------------------------------------
CREATE TABLE movies (
    movie_id      SERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    duration_min  INT NOT NULL CHECK (duration_min > 0),
    language      VARCHAR(50) NOT NULL
);

-- ---------------------------------------------------------
-- 6. users
-- ---------------------------------------------------------
CREATE TABLE users (
    user_id        SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL
);

-- ---------------------------------------------------------
-- 7. shows (a movie playing on a screen at a specific time)
-- ---------------------------------------------------------
CREATE TABLE shows (
    show_id      SERIAL PRIMARY KEY,
    movie_id     INT NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    screen_id    INT NOT NULL REFERENCES screens(screen_id) ON DELETE CASCADE,
    show_time    TIMESTAMP NOT NULL,
    base_price   DECIMAL(8,2) NOT NULL CHECK (base_price > 0),
    UNIQUE (screen_id, show_time)  -- a screen can't host two shows at the same time
);

CREATE INDEX idx_shows_movie_id ON shows(movie_id);
CREATE INDEX idx_shows_screen_id ON shows(screen_id);
CREATE INDEX idx_shows_show_time ON shows(show_time);

-- ---------------------------------------------------------
-- 8. show_seats (per-show availability of each physical seat)
--    This is the table seat-locking logic (Phase 5) operates on.
-- ---------------------------------------------------------
CREATE TABLE show_seats (
    show_seat_id   SERIAL PRIMARY KEY,
    show_id        INT NOT NULL REFERENCES shows(show_id) ON DELETE CASCADE,
    seat_id        INT NOT NULL REFERENCES seats(seat_id) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'locked', 'booked')),
    locked_until   TIMESTAMP,
    locked_by      INT REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE (show_id, seat_id)  -- one row per physical seat per show
);

CREATE INDEX idx_show_seats_show_id ON show_seats(show_id);
CREATE INDEX idx_show_seats_status ON show_seats(status);
-- ---------------------------------------------------------
-- 9. bookings
-- ---------------------------------------------------------
CREATE TABLE bookings (
    booking_id     SERIAL PRIMARY KEY,
    user_id        INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    booking_time   TIMESTAMP NOT NULL DEFAULT now(),
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    total_amount   DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0)
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- ---------------------------------------------------------
-- 10. booking_seats (junction: which show_seats are in a booking)
--     UNIQUE(show_seat_id) is the DB-level guarantee against double booking:
--     a given show_seat can appear in at most one booking, ever.
-- ---------------------------------------------------------
CREATE TABLE booking_seats (
    booking_seat_id  SERIAL PRIMARY KEY,
    booking_id       INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    show_seat_id     INT NOT NULL REFERENCES show_seats(show_seat_id) ON DELETE RESTRICT,
    price            DECIMAL(8,2) NOT NULL CHECK (price > 0),
    UNIQUE (show_seat_id)
);

CREATE INDEX idx_booking_seats_booking_id ON booking_seats(booking_id);

-- ---------------------------------------------------------
-- 11. payments
-- ---------------------------------------------------------
CREATE TABLE payments (
    payment_id   SERIAL PRIMARY KEY,
    booking_id   INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount       DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'success', 'failed', 'refunded'))
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
