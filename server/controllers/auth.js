// CONTROLLER for accounts: register, log in, log out, and "who is logged in".
// It reads the request, checks it with the validator, asks the user model, and answers in JSON.
// It never writes SQL: that is the model's job.
import bcrypt from "bcryptjs";
import * as User from "../models/user.js";
import { checkRegistration, checkLogin } from "../validators/auth.js";
import { hasErrors } from "../validators/common.js";

// How much work bcrypt does to hash a password: more is slower to guess (12, like the course).
const BCRYPT_ROUNDS = 12;

// The name of the session ID cookie (the express-session default).
const SESSION_COOKIE = "connect.sid";

// Only these fields are sent to the browser. The password hash never is.
export function publicUser(user) {
  return {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

// POST /api/auth/register
export async function register(req, res) {
  const { data, errors } = checkRegistration(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  const emailTaken = {
    error: "Please correct the highlighted fields.",
    fields: { email: "This email is already registered. Log in instead." },
  };
  if (await User.emailExists(data.email)) {
    return res.status(409).json(emailTaken);
  }

  // Never save the real password: save its bcrypt hash, which can't be turned back.
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  try {
    await User.create(data.firstName, data.lastName, data.email, passwordHash);
  } catch (error) {
    // Two requests can pass the check above at the same time. The UNIQUE rule stops the second.
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json(emailTaken);
    }
    throw error;
  }

  res.status(201).json({ message: "Your account was created. You can log in now." });
}

// POST /api/auth/login
export async function login(req, res, next) {
  const { data, errors } = checkLogin(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Enter your email and password.", fields: errors });
  }

  const user = await User.findByEmailWithPassword(data.email);
  const passwordMatches = user && (await bcrypt.compare(data.password, user.password_hash));

  // The same message for both cases, so nobody can use it to find registered emails.
  if (!passwordMatches) {
    return res.status(401).json({ error: "Wrong email or password." });
  }

  // Give the browser a new session ID at login. An ID that someone planted before the
  // login (session fixation) then stops working.
  req.session.regenerate((error) => {
    if (error) return next(error);

    // The session only keeps the user's id. The rest is read from the database on each request.
    req.session.userId = user.user_id;

    // save() writes the session into MySQL before we answer, so the next page already sees it.
    req.session.save((error) => {
      if (error) return next(error);
      res.json({ user: publicUser(user) });
    });
  });
}

// POST /api/auth/logout
export function logout(req, res, next) {
  // destroy() deletes the session row in MySQL, so the old session ID can't be used again.
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie(SESSION_COOKIE);
    res.json({ message: "You are logged out." });
  });
}

// GET /api/auth/me: the logged-in user, or null for a visitor.
export async function getMe(req, res) {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const user = await User.findById(req.session.userId);
  res.json({ user: user ? publicUser(user) : null });
}
