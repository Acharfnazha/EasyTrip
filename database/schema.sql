-- EasyTrip database: table structure
-- Course: Web Programming I
--
-- Run this file first, then seed.sql. See database/README.md for the steps.
-- Running it again deletes these six tables and their data, then creates them empty.

CREATE DATABASE IF NOT EXISTS easytrip_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE easytrip_db;

-- Child tables are dropped first because of the foreign keys.
DROP TABLE IF EXISTS inquiries;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS accommodations;
DROP TABLE IF EXISTS destinations;
DROP TABLE IF EXISTS users;


-- ---------------------------------------------------------------------------
-- USERS: customer and admin accounts
-- The password is never stored as plain text, only its bcrypt hash.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  user_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- DESTINATIONS: places shown on the website, grouped by season
-- A place can be featured in more than one season, so the same name and
-- country are allowed as long as the season is different.
-- ---------------------------------------------------------------------------
CREATE TABLE destinations (
  dest_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name    VARCHAR(80)  NOT NULL,
  season  ENUM('winter', 'spring', 'summer', 'autumn') NOT NULL,
  country VARCHAR(60)  NOT NULL,

  PRIMARY KEY (dest_id),
  UNIQUE KEY uq_destinations_place (name, country, season),
  KEY idx_destinations_season (season)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- ACCOMMODATIONS: the hotels and chalets from hotels.html and chalets.html
-- One destination has many accommodations (1:N).
-- A destination that still has accommodations cannot be deleted (RESTRICT).
-- category and setting are only used by chalets, so they are NULL for hotels.
-- ---------------------------------------------------------------------------
CREATE TABLE accommodations (
  acc_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dest_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  type        ENUM('hotel', 'chalet') NOT NULL,
  category    VARCHAR(30)  NULL,
  setting     ENUM('mountain', 'coastal', 'countryside', 'forest', 'desert', 'tropical') NULL,
  price       DECIMAL(8,2) NOT NULL,            -- US dollars per night
  description VARCHAR(255) NOT NULL,
  image       VARCHAR(255) NOT NULL,
  image_alt   VARCHAR(255) NOT NULL,

  PRIMARY KEY (acc_id),
  KEY idx_accommodations_type_price (type, price),
  CONSTRAINT fk_accommodations_destination
    FOREIGN KEY (dest_id) REFERENCES destinations (dest_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_accommodations_price CHECK (price > 0)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- BOOKINGS: a customer's reservation of a hotel or chalet
-- One user has many bookings and one accommodation has many bookings (1:N).
-- Deleting a user also deletes their bookings (CASCADE).
-- An accommodation that has bookings cannot be deleted (RESTRICT).
-- total_price is saved at booking time, so a later price change does not
-- change old bookings.
-- ---------------------------------------------------------------------------
CREATE TABLE bookings (
  booking_id  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NOT NULL,
  acc_id      INT UNSIGNED  NOT NULL,
  start_date  DATE          NOT NULL,
  end_date    DATE          NOT NULL,
  travelers   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  status      ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (booking_id),
  KEY idx_bookings_user (user_id),
  KEY idx_bookings_acc_dates (acc_id, start_date, end_date),
  KEY idx_bookings_status (status),
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_bookings_accommodation
    FOREIGN KEY (acc_id) REFERENCES accommodations (acc_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_bookings_dates CHECK (end_date > start_date),
  CONSTRAINT chk_bookings_travelers CHECK (travelers BETWEEN 1 AND 9),
  CONSTRAINT chk_bookings_total CHECK (total_price >= 0)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- TICKETS: flight, bus and train plans from flight.html and bus-train.html
-- One user has many tickets (1:N).
-- The route is split into origin and destination because the forms ask for
-- "From" and "To" separately. The rules below are the same as the form checks.
-- ---------------------------------------------------------------------------
CREATE TABLE tickets (
  ticket_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  type        ENUM('flight', 'bus', 'train') NOT NULL,
  origin      VARCHAR(80)  NOT NULL,
  destination VARCHAR(80)  NOT NULL,
  trip_type   ENUM('round', 'oneway') NOT NULL DEFAULT 'round',
  depart_date DATE         NOT NULL,
  return_date DATE         NULL,
  travelers   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  seat_class  ENUM('economy', 'premium', 'business', 'first', 'standard', 'sleeper') NOT NULL,
  status      ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (ticket_id),
  KEY idx_tickets_user_date (user_id, depart_date),
  KEY idx_tickets_status (status),
  CONSTRAINT fk_tickets_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_tickets_route CHECK (origin <> destination),
  CONSTRAINT chk_tickets_return CHECK (
    (trip_type = 'round'  AND return_date IS NOT NULL AND return_date >= depart_date) OR
    (trip_type = 'oneway' AND return_date IS NULL)
  ),
  CONSTRAINT chk_tickets_travelers CHECK (travelers BETWEEN 1 AND 9),
  CONSTRAINT chk_tickets_class CHECK (
    (type = 'flight' AND seat_class IN ('economy', 'premium', 'business', 'first')) OR
    (type = 'bus'    AND seat_class IN ('standard', 'premium')) OR
    (type = 'train'  AND seat_class IN ('standard', 'first', 'sleeper'))
  )
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- INQUIRIES: messages from contact.html, kept for the admin to review
-- Visitors can send a message without an account, so user_id is optional.
-- If a user is deleted their messages stay, with user_id set to NULL.
-- The field lengths and topics are the same as the contact form.
-- ---------------------------------------------------------------------------
CREATE TABLE inquiries (
  inquiry_id INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NULL,
  name       VARCHAR(120)  NOT NULL,
  email      VARCHAR(190)  NOT NULL,
  phone      VARCHAR(40)   NULL,
  topic      ENUM('general', 'destinations', 'stays', 'flights', 'bus-train', 'website', 'other') NOT NULL,
  message    VARCHAR(2000) NOT NULL,
  status     ENUM('new', 'read', 'closed') NOT NULL DEFAULT 'new',
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (inquiry_id),
  KEY idx_inquiries_status (status),
  CONSTRAINT fk_inquiries_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;
