// Register, log in, log out, and check who is logged in. This follows flow 2 in docs/app-flow.
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const db = require('../db');
const { COOKIE_NAME, getLoggedInUser } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = 10;
const SESSION_HOURS = 2;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cookieOptions = {
  httpOnly: true, // JavaScript in the page can't read the token.
  sameSite: 'lax', // Other websites can't send POST requests with this cookie.
  secure: process.env.NODE_ENV === 'production', // Only over HTTPS on a real server.
};

// Slows down password guessing: 20 failed attempts per visitor every 15 minutes.
const attemptLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

// Reads a text field from the request. Anything that isn't text counts as empty.
function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Passwords are not trimmed, because a space can be part of a password.
function readPassword(value) {
  return typeof value === 'string' ? value : '';
}

// Only these fields are sent to the browser. The password hash never is.
function publicUser(user) {
  return {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

// The same rules as js/auth.js, because the checks in the browser can be skipped.
function checkRegistration({ firstName, lastName, email, password }) {
  const errors = {};

  if (!firstName) errors.firstName = 'Enter your first name.';
  else if (firstName.length > 50) errors.firstName = 'Your first name must be 50 characters or fewer.';

  if (!lastName) errors.lastName = 'Enter your last name.';
  else if (lastName.length > 50) errors.lastName = 'Your last name must be 50 characters or fewer.';

  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > 190 || !EMAIL_FORMAT.test(email)) {
    errors.email = 'Enter an email address in the format name@example.com.';
  }

  if (!password) errors.password = 'Enter a password.';
  else if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = 'Use at least 8 characters, with a letter and a number.';
  } else if (Buffer.byteLength(password) > 72) {
    // bcrypt only uses the first 72 bytes of a password.
    errors.password = 'Your password is too long. Use 72 characters or fewer.';
  }

  return errors;
}

// POST /api/auth/register
router.post('/register', attemptLimit, async (req, res) => {
  const body = req.body || {};
  const firstName = readText(body.firstName);
  const lastName = readText(body.lastName);
  const email = readText(body.email).toLowerCase();
  const password = readPassword(body.password);

  const errors = checkRegistration({ firstName, lastName, email, password });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Please correct the highlighted fields.', fields: errors });
  }

  const emailTaken = {
    error: 'Please correct the highlighted fields.',
    fields: { email: 'This email is already registered. Log in instead.' },
  };

  const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return res.status(409).json(emailTaken);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // The role isn't sent, so a new account always gets the default role: customer.
  try {
    await db.execute(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash]
    );
  } catch (err) {
    // Two requests can pass the check above at the same time. The UNIQUE rule stops the second.
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json(emailTaken);
    }
    throw err;
  }

  res.status(201).json({ message: 'Your account was created. You can log in now.' });
});

// POST /api/auth/login
router.post('/login', attemptLimit, async (req, res) => {
  const body = req.body || {};
  const email = readText(body.email).toLowerCase();
  const password = readPassword(body.password);

  if (!email || !password) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  const [rows] = await db.execute(
    'SELECT user_id, first_name, last_name, email, password_hash, role, created_at FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];
  const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));

  // The same message for both cases, so nobody can use it to find registered emails.
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${SESSION_HOURS}h`,
  });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_HOURS * 60 * 60 * 1000 });
  res.json({ user: publicUser(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ message: 'You are logged out.' });
});

// GET /api/auth/me: the logged-in user, or null for a visitor.
router.get('/me', async (req, res) => {
  const user = await getLoggedInUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

module.exports = router;
