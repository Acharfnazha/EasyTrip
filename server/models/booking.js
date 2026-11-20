// MODEL: the only file that talks to the "bookings" table. A booking is paid with the user's
// credit, so making one and cancelling one also change users.credit and add a row to
// credit_transactions. Each of those is one TRANSACTION: every change is saved, or none.
// DATE_FORMAT keeps the dates as YYYY-MM-DD text, so no time zone can move them by a day.
import db, { escapeLike } from "../utils/database.js";
import * as Credit from "./credit.js";
import * as Discount from "./discount.js";
import { applyPercent, bestDiscount } from "../utils/discounts.js";

// A booking with its stay, the stay's place, and the user who made it.
const BOOKING_COLUMNS = `
  b.booking_id, b.user_id, b.acc_id, b.travelers, b.total_price, b.discount_percent, b.status, b.created_at,
  DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
  DATEDIFF(b.end_date, b.start_date) AS nights,
  a.name AS stay_name, a.type AS stay_type, a.image, a.image_alt,
  d.name AS dest_name, d.country,
  u.first_name, u.last_name, u.email,
  (SELECT -t.amount FROM credit_transactions t
   WHERE t.booking_id = b.booking_id AND t.type = 'booking' LIMIT 1) AS paid_with_credit`;

const BOOKING_JOINS = `
  FROM bookings b
  JOIN accommodations a ON a.acc_id = b.acc_id
  JOIN destinations d ON d.dest_id = a.dest_id
  JOIN users u ON u.user_id = b.user_id`;

// CREATE: books a stay and pays for it with the user's credit, after the user's best discount
// for this stay today (booking.today). Returns
//   { bookingId, total, credit, discount }   when it worked (credit is the balance that is left,
//                                  discount is { name, percent } or null), or
//   { problem: "no-stay" }         the stay does not exist,
//   { problem: "dates-taken" }     another booking already has some of these nights,
//   { problem: "no-credit", total, credit }   the user's credit is less than the price.
export async function createWithCredit(booking) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // FOR UPDATE locks the stay's row until this transaction ends. A second booking of the
    // same stay waits here, so two people can never both find the same nights free.
    // The total is worked out by MySQL (DECIMAL), from the price in the database.
    const [stays] = await connection.execute(
      "SELECT type, price, price * CAST(? AS UNSIGNED) AS total FROM accommodations WHERE acc_id = ? FOR UPDATE",
      [booking.nights, booking.accId]
    );
    if (stays.length === 0) {
      await connection.rollback();
      return { problem: "no-stay" };
    }
    // The discount: the biggest one this user gets today for this stay (utils/discounts.js).
    const discounts = await Discount.findCurrentFor(booking.userId, booking.today, connection);
    const discount = bestDiscount(discounts, { kind: "stay", type: stays[0].type, id: booking.accId });
    const total = discount ? applyPercent(stays[0].total, discount.percent) : stays[0].total;

    // Two stays overlap when each one starts before the other ends. The check-out day is
    // free: a stay that ends on the 14th and one that starts on the 14th don't overlap.
    const [taken] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE acc_id = ? AND status <> 'cancelled' AND start_date < ? AND end_date > ?`,
      [booking.accId, booking.endDate, booking.startDate]
    );
    if (taken[0].total > 0) {
      await connection.rollback();
      return { problem: "dates-taken" };
    }

    // Pay: the credit only goes down if there is enough of it (models/credit.js).
    const payment = await Credit.pay(connection, booking.userId, total);
    if (!payment.paid) {
      await connection.rollback();
      return { problem: "no-credit", total: total, credit: payment.credit };
    }

    const [created] = await connection.execute(
      `INSERT INTO bookings (user_id, acc_id, start_date, end_date, travelers, total_price, discount_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [booking.userId, booking.accId, booking.startDate, booking.endDate, booking.travelers, total,
       discount ? discount.percent : null]
    );
    // The payment's line in the credit history: a minus amount, linked to the booking.
    await Credit.addRow(connection, {
      userId: booking.userId, type: "booking", amount: "-" + total, balanceAfter: payment.credit,
      bookingId: created.insertId,
    });

    await connection.commit();
    return {
      bookingId: created.insertId, total: total, credit: payment.credit,
      discount: discount && { name: discount.name, percent: discount.percent },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // Back to the pool, also after an error.
  }
}

// CANCEL: marks a booking cancelled and gives back the credit that paid for it. Returns
//   { refunded }                  the amount given back ("0.00" for a booking made before
//                                 credit existed: nothing was paid, so nothing is given back),
//   { problem: "not-found" }      there is no such booking,
//   { problem: "already-cancelled" }.
// adminId is the admin who cancelled it, or null when the customer cancelled their own booking.
export async function cancelWithRefund(bookingId, adminId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // FOR UPDATE: a second "cancel" of the same booking waits, then sees it is cancelled, so
    // the credit is never given back twice.
    const [bookings] = await connection.execute(
      "SELECT user_id, status FROM bookings WHERE booking_id = ? FOR UPDATE",
      [bookingId]
    );
    if (bookings.length === 0) {
      await connection.rollback();
      return { problem: "not-found" };
    }
    if (bookings[0].status === "cancelled") {
      await connection.rollback();
      return { problem: "already-cancelled" };
    }
    const userId = bookings[0].user_id;

    await connection.execute("UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?", [bookingId]);

    // What was paid for this booking goes back to the credit (models/credit.js).
    const refunded = await Credit.refund(connection, userId, { bookingId: bookingId }, adminId);

    await connection.commit();
    return { refunded: refunded };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// CONFIRM: only a pending booking can be confirmed. Returns true when it was.
export async function confirm(bookingId) {
  const [result] = await db.execute(
    "UPDATE bookings SET status = 'confirmed' WHERE booking_id = ? AND status = 'pending'",
    [bookingId]
  );
  return result.affectedRows > 0;
}

// One booking with its stay and its user, or undefined.
export async function findById(bookingId) {
  const [rows] = await db.execute(
    `SELECT ${BOOKING_COLUMNS} ${BOOKING_JOINS} WHERE b.booking_id = ?`,
    [bookingId]
  );
  return rows[0];
}

// A user's bookings, newest first.
export async function findByUser(userId) {
  const [rows] = await db.execute(
    `SELECT ${BOOKING_COLUMNS} ${BOOKING_JOINS}
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC, b.booking_id DESC
     LIMIT 50`,
    [userId]
  );
  return rows;
}

// One page of bookings for the admin, newest first, and how many match in total. The search
// looks in the customer's name and email and in the stay's name.
export async function findAll(filters) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push("b.status = ?");
    values.push(filters.status);
  }
  if (filters.search) {
    const pattern = "%" + escapeLike(filters.search) + "%";
    conditions.push("(CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ? OR a.name LIKE ?)");
    values.push(pattern, pattern, pattern);
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const offset = (filters.page - 1) * filters.limit;

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total ${BOOKING_JOINS} ${where}`, values);
  const [rows] = await db.execute(
    `SELECT ${BOOKING_COLUMNS} ${BOOKING_JOINS}
     ${where}
     ORDER BY b.created_at DESC, b.booking_id DESC
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset]
  );
  return { rows: rows, total: countRows[0].total };
}

// The nights of a stay that are already booked, from today on: [{ start_date, end_date }].
// Only the dates: who booked them is nobody else's business.
export async function findBookedDates(accId) {
  const [rows] = await db.execute(
    `SELECT DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
     FROM bookings
     WHERE acc_id = ? AND status <> 'cancelled' AND end_date > CURDATE()
     ORDER BY start_date`,
    [accId]
  );
  return rows;
}
