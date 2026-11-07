// MODEL: the totals for the admin dashboard. It only reads, from several tables at once.
import db from "../utils/database.js";

export async function getDashboardTotals() {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'customer')  AS customers,
      (SELECT COUNT(*) FROM accommodations)                 AS accommodations,
      (SELECT COUNT(*) FROM bookings)                       AS bookings,
      (SELECT COUNT(*) FROM tickets)                        AS tickets,
      (SELECT COUNT(*) FROM inquiries WHERE status = 'new') AS newInquiries
  `);
  return rows[0];
}
