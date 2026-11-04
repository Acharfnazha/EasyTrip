// Checks the login token on each request and protects the private routes.
const jwt = require('jsonwebtoken');
const db = require('../db');

const COOKIE_NAME = 'easytrip_token';

// Returns the logged-in user from the database, or null if there isn't a valid session.
async function getLoggedInUser(req) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null; // The token was changed or has expired.
  }

  const [rows] = await db.execute(
    'SELECT user_id, first_name, last_name, email, role, created_at FROM users WHERE user_id = ?',
    [payload.userId]
  );
  const user = rows[0];

  // If the account was deleted or its role changed, the old token stops working.
  if (!user || user.role !== payload.role) return null;
  return user;
}

async function requireLogin(req, res, next) {
  const user = await getLoggedInUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  req.user = user;
  next();
}

// Use this after requireLogin.
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can do this.' });
  }
  next();
}

module.exports = { COOKIE_NAME, getLoggedInUser, requireLogin, requireAdmin };
