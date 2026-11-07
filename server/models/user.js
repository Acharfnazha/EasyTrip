// MODEL: the only file that talks to the "users" table.
// Every query uses ? placeholders, so user input is sent as data and never becomes SQL code.
import db from "../utils/database.js";

// The user without the password hash. Used for "who is logged in" and the private routes.
export async function findById(userId) {
  const [rows] = await db.execute(
    "SELECT user_id, first_name, last_name, email, role, created_at FROM users WHERE user_id = ?",
    [userId]
  );
  return rows[0];
}

// The user with the password hash. Only login uses it, to compare the password.
export async function findByEmailWithPassword(email) {
  const [rows] = await db.execute(
    "SELECT user_id, first_name, last_name, email, role, created_at, password_hash FROM users WHERE email = ?",
    [email]
  );
  return rows[0];
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
