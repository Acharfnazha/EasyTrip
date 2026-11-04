// Routes for the admin dashboard. Only a logged-in admin can use them.
const express = require('express');
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin, requireAdmin);

// GET /api/admin/stats: the main totals for the dashboard.
router.get('/stats', async (req, res) => {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'customer')  AS customers,
      (SELECT COUNT(*) FROM accommodations)                 AS accommodations,
      (SELECT COUNT(*) FROM bookings)                       AS bookings,
      (SELECT COUNT(*) FROM tickets)                        AS tickets,
      (SELECT COUNT(*) FROM inquiries WHERE status = 'new') AS newInquiries
  `);
  res.json(rows[0]);
});

module.exports = router;
