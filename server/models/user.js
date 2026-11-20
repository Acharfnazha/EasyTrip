// MODEL: the only file that talks to the "users" table.
// Every query uses ? placeholders, so user input is sent as data and never becomes SQL code.
import db, { escapeLike } from "../utils/database.js";

// The user without the password hash. Used for "who is logged in" and the private routes.
export async function findById(userId) {
  const [rows] = await db.execute(
    `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.credit, u.created_at,
            d.status AS id_status,
            (d.status = 'verified' AND (d.expiry_date IS NULL OR d.expiry_date >= CURDATE())) AS id_verified
     FROM users u
     LEFT JOIN id_documents d ON d.user_id = u.user_id
     WHERE u.user_id = ?`,
    [userId]
  );
  return rows[0];
}

// The user with the password hash. Only login uses it, to compare the password.
export async function findByEmailWithPassword(email) {
  const [rows] = await db.execute(
    "SELECT user_id, first_name, last_name, email, role, credit, created_at, password_hash FROM users WHERE email = ?",
    [email]
  );
  return rows[0];
}

// The user with this email, without the password hash. "Continue with Google" uses it.
export async function findByEmail(email) {
  const [rows] = await db.execute(
    "SELECT user_id, first_name, last_name, email, role, credit, created_at FROM users WHERE email = ?",
    [email]
  );
  return rows[0];
}

// Every customer's name and email (not admins), by name. The admin's discount form suggests them.
export async function findCustomersShort() {
  const [rows] = await db.execute(
    `SELECT user_id, first_name, last_name, email
     FROM users
     WHERE role = 'customer'
     ORDER BY first_name, last_name
     LIMIT 2000`
  );
  return rows;
}

export async function emailExists(email) {
  const [rows] = await db.execute("SELECT user_id FROM users WHERE email = ?", [email]);
  return rows.length > 0;
}

// The role isn't in the INSERT, so a new account always gets the database default: customer.
// Returns the id of the new user.
export async function create(firstName, lastName, email, passwordHash) {
  const [result] = await db.execute(
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)",
    [firstName, lastName, email, passwordHash]
  );
  return result.insertId;
}

// An account made by "Continue with Google". It has no password (password_hash is NULL), so it
// can only log in through Google. Returns the id of the new user.
export async function createFromGoogle(firstName, lastName, email) {
  const [result] = await db.execute(
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, NULL)",
    [firstName, lastName, email]
  );
  return result.insertId;
}

// One page of accounts for the admin, newest first, with each user's credit and how many
// bookings they have (a subquery), and how many accounts match in total (for the page count).
// The search looks in the names and the email.
export async function findAllForAdmin(filters) {
  const values = [];
  let where = "";
  if (filters.search) {
    const pattern = "%" + escapeLike(filters.search) + "%";
    where = "WHERE (CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ?)";
    values.push(pattern, pattern);
  }
  const offset = (filters.page - 1) * filters.limit;

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM users u ${where}`, values);
  const [rows] = await db.execute(
    `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.credit, u.created_at,
            (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.user_id) AS booking_count,
            (SELECT COUNT(*) FROM tickets k WHERE k.user_id = u.user_id) AS ticket_count,
            d.status AS id_status
     FROM users u
     LEFT JOIN id_documents d ON d.user_id = u.user_id
     ${where}
     ORDER BY u.created_at DESC, u.user_id DESC
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset]
  );
  return { rows: rows, total: countRows[0].total };
}

// A new password (its bcrypt hash). An account made with Google gets its first password this way.
export async function updatePassword(userId, passwordHash) {
  await db.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [passwordHash, userId]);
}

// The admin changes a role. Returns true when the account exists.
export async function setRole(userId, role) {
  const [result] = await db.execute("UPDATE users SET role = ? WHERE user_id = ?", [role, userId]);
  return result.affectedRows > 0;
}

// Deletes an account. The database deletes its bookings, tickets, credit history and identity
// document with it (ON DELETE CASCADE), and keeps its contact messages without the account
// (SET NULL). Returns true when there was one.
export async function deleteById(userId) {
  const [result] = await db.execute("DELETE FROM users WHERE user_id = ?", [userId]);
  return result.affectedRows > 0;
}

// Ends the user's sessions in every browser, except keepSessionId (the one making the change,
// or "" for none). A session is a row of the "sessions" table, whose data is JSON like
// {"cookie":{...},"userId":7}. Used after a password reset and when an account is deleted.
export async function endSessions(userId, keepSessionId) {
  await db.execute(
    `DELETE FROM sessions
     WHERE session_id <> ? AND JSON_VALID(data) AND JSON_EXTRACT(data, '$.userId') = ?`,
    [keepSessionId || "", userId]
  );
}
