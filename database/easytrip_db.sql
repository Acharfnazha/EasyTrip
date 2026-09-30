-- EasyTrip database setup.
-- Creates the database and the table used by the contact form (includes/contact-handler.php).
-- Import with phpMyAdmin, or run:  mysql -u root < database/easytrip_db.sql

CREATE DATABASE IF NOT EXISTS easytrip_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE easytrip_db;

CREATE TABLE IF NOT EXISTS contact_messages (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120)  NOT NULL,
  email        VARCHAR(190)  NOT NULL,
  phone        VARCHAR(40)   NOT NULL DEFAULT '',
  topic        VARCHAR(120)  NOT NULL DEFAULT '',
  message_text TEXT          NOT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
