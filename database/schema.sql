-- EasyTrip database: table structure
-- Course: Web Programming I
--
-- Run this file first, then seed.sql. See database/README.md for the steps.
-- Running it again deletes these ten tables and their data, then creates them empty.

CREATE DATABASE IF NOT EXISTS easytrip_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE easytrip_db;

-- Child tables are dropped first because of the foreign keys.
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS discount_exclusions;
DROP TABLE IF EXISTS discounts;
DROP TABLE IF EXISTS id_documents;
DROP TABLE IF EXISTS inquiry_replies;
DROP TABLE IF EXISTS inquiries;
DROP TABLE IF EXISTS credit_transactions;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS accommodations;
DROP TABLE IF EXISTS destinations;
DROP TABLE IF EXISTS users;


-- ---------------------------------------------------------------------------
-- USERS: customer and admin accounts
-- The password is never stored as plain text, only its bcrypt hash.
-- An account made with "Continue with Google" has no password: its
-- password_hash is NULL, and it can only log in through Google.
-- credit is the money (US dollars) an admin gave the account. Bookings are
-- paid from it, and it can never go below zero. Every change of it is also a
-- row in credit_transactions.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  user_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NULL,
  role          ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  credit        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_credit CHECK (credit >= 0)
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
  discount_percent TINYINT UNSIGNED NULL,      -- the discount in total_price, NULL for none
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
-- total_price is what the user paid with their credit, for every traveler
-- (a sample fare, see server/utils/fares.js). It is NULL for a plan saved
-- before tickets had a price.
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
  total_price DECIMAL(10,2) NULL,
  discount_percent TINYINT UNSIGNED NULL,      -- the discount in total_price, NULL for none
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
  CONSTRAINT chk_tickets_total CHECK (total_price IS NULL OR total_price >= 0),
  CONSTRAINT chk_tickets_class CHECK (
    (type = 'flight' AND seat_class IN ('economy', 'premium', 'business', 'first')) OR
    (type = 'bus'    AND seat_class IN ('standard', 'premium')) OR
    (type = 'train'  AND seat_class IN ('standard', 'first', 'sleeper'))
  )
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- CREDIT_TRANSACTIONS: every change of a user's credit, one row per change
-- One user has many rows (1:N). Deleting the user deletes them (CASCADE).
-- type says what happened:
--   top_up:    an admin added credit            (amount above zero)
--   deduction: an admin removed credit          (amount below zero)
--   booking:   the user paid for a booking      (amount below zero)
--   ticket:    the user paid for a ticket       (amount below zero)
--   refund:    a paid booking or ticket was cancelled (amount above zero)
-- balance_after is the user's credit right after this change, so the rows
-- read like a bank statement. The balance itself is users.credit: it and its
-- row here are always saved together, in one transaction.
-- booking_id or ticket_id links a payment or a refund to what was bought, and
-- admin_id says which admin made a change. They become NULL if that row is
-- deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE credit_transactions (
  transaction_id INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED  NOT NULL,
  type           ENUM('top_up', 'deduction', 'booking', 'ticket', 'refund') NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  balance_after  DECIMAL(10,2) NOT NULL,
  booking_id     INT UNSIGNED  NULL,
  ticket_id      INT UNSIGNED  NULL,
  admin_id       INT UNSIGNED  NULL,
  note           VARCHAR(255)  NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (transaction_id),
  KEY idx_credit_transactions_user (user_id, created_at),
  KEY idx_credit_transactions_booking (booking_id),
  KEY idx_credit_transactions_ticket (ticket_id),
  CONSTRAINT fk_credit_transactions_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_credit_transactions_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_credit_transactions_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (ticket_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_credit_transactions_admin
    FOREIGN KEY (admin_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  -- Money in has a plus sign and money out a minus sign, and the balance is never negative.
  CONSTRAINT chk_credit_transactions_amount CHECK (
    (type IN ('top_up', 'refund') AND amount > 0) OR
    (type IN ('deduction', 'booking', 'ticket') AND amount < 0)
  ),
  CONSTRAINT chk_credit_transactions_balance CHECK (balance_after >= 0)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- INQUIRIES: messages from contact.html, kept for the admin to read and answer
-- Visitors can send a message without an account, so user_id is optional.
-- A message sent while logged in is linked to the account, and its replies
-- appear on "My account".
-- If a user is deleted their messages stay, with user_id set to NULL.
-- The field lengths and topics are the same as the contact form.
-- status: new (nobody opened it), read (opened, not answered yet),
-- answered (it has a reply), closed (nothing more to do).
-- ---------------------------------------------------------------------------
CREATE TABLE inquiries (
  inquiry_id INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NULL,
  name       VARCHAR(120)  NOT NULL,
  email      VARCHAR(190)  NOT NULL,
  phone      VARCHAR(40)   NULL,
  topic      ENUM('general', 'destinations', 'stays', 'flights', 'bus-train', 'website', 'other') NOT NULL,
  message    VARCHAR(2000) NOT NULL,
  status     ENUM('new', 'read', 'answered', 'closed') NOT NULL DEFAULT 'new',
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (inquiry_id),
  KEY idx_inquiries_status (status),
  CONSTRAINT fk_inquiries_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- INQUIRY_REPLIES: the admins' answers to the contact messages
-- A message can have several replies (one-to-many). Deleting a message deletes
-- its replies (CASCADE). admin_id is the admin who answered; if that account
-- is deleted, the reply stays with admin_id set to NULL.
-- ---------------------------------------------------------------------------
CREATE TABLE inquiry_replies (
  reply_id   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  inquiry_id INT UNSIGNED  NOT NULL,
  admin_id   INT UNSIGNED  NULL,
  message    VARCHAR(2000) NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (reply_id),
  KEY idx_inquiry_replies_inquiry (inquiry_id, created_at),
  CONSTRAINT fk_inquiry_replies_inquiry
    FOREIGN KEY (inquiry_id) REFERENCES inquiries (inquiry_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_inquiry_replies_admin
    FOREIGN KEY (admin_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_inquiry_replies_message CHECK (CHAR_LENGTH(TRIM(message)) > 0)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- ID_DOCUMENTS: the identity document a user scanned, checked and saved
-- (a passport, an ID card or a driving licence)
-- One row per user (a new save replaces the old one). Deleting the user
-- deletes it (CASCADE).
-- The PHOTO of the document is saved in private/documents/ (outside public/, so
-- only an admin can see it through the API); document_file is its name. It lets
-- the admin compare the document with the details and the selfie. It is deleted,
-- and set to NULL, once the identity is verified (after a rejection it is kept,
-- for the next selfie). Scanning another document replaces it.
-- read_method says where the details came from:
--   machine_code: read from the document's machine-readable code (passports,
--                 most ID cards). Then:
--                 same_as_read = 1 when the user saved exactly what was read,
--                 check_digits_valid = 1 when every check digit was correct.
--   typed:        typed by the user, because the document has no code (most
--                 driving licences, some ID cards). Then found_on_photo lists
--                 the typed details that were found in the photo's printed text.
-- These columns describe the reading only. They do NOT prove that the document
-- is genuine or that it belongs to the user.
-- A driving licence doesn't say the holder's nationality, so it has none.
-- Some ID cards and driving licences never expire: their expiry_date is NULL.
-- Names can be in Arabic or Latin letters, as printed on the document.
-- status is the admin's review of the identity:
--   unverified: saved, but no selfie sent yet
--   pending:    the user sent a selfie holding the document; an admin must look
--   verified:   an admin compared the selfie with the details and approved them
--   rejected:   an admin refused them (review_note says why); the user can try again
-- selfie_file is the name of the selfie in private/selfies/ (outside public/, so
-- only an admin can see it through the API). It is deleted, and set to NULL,
-- as soon as the admin decides. Saving new details starts again at unverified.
-- liveness_steps lists the movements the camera check captured (a photo looking
-- straight, turning left, turning right and coming closer, saved next to the
-- selfie). A printed photo can't do them. NULL when the selfie was uploaded
-- without the camera check.
-- ---------------------------------------------------------------------------
CREATE TABLE id_documents (
  document_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NOT NULL,
  document_type      ENUM('passport', 'id_card', 'driving_licence') NOT NULL,
  surname            VARCHAR(50)  NOT NULL,
  given_names        VARCHAR(50)  NOT NULL DEFAULT '',
  document_number    VARCHAR(20)  NOT NULL,
  issuing_country    CHAR(3)      NOT NULL,
  nationality        CHAR(3)      NULL,
  date_of_birth      DATE         NOT NULL,
  expiry_date        DATE         NULL,
  read_method        ENUM('machine_code', 'typed') NOT NULL,
  same_as_read       BOOLEAN      NULL,
  check_digits_valid BOOLEAN      NULL,
  found_on_photo     SET('surname', 'given_names', 'document_number', 'date_of_birth', 'expiry_date') NULL,
  status             ENUM('unverified', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'unverified',
  document_file      VARCHAR(100) NULL,
  selfie_file        VARCHAR(100) NULL,
  liveness_steps     SET('straight', 'left', 'right', 'closer') NULL,
  submitted_at       DATETIME     NULL,
  reviewed_by        INT UNSIGNED NULL,
  reviewed_at        DATETIME     NULL,
  review_note        VARCHAR(255) NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (document_id),
  UNIQUE KEY uq_id_documents_user (user_id),
  KEY idx_id_documents_status (status),
  CONSTRAINT fk_id_documents_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_id_documents_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_id_documents_dates CHECK (expiry_date > date_of_birth),
  -- Every passport has an expiry date.
  CONSTRAINT chk_id_documents_expiry CHECK (document_type <> 'passport' OR expiry_date IS NOT NULL),
  -- Passports and ID cards have a nationality; driving licences don't.
  CONSTRAINT chk_id_documents_nationality CHECK (
    (document_type = 'driving_licence' AND nationality IS NULL) OR
    (document_type <> 'driving_licence' AND nationality IS NOT NULL)
  ),
  -- Every passport has a code; the driving licences we accept don't.
  CONSTRAINT chk_id_documents_method CHECK (
    (document_type <> 'passport' OR read_method = 'machine_code') AND
    (document_type <> 'driving_licence' OR read_method = 'typed')
  ),
  -- Each reading method fills its own columns, and only those.
  CONSTRAINT chk_id_documents_checks CHECK (
    (read_method = 'machine_code' AND same_as_read IS NOT NULL
      AND check_digits_valid IS NOT NULL AND found_on_photo IS NULL) OR
    (read_method = 'typed' AND same_as_read IS NULL
      AND check_digits_valid IS NULL AND found_on_photo IS NOT NULL)
  )
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- DISCOUNTS: a percentage off, made by an admin
-- It is for every customer (user_id NULL) or for one customer, and for
-- everything, all stays, hotels only, chalets only, or tickets only. It works
-- from start_date to end_date (the day of the booking; NULL: no limit).
-- When several discounts fit, only the biggest one is used (they don't add up).
-- Deleting the customer also deletes their discounts (CASCADE).
-- ---------------------------------------------------------------------------
CREATE TABLE discounts (
  discount_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,              -- shown to the customer, like "Winter chalet sale"
  percent     TINYINT UNSIGNED NOT NULL,
  applies_to  ENUM('everything', 'stays', 'hotels', 'chalets', 'tickets') NOT NULL,
  user_id     INT UNSIGNED NULL,
  start_date  DATE NULL,
  end_date    DATE NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (discount_id),
  KEY idx_discounts_user (user_id),
  CONSTRAINT fk_discounts_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_discounts_percent CHECK (percent BETWEEN 1 AND 90),
  CONSTRAINT chk_discounts_dates CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- DISCOUNT_EXCLUSIONS: the stays a discount does NOT apply to
-- (for example a chalets discount, except two chalets). N:M between discounts
-- and accommodations. Deleting either side deletes the row (CASCADE).
-- ---------------------------------------------------------------------------
CREATE TABLE discount_exclusions (
  discount_id INT UNSIGNED NOT NULL,
  acc_id      INT UNSIGNED NOT NULL,

  PRIMARY KEY (discount_id, acc_id),
  KEY idx_discount_exclusions_acc (acc_id),
  CONSTRAINT fk_discount_exclusions_discount
    FOREIGN KEY (discount_id) REFERENCES discounts (discount_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_discount_exclusions_accommodation
    FOREIGN KEY (acc_id) REFERENCES accommodations (acc_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;


-- ---------------------------------------------------------------------------
-- SESSIONS: who is logged in, one row per logged-in browser
-- The server's session store (express-session with express-mysql-session)
-- writes these rows at login and deletes them at logout. The browser only
-- keeps the signed session_id in a cookie. data holds the session as JSON
-- (only the user's id). expires is a Unix time in seconds, and the store
-- deletes expired rows by itself.
-- This is the store's own table definition, so the server can also create the
-- table when it is missing. It has no foreign key: the user's id is inside data.
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT   COLLATE utf8mb4_bin,

  PRIMARY KEY (session_id)
) ENGINE=InnoDB;
