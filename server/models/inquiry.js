// MODEL: the only file that talks to the "inquiries" table (the contact messages) and the
// "inquiry_replies" table (the admins' answers). One message has many replies.
import db, { escapeLike } from "../utils/database.js";

// Saves a contact message. userId is null for a visitor. Returns the new message's id.
export async function create(inquiry) {
  const [result] = await db.execute(
    `INSERT INTO inquiries (user_id, name, email, phone, topic, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [inquiry.userId, inquiry.name, inquiry.email, inquiry.phone || null, inquiry.topic, inquiry.message]
  );
  return result.insertId;
}

// The messages a user sent while logged in, newest first, each with its replies (oldest first).
// Two queries: the messages, then the replies to all of them. The replies are then put under
// their message by inquiry_id.
export async function findByUser(userId) {
  const [messages] = await db.execute(
    `SELECT inquiry_id, topic, message, status, created_at
     FROM inquiries
     WHERE user_id = ?
     ORDER BY created_at DESC, inquiry_id DESC
     LIMIT 50`,
    [userId]
  );
  const [replies] = await db.execute(
    `SELECT r.inquiry_id, r.message, r.created_at
     FROM inquiry_replies r
     JOIN inquiries i ON i.inquiry_id = r.inquiry_id
     WHERE i.user_id = ?
     ORDER BY r.created_at, r.reply_id`,
    [userId]
  );
  return messages.map((message) => ({
    ...message,
    replies: replies.filter((reply) => reply.inquiry_id === message.inquiry_id),
  }));
}

// The WHERE part of the admin's list. Every value gets a ? placeholder.
function buildWhere(filters) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push("i.status = ?");
    values.push(filters.status);
  }
  if (filters.search) {
    const pattern = "%" + escapeLike(filters.search) + "%";
    conditions.push("(i.name LIKE ? OR i.email LIKE ? OR i.message LIKE ?)");
    values.push(pattern, pattern, pattern);
  }
  return { where: conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "", values };
}

// One page of messages for the admin, newest first, with how many replies each one has (a
// subquery), and how many messages match in total (for the page count).
export async function findAll(filters) {
  const { where, values } = buildWhere(filters);
  const offset = (filters.page - 1) * filters.limit;

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM inquiries i ${where}`, values);
  const [rows] = await db.execute(
    `SELECT i.inquiry_id, i.user_id, i.name, i.email, i.topic, i.status, i.created_at,
            LEFT(i.message, 140) AS preview,
            (SELECT COUNT(*) FROM inquiry_replies r WHERE r.inquiry_id = i.inquiry_id) AS reply_count
     FROM inquiries i
     ${where}
     ORDER BY i.created_at DESC, i.inquiry_id DESC
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset]
  );
  return { rows: rows, total: countRows[0].total };
}

// One message with its replies and the first name of the admin who wrote each reply (LEFT JOIN:
// a reply stays when its admin account is deleted). undefined when there is no such message.
export async function findById(inquiryId) {
  const [rows] = await db.execute(
    `SELECT inquiry_id, user_id, name, email, phone, topic, message, status, created_at
     FROM inquiries
     WHERE inquiry_id = ?`,
    [inquiryId]
  );
  if (rows.length === 0) return undefined;
  const [replies] = await db.execute(
    `SELECT r.reply_id, r.message, r.created_at, a.first_name AS admin_first_name
     FROM inquiry_replies r
     LEFT JOIN users a ON a.user_id = r.admin_id
     WHERE r.inquiry_id = ?
     ORDER BY r.created_at, r.reply_id`,
    [inquiryId]
  );
  return { ...rows[0], replies: replies };
}

// Saves an admin's reply and marks the message "answered". The two changes are one TRANSACTION:
// both are saved, or (after an error) neither, so a message is never "answered" without a reply.
// A transaction needs one connection for all its queries, so it takes one from the pool.
export async function addReply(inquiryId, adminId, message) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      "INSERT INTO inquiry_replies (inquiry_id, admin_id, message) VALUES (?, ?, ?)",
      [inquiryId, adminId, message]
    );
    await connection.execute("UPDATE inquiries SET status = 'answered' WHERE inquiry_id = ?", [inquiryId]);
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // Back to the pool, also after an error.
  }
}

export async function setStatus(inquiryId, status) {
  const [result] = await db.execute("UPDATE inquiries SET status = ? WHERE inquiry_id = ?", [status, inquiryId]);
  return result.affectedRows > 0;
}

// Deletes a message; its replies go with it (ON DELETE CASCADE).
export async function deleteById(inquiryId) {
  const [result] = await db.execute("DELETE FROM inquiries WHERE inquiry_id = ?", [inquiryId]);
  return result.affectedRows > 0;
}
