// MODEL: the figures for the admin dashboard. It only reads, from several tables at once.
import db from "../utils/database.js";

// The totals at the top of the dashboard.
export async function getDashboardTotals() {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'customer')  AS customers,
      (SELECT COUNT(*) FROM accommodations)                 AS accommodations,
      (SELECT COUNT(*) FROM bookings)                       AS bookings,
      (SELECT COUNT(*) FROM tickets)                        AS tickets,
      (SELECT COUNT(*) FROM inquiries WHERE status = 'new') AS newInquiries,
      (SELECT COUNT(*) FROM id_documents WHERE status = 'pending') AS pendingVerifications
  `);
  return rows[0];
}

// How many hotels and how many chalets: [{ type: "hotel", total: 27 }, ...]
export async function countStaysByType() {
  const [rows] = await db.query("SELECT type, COUNT(*) AS total FROM accommodations GROUP BY type");
  return rows;
}

// The countries with the most stays, biggest first. The country comes from the destination,
// so this needs a JOIN.
export async function countStaysByCountry(limit) {
  const [rows] = await db.query(
    `SELECT d.country, COUNT(*) AS total
     FROM accommodations a
     JOIN destinations d ON d.dest_id = a.dest_id
     GROUP BY d.country
     ORDER BY total DESC, d.country
     LIMIT ?`,
    [limit]
  );
  return rows;
}

// How many contact messages have each status: [{ status: "new", total: 2 }, ...]
export async function countInquiriesByStatus() {
  const [rows] = await db.query("SELECT status, COUNT(*) AS total FROM inquiries GROUP BY status");
  return rows;
}

// How many bookings have each status.
export async function countBookingsByStatus() {
  const [rows] = await db.query("SELECT status, COUNT(*) AS total FROM bookings GROUP BY status");
  return rows;
}

// The newest accounts. The password hash is not selected.
export async function findLatestUsers(limit) {
  const [rows] = await db.query(
    `SELECT user_id, first_name, last_name, email, role, created_at
     FROM users
     ORDER BY created_at DESC, user_id DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

// The newest contact messages, without their text.
export async function findLatestInquiries(limit) {
  const [rows] = await db.query(
    `SELECT inquiry_id, name, topic, status, created_at
     FROM inquiries
     ORDER BY created_at DESC, inquiry_id DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}
