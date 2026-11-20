// MODEL: the only file that talks to the "id_documents" table. Each user has at most one row.
// It holds the details read or typed from the document, and the admin's review of them
// (status: unverified, pending, verified or rejected).
import db, { escapeLike } from "../utils/database.js";

// The details, as YYYY-MM-DD text for the dates (DATE_FORMAT), so no time zone can move them by
// a day. found_on_photo (a SET) comes back as text, like "surname,date_of_birth", or NULL.
const COLUMNS = `
  d.user_id, d.document_type, d.surname, d.given_names, d.document_number, d.issuing_country,
  d.nationality,
  DATE_FORMAT(d.date_of_birth, '%Y-%m-%d') AS date_of_birth,
  DATE_FORMAT(d.expiry_date, '%Y-%m-%d') AS expiry_date,
  d.read_method, d.same_as_read, d.check_digits_valid, d.found_on_photo,
  d.status, d.selfie_file, d.liveness_steps, d.submitted_at, d.reviewed_at, d.review_note, d.updated_at`;

// The user's saved document, or undefined.
export async function findByUserId(userId) {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM id_documents d WHERE d.user_id = ?`, [userId]);
  return rows[0];
}

// Saves the document. A user who already has one gets it replaced (ON DUPLICATE KEY UPDATE uses
// the UNIQUE key on user_id), so there is never more than one document per user.
// "AS new" names the new row, so the UPDATE part can use its values (MySQL 8.0.19 and newer).
// checks: { readMethod, sameAsRead, checkDigitsValid, foundOnPhoto } (see the table's comments).
// New details have not been reviewed, so the review starts again: status "unverified", and no
// selfie (the caller deletes the old selfie's file).
export async function save(userId, documentType, details, checks) {
  await db.execute(
    `INSERT INTO id_documents
       (user_id, document_type, surname, given_names, document_number, issuing_country, nationality,
        date_of_birth, expiry_date, read_method, same_as_read, check_digits_valid, found_on_photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) AS new
     ON DUPLICATE KEY UPDATE
       document_type = new.document_type, surname = new.surname, given_names = new.given_names,
       document_number = new.document_number, issuing_country = new.issuing_country,
       nationality = new.nationality, date_of_birth = new.date_of_birth,
       expiry_date = new.expiry_date, read_method = new.read_method,
       same_as_read = new.same_as_read, check_digits_valid = new.check_digits_valid,
       found_on_photo = new.found_on_photo,
       status = 'unverified', selfie_file = NULL, liveness_steps = NULL, submitted_at = NULL,
       reviewed_by = NULL, reviewed_at = NULL, review_note = NULL`,
    [
      userId, documentType, details.surname, details.givenNames, details.documentNumber,
      details.issuingCountry, details.nationality || null, details.dateOfBirth, details.expiryDate || null,
      checks.readMethod, checks.sameAsRead, checks.checkDigitsValid,
      checks.foundOnPhoto === null ? null : checks.foundOnPhoto.join(","),
    ]
  );
}

export async function deleteByUserId(userId) {
  const [result] = await db.execute("DELETE FROM id_documents WHERE user_id = ?", [userId]);
  return result.affectedRows > 0;
}

// ---------- The review ----------

// The user sent a selfie: the document waits for an admin. Returns false when the user has no
// document, or when it is already verified (a verified document is not sent again).
// livenessSteps: the movements the camera check captured, like ["straight", "left"], or [].
export async function submitSelfie(userId, selfieFile, livenessSteps) {
  const [result] = await db.execute(
    `UPDATE id_documents
     SET status = 'pending', selfie_file = ?, liveness_steps = ?, submitted_at = NOW(),
         reviewed_by = NULL, reviewed_at = NULL, review_note = NULL
     WHERE user_id = ? AND status <> 'verified'`,
    [selfieFile, livenessSteps.length > 0 ? livenessSteps.join(",") : null, userId]
  );
  return result.affectedRows > 0;
}

// An admin approves ("verified") or refuses ("rejected") a pending document. The selfie is no
// longer needed, so its name is cleared (the caller deletes the file). Only a pending document
// can be decided: two admins deciding at the same moment can't both change it.
// Returns true when it was changed.
export async function decide(userId, status, adminId, note) {
  const [result] = await db.execute(
    `UPDATE id_documents
     SET status = ?, selfie_file = NULL, liveness_steps = NULL, reviewed_by = ?, reviewed_at = NOW(), review_note = ?
     WHERE user_id = ? AND status = 'pending'`,
    [status, adminId, note || null, userId]
  );
  return result.affectedRows > 0;
}

// true when the user can book: their document is verified and hasn't expired.
export async function isVerified(userId) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM id_documents
     WHERE user_id = ? AND status = 'verified' AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
    [userId]
  );
  return rows[0].total > 0;
}

// ---------- For the admin ----------

// One page of documents for the admin's list, with the user's name and email: the oldest
// waiting ones first (they have waited longest), and how many match in total.
export async function findAllForAdmin(filters) {
  const conditions = [];
  const values = [];
  if (filters.status) {
    conditions.push("d.status = ?");
    values.push(filters.status);
  }
  if (filters.search) {
    const pattern = "%" + escapeLike(filters.search) + "%";
    conditions.push("(CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ? OR d.surname LIKE ?)");
    values.push(pattern, pattern, pattern);
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const offset = (filters.page - 1) * filters.limit;

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM id_documents d JOIN users u ON u.user_id = d.user_id ${where}`,
    values
  );
  const [rows] = await db.execute(
    `SELECT ${COLUMNS}, u.first_name, u.last_name, u.email
     FROM id_documents d
     JOIN users u ON u.user_id = d.user_id
     ${where}
     ORDER BY d.status = 'pending' DESC, COALESCE(d.submitted_at, d.updated_at), d.user_id
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset]
  );
  return { rows: rows, total: countRows[0].total };
}

// One document with its user, for the admin's review, or undefined.
export async function findOneForAdmin(userId) {
  const [rows] = await db.execute(
    `SELECT ${COLUMNS}, u.first_name, u.last_name, u.email, r.first_name AS reviewer_first_name
     FROM id_documents d
     JOIN users u ON u.user_id = d.user_id
     LEFT JOIN users r ON r.user_id = d.reviewed_by
     WHERE d.user_id = ?`,
    [userId]
  );
  return rows[0];
}

// How many documents wait for a review (the number on the admin's menu).
export async function countPending() {
  const [rows] = await db.execute("SELECT COUNT(*) AS total FROM id_documents WHERE status = 'pending'");
  return rows[0].total;
}
