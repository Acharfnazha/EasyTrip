// MODEL for the users' credit. The balance is the "credit" column of the users table, and every
// change of it is also a row in "credit_transactions" (like a bank statement). The two are
// always saved together, in one TRANSACTION: both, or (after an error) neither.
//
// The first three functions are the steps that models/booking.js and models/ticket.js use
// INSIDE their own transaction (they get its connection). The others are whole operations.
import db from "../utils/database.js";

// A ? that MySQL reads as money (an exact DECIMAL), not as a rounded decimal number.
const MONEY = "CAST(? AS DECIMAL(10,2))";

// ---------- Steps inside a transaction ----------

// Pays "amount" from the user's credit, only if there is enough of it. The check and the change
// are one statement, so two payments at the same moment can't spend the same credit twice.
// Returns { paid, credit }: whether it was paid, and the user's credit now.
export async function pay(connection, userId, amount) {
  const [result] = await connection.execute(
    `UPDATE users SET credit = credit - ${MONEY} WHERE user_id = ? AND credit >= ${MONEY}`,
    [amount, userId, amount]
  );
  const [rows] = await connection.execute("SELECT credit FROM users WHERE user_id = ?", [userId]);
  return { paid: result.affectedRows > 0, credit: rows[0].credit };
}

// Adds one row to the credit history. amount is text with its sign ("-560.00" or "200.00").
export async function addRow(connection, row) {
  await connection.execute(
    `INSERT INTO credit_transactions
       (user_id, type, amount, balance_after, booking_id, ticket_id, admin_id, note)
     VALUES (?, ?, ${MONEY}, ?, ?, ?, ?, ?)`,
    [row.userId, row.type, row.amount, row.balanceAfter, row.bookingId || null, row.ticketId || null,
     row.adminId || null, row.note || null]
  );
}

// Gives back what was paid for a booking or a ticket that is being cancelled. "bought" is
// { bookingId } or { ticketId }. What was paid is the amount of its payment row, so the refund is
// always exactly that. Returns the amount given back as text ("560.00"), or "0.00" when nothing
// was paid with credit (the sample bookings and tickets in seed.sql).
export async function refund(connection, userId, bought, adminId) {
  // The column and the type are two fixed pairs, never the user's text.
  const column = bought.ticketId ? "ticket_id" : "booking_id";
  const type = bought.ticketId ? "ticket" : "booking";
  const id = bought.ticketId || bought.bookingId;

  const [payments] = await connection.execute(
    `SELECT -amount AS paid FROM credit_transactions WHERE ${column} = ? AND type = ?`,
    [id, type]
  );
  if (payments.length === 0) return "0.00";

  const paid = payments[0].paid;
  await connection.execute(`UPDATE users SET credit = credit + ${MONEY} WHERE user_id = ?`, [paid, userId]);
  const [rows] = await connection.execute("SELECT credit FROM users WHERE user_id = ?", [userId]);
  await addRow(connection, {
    userId: userId, type: "refund", amount: paid, balanceAfter: rows[0].credit,
    bookingId: bought.bookingId, ticketId: bought.ticketId, adminId: adminId,
  });
  return paid;
}

// ---------- Whole operations ----------

// The newest changes of one user's credit, with what was bought for a payment or a refund: the
// stay's name, or the ticket's transport and route (LEFT JOIN: most rows have neither).
export async function findByUser(userId, limit) {
  const [rows] = await db.execute(
    `SELECT t.transaction_id, t.type, t.amount, t.balance_after, t.booking_id, t.ticket_id, t.note,
            t.created_at, a.name AS stay_name,
            k.type AS ticket_type, k.origin AS ticket_origin, k.destination AS ticket_destination
     FROM credit_transactions t
     LEFT JOIN bookings b ON b.booking_id = t.booking_id
     LEFT JOIN accommodations a ON a.acc_id = b.acc_id
     LEFT JOIN tickets k ON k.ticket_id = t.ticket_id
     WHERE t.user_id = ?
     ORDER BY t.created_at DESC, t.transaction_id DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
}

// An admin adds credit (amount above zero, type "top_up") or removes it (amount below zero,
// type "deduction"). amount is text like "200.00" or "-49.99": MySQL does the sum, so no cent
// is lost. Returns the new balance, or null when the change is not possible: the credit would
// go below zero or above maxCredit (or the user was deleted a moment ago).
export async function changeByAdmin(userId, amount, type, adminId, note, maxCredit) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // The condition is checked by MySQL in the same statement as the change, so two changes
    // at the same moment can never both pass on the old balance.
    const [result] = await connection.execute(
      `UPDATE users
       SET credit = credit + ${MONEY}
       WHERE user_id = ? AND credit + ${MONEY} >= 0 AND credit + ${MONEY} <= ?`,
      [amount, userId, amount, amount, maxCredit]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return null;
    }

    const [rows] = await connection.execute("SELECT credit FROM users WHERE user_id = ?", [userId]);
    await addRow(connection, {
      userId: userId, type: type, amount: amount, balanceAfter: rows[0].credit, adminId: adminId, note: note,
    });

    await connection.commit();
    return rows[0].credit;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // Back to the pool, also after an error.
  }
}
