-- EasyTrip database: example queries
-- Run this file after schema.sql and seed.sql to see how the data is used.
--
-- Each query matches a feature from the project proposal. The values written
-- here (like 'Lebanon' or user 2) are examples. In the backend they will come
-- from the user and will be sent as ? parameters, never joined into the SQL
-- string, to protect against SQL injection.

USE easytrip_db;


-- ===========================================================================
-- 1. Register and log in
-- ===========================================================================

-- Register: check that the email is not already used.
SELECT COUNT(*) AS email_used
FROM users
WHERE email = 'lara.haddad@example.com';

-- Log in: get the account by email. The backend then compares the typed
-- password with password_hash using bcrypt.
SELECT user_id, first_name, last_name, password_hash, role
FROM users
WHERE email = 'lara.haddad@example.com';


-- ===========================================================================
-- 2. Browse destinations
-- ===========================================================================

-- Destinations of one season, with how many stays each one has.
-- LEFT JOIN also keeps places that have no stays yet (like Canada).
SELECT d.name, d.country, COUNT(a.acc_id) AS stays
FROM destinations d
LEFT JOIN accommodations a ON a.dest_id = d.dest_id
WHERE d.season = 'winter'
GROUP BY d.dest_id, d.name, d.country
ORDER BY stays DESC, d.name;


-- ===========================================================================
-- 3. Search hotels and chalets (same filters as hotels.html and chalets.html)
-- ===========================================================================

-- Hotels under a maximum price, cheapest first.
SELECT a.name, d.name AS place, d.country, a.price
FROM accommodations a
JOIN destinations d ON d.dest_id = a.dest_id
WHERE a.type = 'hotel' AND a.price <= 250
ORDER BY a.price;

-- Chalets by setting and maximum price.
SELECT a.name, a.category, d.name AS place, d.country, a.price
FROM accommodations a
JOIN destinations d ON d.dest_id = a.dest_id
WHERE a.type = 'chalet' AND a.setting = 'mountain' AND a.price <= 400
ORDER BY a.price;

-- Search box: match the stay name, the place or the country.
SELECT a.name, a.type, d.name AS place, d.country, a.price
FROM accommodations a
JOIN destinations d ON d.dest_id = a.dest_id
WHERE a.name LIKE '%Lebanon%' OR d.name LIKE '%Lebanon%' OR d.country LIKE '%Lebanon%'
ORDER BY a.type, a.acc_id;


-- ===========================================================================
-- 4. Make a booking
-- ===========================================================================

-- Availability check for Mountain Top Cabin (acc_id 28), 22 to 26 December 2026.
-- Two stays overlap when each one starts before the other one ends.
-- A result of 0 means it is free. This one returns 1 because of booking 1.
SELECT COUNT(*) AS overlapping_bookings
FROM bookings
WHERE acc_id = 28
  AND status <> 'cancelled'
  AND start_date < '2026-12-26'
  AND end_date > '2026-12-22';

-- Save the booking inside a transaction, with the total calculated from the
-- current price. ROLLBACK cancels it here so the sample data does not change;
-- the backend will use COMMIT.
START TRANSACTION;

INSERT INTO bookings (user_id, acc_id, start_date, end_date, travelers, total_price)
SELECT 2, a.acc_id, '2027-02-01', '2027-02-04', 2,
       DATEDIFF('2027-02-04', '2027-02-01') * a.price
FROM accommodations a
WHERE a.acc_id = 28;

SELECT booking_id, start_date, end_date, total_price, status
FROM bookings
WHERE booking_id = LAST_INSERT_ID();

ROLLBACK;


-- ===========================================================================
-- 5. "My trips" page for one customer (user 3)
-- ===========================================================================

-- The customer's stays.
SELECT b.booking_id, a.name, a.type, d.name AS place, d.country,
       b.start_date, b.end_date, b.travelers, b.total_price, b.status
FROM bookings b
JOIN accommodations a ON a.acc_id = b.acc_id
JOIN destinations d ON d.dest_id = a.dest_id
WHERE b.user_id = 3
ORDER BY b.start_date;

-- The customer's flight, bus and train tickets.
SELECT ticket_id, type, CONCAT(origin, ' to ', destination) AS route,
       trip_type, depart_date, return_date, travelers, seat_class, status
FROM tickets
WHERE user_id = 3
ORDER BY depart_date;


-- ===========================================================================
-- 6. Admin: manage bookings and inquiries
-- ===========================================================================

-- Bookings waiting for a decision, oldest first, with the customer's name.
SELECT b.booking_id, CONCAT(u.first_name, ' ', u.last_name) AS customer, u.email,
       a.name AS stay, b.start_date, b.end_date, b.total_price, b.created_at
FROM bookings b
JOIN users u ON u.user_id = b.user_id
JOIN accommodations a ON a.acc_id = b.acc_id
WHERE b.status = 'pending'
ORDER BY b.created_at;

-- Confirm or cancel a booking (the ROLLBACK keeps the sample data unchanged).
START TRANSACTION;
UPDATE bookings SET status = 'confirmed' WHERE booking_id = 2;
SELECT booking_id, status FROM bookings WHERE booking_id = 2;
ROLLBACK;

-- New messages from the contact form. LEFT JOIN keeps visitors with no account.
SELECT i.inquiry_id, i.name, i.email, i.topic, i.created_at,
       IF(u.user_id IS NULL, 'visitor', 'customer') AS sender
FROM inquiries i
LEFT JOIN users u ON u.user_id = i.user_id
WHERE i.status = 'new'
ORDER BY i.created_at;


-- ===========================================================================
-- 7. Admin: statistics for the dashboard
-- ===========================================================================

-- Main totals.
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'customer')  AS customers,
  (SELECT COUNT(*) FROM accommodations)                 AS accommodations,
  (SELECT COUNT(*) FROM bookings)                       AS bookings,
  (SELECT COUNT(*) FROM tickets)                        AS tickets,
  (SELECT COUNT(*) FROM inquiries WHERE status = 'new') AS new_inquiries;

-- New customers per month.
SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS new_customers
FROM users
WHERE role = 'customer'
GROUP BY month
ORDER BY month;

-- Number of bookings and their value for each status.
SELECT status, COUNT(*) AS bookings, SUM(total_price) AS total_value
FROM bookings
GROUP BY status;

-- Most booked stays, not counting cancelled bookings.
SELECT a.name, a.type, COUNT(*) AS bookings, SUM(b.total_price) AS total_value
FROM bookings b
JOIN accommodations a ON a.acc_id = b.acc_id
WHERE b.status <> 'cancelled'
GROUP BY a.acc_id, a.name, a.type
ORDER BY bookings DESC, total_value DESC
LIMIT 5;

-- Average, lowest and highest price per night for hotels and for chalets.
SELECT type, COUNT(*) AS stays, ROUND(AVG(price), 2) AS average_price,
       MIN(price) AS lowest_price, MAX(price) AS highest_price
FROM accommodations
GROUP BY type;
