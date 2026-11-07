// CONTROLLER for the admin dashboard. The admin routes are protected by isAuth and isAdmin
// (server/routes/admin.js), so every function here already has a logged-in admin.
import * as Stats from "../models/stats.js";

// GET /api/admin/stats: the main totals for the dashboard.
export async function getStats(req, res) {
  const totals = await Stats.getDashboardTotals();
  res.json(totals);
}
