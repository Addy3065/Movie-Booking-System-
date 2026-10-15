-- =========================================================
-- Movie Ticket Booking System - Database Schema
-- MySQL 8 DDL (InnoDB)
-- Creation order respects FK dependencies (parents before children)
-- =========================================================

-- ---------------------------------------------------------
-- 1. cinemas
-- ---------------------------------------------------------
CREATE TABLE cinemas (
    cinema_id   INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    city        VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 2. screens (belongs to a cinema)
-- ---------------------------------------------------------
CREATE TABLE screens (
    screen_id     INT AUTO_INCREMENT PRIMARY KEY,
    cinema_id     INT NOT NULL,
    screen_name   VARCHAR(50) NOT NULL,
    total_seats   INT NOT NULL CHECK (total_seats > 0),
    UNIQUE (cinema_id, screen_name),
    FOREIGN KEY (cinema_id) REFERENCES cinemas(cinema_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_screens_cinema_id ON screens(cinema_id);

-- ---------------------------------------------------------
-- 3. seat_types (lookup table)
-- ---------------------------------------------------------
CREATE TABLE seat_types (
    seat_type_id      INT AUTO_INCREMENT PRIMARY KEY,
    type_name         VARCHAR(50) NOT NULL UNIQUE,
    price_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.00 CHECK (price_multiplier > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 4. seats (physical seat, belongs to a screen)
-- ---------------------------------------------------------
CREATE TABLE seats (
    seat_id       INT AUTO_INCREMENT PRIMARY KEY,
    screen_id     INT NOT NULL,
    seat_number   VARCHAR(10) NOT NULL,
    seat_type_id  INT NOT NULL,
    UNIQUE (screen_id, seat_number),
    FOREIGN KEY (screen_id) REFERENCES screens(screen_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_type_id) REFERENCES seat_types(seat_type_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_seats_screen_id ON seats(screen_id);
CREATE INDEX idx_seats_seat_type_id ON seats(seat_type_id);

-- ---------------------------------------------------------
-- 5. movies
-- ---------------------------------------------------------
CREATE TABLE movies (
    movie_id      INT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    duration_min  INT NOT NULL CHECK (duration_min > 0),
    language      VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 6. users
-- ---------------------------------------------------------
CREATE TABLE users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(10) NOT NULL DEFAULT 'user'
                   CHECK (role IN ('user', 'admin'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 7. shows (a movie playing on a screen at a specific time)
-- ---------------------------------------------------------
CREATE TABLE shows (
    show_id      INT AUTO_INCREMENT PRIMARY KEY,
    movie_id     INT NOT NULL,
    screen_id    INT NOT NULL,
    show_time    DATETIME NOT NULL,
    base_price   DECIMAL(8,2) NOT NULL CHECK (base_price > 0),
    UNIQUE (screen_id, show_time),  -- a screen can't host two shows at the same time
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES screens(screen_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_shows_movie_id ON shows(movie_id);
CREATE INDEX idx_shows_screen_id ON shows(screen_id);
CREATE INDEX idx_shows_show_time ON shows(show_time);

-- ---------------------------------------------------------
-- 8. show_seats (per-show availability of each physical seat)
--    This is the table seat-locking logic (Phase 5) operates on.
-- ---------------------------------------------------------
CREATE TABLE show_seats (
    show_seat_id   INT AUTO_INCREMENT PRIMARY KEY,
    show_id        INT NOT NULL,
    seat_id        INT NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'locked', 'booked')),
    locked_until   DATETIME(3),
    locked_by      INT,
    UNIQUE (show_id, seat_id),  -- one row per physical seat per show
    FOREIGN KEY (show_id) REFERENCES shows(show_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id) ON DELETE CASCADE,
    FOREIGN KEY (locked_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_show_seats_show_id ON show_seats(show_id);
CREATE INDEX idx_show_seats_status ON show_seats(status);
-- ---------------------------------------------------------
-- 9. bookings
-- ---------------------------------------------------------
CREATE TABLE bookings (
    booking_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    booking_time   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    total_amount   DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- ---------------------------------------------------------
-- 10. booking_seats (junction: which show_seats are in a booking)
--     UNIQUE(show_seat_id) is the DB-level guarantee against double booking:
--     a given show_seat can appear in at most one booking, ever.
-- ---------------------------------------------------------
CREATE TABLE booking_seats (
    booking_seat_id  INT AUTO_INCREMENT PRIMARY KEY,
    booking_id       INT NOT NULL,
    show_seat_id     INT NOT NULL,
    price            DECIMAL(8,2) NOT NULL CHECK (price > 0),
    UNIQUE (show_seat_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (show_seat_id) REFERENCES show_seats(show_seat_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_booking_seats_booking_id ON booking_seats(booking_id);

-- ---------------------------------------------------------
-- 11. payments
-- ---------------------------------------------------------
CREATE TABLE payments (
    payment_id   INT AUTO_INCREMENT PRIMARY KEY,
    booking_id   INT NOT NULL,
    amount       DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_payments_booking_id ON payments(booking_id);