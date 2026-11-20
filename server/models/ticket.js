// MODEL: the only file that talks to the "tickets" table (flight, bus and train tickets). A
// ticket is paid with the user's credit, so buying one and cancelling one also change
// users.credit and add a row to credit_transactions. Each is one TRANSACTION.
// DATE_FORMAT keeps the dates as YYYY-MM-DD text, so no time zone can move them by a day.
import db, { escapeLike } from "../utils/database.js";
import * as Credit from "./credit.js";

// A ticket with the user who bought it, and what was paid for it with credit (NULL for the
// sample tickets in seed.sql, which were saved before tickets had a price).
const TICKET_COLUMNS = `
  k.ticket_id, k.user_id, k.type, k.origin, k.destination, k.trip_type, k.travelers,
  k.seat_class, k.total_price, k.discount_percent, k.status, k.created_at,
  DATE_FORMAT(k.depart_date, '%Y-%m-%d') AS depart_date,
  DATE_FORMAT(k.return_date, '%Y-%m-%d') AS return_date,
  u.first_name, u.last_name, u.email,
  (SELECT -t.amount FROM credit_transactions t
   WHERE t.ticket_id = k.ticket_id AND t.type = 'ticket' LIMIT 1) AS paid_with_credit`;

const TICKET_JOINS = `
  FROM tickets k
  JOIN users u ON u.user_id = k.user_id`;

// CREATE: saves a ticket and pays for it with the user's credit. ticket.total is the price the
// controller worked out from the fares (text like "880.00"), after the discount
// ticket.discountPercent (null for none). Returns
//   { ticketId, credit }             when it worked (credit is the balance that is left), or
//   { problem: "no-credit", credit } the user's credit is less than the price.
export async function createWithCredit(ticket) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Pay first: the credit only goes down if there is enough of it (models/credit.js).
    const payment = await Credit.pay(connection, ticket.userId, ticket.total);
    if (!payment.paid) {
      await connection.rollback();
      return { problem: "no-credit", credit: payment.credit };
    }

    const [created] = await connection.execute(
      `INSERT INTO tickets
         (user_id, type, origin, destination, trip_type, depart_date, return_date, travelers,
          seat_class, total_price, discount_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticket.userId, ticket.type, ticket.origin, ticket.destination, ticket.tripType,
       ticket.departDate, ticket.returnDate, ticket.travelers, ticket.seatClass, ticket.total,
       ticket.discountPercent ?? null]
    );
    // The payment's line in the credit history: a minus amount, linked to the ticket.
    await Credit.addRow(connection, {
      userId: ticket.userId, type: "ticket", amount: "-" + ticket.total, balanceAfter: payment.credit,
      ticketId: created.insertId,
    });

    await connection.commit();
    return { ticketId: created.insertId, credit: payment.credit };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // Back to the pool, also after an error.
  }
}

// CANCEL: marks a ticket cancelled and gives back the credit that paid for it. Returns
//   { refunded }                  the amount given back ("0.00" when nothing was paid with credit),
//   { problem: "not-found" }      there is no such ticket,
//   { problem: "already-cancelled" }.
// adminId is the admin who cancelled it, or null when the customer cancelled their own ticket.
export async function cancelWithRefund(ticketId, adminId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // FOR UPDATE: a second "cancel" of the same ticket waits, then sees it is cancelled, so
    // the credit is never given back twice.
    const [tickets] = await connection.execute(
      "SELECT user_id, status FROM tickets WHERE ticket_id = ? FOR UPDATE",
      [ticketId]
    );
    if (tickets.length === 0) {
      await connection.rollback();
      return { problem: "not-found" };
    }
    if (tickets[0].status === "cancelled") {
      await connection.rollback();
      return { problem: "already-cancelled" };
    }

    await connection.execute("UPDATE tickets SET status = 'cancelled' WHERE ticket_id = ?", [ticketId]);
    const refunded = await Credit.refund(connection, tickets[0].user_id, { ticketId: ticketId }, adminId);

    await connection.commit();
    return { refunded: refunded };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// CONFIRM: only a pending ticket can be confirmed. Returns true when it was.
export async function confirm(ticketId) {
  const [result] = await db.execute(
    "UPDATE tickets SET status = 'confirmed' WHERE ticket_id = ? AND status = 'pending'",
    [ticketId]
  );
  return result.affectedRows > 0;
}

// One ticket with its user, or undefined.
export async function findById(ticketId) {
  const [rows] = await db.execute(`SELECT ${TICKET_COLUMNS} ${TICKET_JOINS} WHERE k.ticket_id = ?`, [ticketId]);
  return rows[0];
}

// A user's tickets, newest first.
export async function findByUser(userId) {
  const [rows] = await db.execute(
    `SELECT ${TICKET_COLUMNS} ${TICKET_JOINS}
     WHERE k.user_id = ?
     ORDER BY k.created_at DESC, k.ticket_id DESC
     LIMIT 50`,
    [userId]
  );
  return rows;
}

// One page of tickets for the admin, newest first, and how many match in total. The search
// looks in the customer's name and email and in the two places of the route.
export async function findAll(filters) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push("k.status = ?");
    values.push(filters.status);
  }
  if (filters.type) {
    conditions.push("k.type = ?");
    values.push(filters.type);
  }
  if (filters.search) {
    const pattern = "%" + escapeLike(filters.search) + "%";
    conditions.push(
      "(CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ? OR k.origin LIKE ? OR k.destination LIKE ?)"
    );
    values.push(pattern, pattern, pattern, pattern);
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const offset = (filters.page - 1) * filters.limit;

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total ${TICKET_JOINS} ${where}`, values);
  const [rows] = await db.execute(
    `SELECT ${TICKET_COLUMNS} ${TICKET_JOINS}
     ${where}
     ORDER BY k.created_at DESC, k.ticket_id DESC
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset]
  );
  return { rows: rows, total: countRows[0].total };
}
