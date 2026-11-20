// CONTROLLER for accounts: register, log in (password, then the emailed code), log out, and
// "who is logged in".
// It reads the request, checks it with the validator, asks the user model, and answers in JSON.
// It never writes SQL: that is the model's job.
import bcrypt from "bcryptjs";
import config from "../config.js";
import * as User from "../models/user.js";
import {
  checkRegistration, checkLogin, readLoginCode, checkNewPassword, readEmail, readPasswordField,
} from "../validators/auth.js";
import { hasErrors } from "../validators/common.js";
import { emailIsSetUp, canGetEmail, sendCode } from "../utils/mailer.js";
import {
  CODE_MINUTES, MAX_WRONG_CODES, MAX_CODES_SENT, RESEND_WAIT_SECONDS,
  createCode, fingerprint, sameFingerprint, maskEmail,
} from "../utils/login-code.js";

// How much work bcrypt does to hash a password: more is slower to guess (12, like the course).
const BCRYPT_ROUNDS = 12;

// The name of the session ID cookie (the express-session default).
const SESSION_COOKIE = "connect.sid";

const CODE_NOT_SENT = "We couldn't send your code by email. Please try again in a moment.";
const LOG_IN_AGAIN = "Log in again to get a new code.";

// Only these fields are sent to the browser. The password hash never is.
export function publicUser(user) {
  return {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    credit: Number(user.credit), // MySQL sends DECIMAL as text ("200.00")
    // The identity check: null (no document), unverified, pending, verified or rejected.
    idStatus: user.id_status === undefined ? null : user.id_status,
    idVerified: Boolean(user.id_verified),
    // Whether booking and buying need a verified identity (REQUIRE_VERIFIED_ID in .env).
    verificationRequired: config.requireVerifiedId,
    createdAt: user.created_at,
  };
}

// express-session uses callbacks. These two turn them into promises, so the code below can
// use await like everywhere else.
function newSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
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

// ---------- The login code (step 2 of every login) ----------

// Gives the code to the user. Returns false when the email could not be sent.
// On a computer used for development (NODE_ENV isn't "production") the code is also printed in
// the server's terminal: the test accounts use @example.com addresses, which can't get email,
// and the site still works before the Gmail settings are filled in.
async function deliverCode(user, code, purpose = "login") {
  if (!config.isProduction) {
    console.log(`${purpose === "reset" ? "Password reset code" : "Login code"} for ${user.email}: ${code}`);
  }
  // No email while it isn't set up, and none to a test address like lara@example.com (it
  // would only come back as "address not found"). The terminal's line above is enough then.
  if (!emailIsSetUp || !canGetEmail(user.email)) {
    return !config.isProduction;
  }
  try {
    await sendCode(user, code, CODE_MINUTES, purpose);
    return true;
  } catch (error) {
    console.error(`The login code email could not be sent (${error.code || error.message}).`);
    return false;
  }
}

// What the login page needs to show the code step. It never includes the code.
function codeStep(pending) {
  const waited = Math.floor((Date.now() - pending.sentAt) / 1000);
  return {
    email: pending.email,
    sentByEmail: pending.sentByEmail,
    resendIn: Math.max(RESEND_WAIT_SECONDS - waited, 0),
  };
}

// Starts the code step for a user whose password (or Google account) was just accepted: makes
// a code, sends it, and remembers its fingerprint in the session. The user is NOT logged in
// yet: the session has "pendingLogin", not "userId", so the private routes still refuse it.
// Returns what the page needs, or null when the code could not be sent.
export async function startCodeStep(req, user) {
  // A new session ID at each login. An ID that someone planted before the login (session
  // fixation) then stops working.
  await newSession(req);

  const code = createCode();
  if (!(await deliverCode(user, code))) return null;

  req.session.pendingLogin = {
    userId: user.user_id,
    email: maskEmail(user.email),
    sentByEmail: emailIsSetUp && canGetEmail(user.email),
    codeHash: fingerprint(code),
    expiresAt: Date.now() + CODE_MINUTES * 60 * 1000,
    wrongCodes: 0,
    codesSent: 1,
    sentAt: Date.now(),
  };
  // save() writes the session into MySQL before we answer, so the next request already sees it.
  await saveSession(req);
  return codeStep(req.session.pendingLogin);
}

// POST /api/auth/login: step 1, the email and password. The answer isn't the user yet: it says
// that a code was sent, and the page asks for it.
export async function login(req, res) {
  const { data, errors } = checkLogin(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Enter your email and password.", fields: errors });
  }

  const user = await User.findByEmailWithPassword(data.email);
  // An account made with Google has no password, so it can't log in with one.
  const passwordMatches =
    user && user.password_hash && (await bcrypt.compare(data.password, user.password_hash));

  // The same message for both cases, so nobody can use it to find registered emails.
  if (!passwordMatches) {
    return res.status(401).json({ error: "Wrong email or password." });
  }

  const step = await startCodeStep(req, user);
  if (!step) {
    return res.status(502).json({ error: CODE_NOT_SENT });
  }
  res.json({ needsCode: true, ...step });
}

// GET /api/auth/pending-code: is this browser in the middle of a login, waiting for its code?
// The login page asks when it opens (after a reload, or when Google sends the browser back).
export function getPendingCode(req, res) {
  const pending = req.session.pendingLogin;
  res.json({ pending: pending ? codeStep(pending) : null });
}

// POST /api/auth/verify-code: step 2, the code from the email. Only now is the user logged in.
export async function verifyCode(req, res) {
  const pending = req.session.pendingLogin;
  if (!pending) {
    return res.status(401).json({ error: LOG_IN_AGAIN, restart: true });
  }

  const code = readLoginCode(req.body || {});
  if (!code) {
    return res.status(400).json({
      error: "Please correct the code.",
      fields: { code: "Enter the 6-digit code from the email." },
    });
  }

  if (Date.now() > pending.expiresAt) {
    return res.status(401).json({
      error: "Please correct the code.",
      fields: { code: 'This code has expired. Choose "Send a new code".' },
    });
  }

  if (!sameFingerprint(fingerprint(code), pending.codeHash)) {
    pending.wrongCodes += 1;
    // A 6-digit code has a million values. With 5 tries, guessing it is not realistic.
    if (pending.wrongCodes >= MAX_WRONG_CODES) {
      delete req.session.pendingLogin;
      return res.status(401).json({ error: "Too many wrong codes. " + LOG_IN_AGAIN, restart: true });
    }
    const left = MAX_WRONG_CODES - pending.wrongCodes;
    return res.status(401).json({
      error: "Please correct the code.",
      fields: { code: `That code isn't right. You have ${left} more ${left === 1 ? "try" : "tries"}.` },
    });
  }

  const user = await User.findById(pending.userId);
  if (!user) {
    // The account was deleted between the two steps.
    delete req.session.pendingLogin;
    return res.status(401).json({ error: LOG_IN_AGAIN, restart: true });
  }

  // The code is right: a fresh session that only keeps the user's id. The rest is read from
  // the database on each request.
  await newSession(req);
  req.session.userId = user.user_id;
  await saveSession(req);
  res.json({ user: publicUser(user) });
}

// POST /api/auth/resend-code: a new code for the same login. The old code stops working.
export async function resendCode(req, res) {
  const pending = req.session.pendingLogin;
  if (!pending) {
    return res.status(401).json({ error: LOG_IN_AGAIN, restart: true });
  }

  const step = codeStep(pending);
  if (step.resendIn > 0) {
    return res.status(429).json({
      error: `Please wait ${step.resendIn} seconds before asking for a new code.`,
      resendIn: step.resendIn,
    });
  }
  if (pending.codesSent >= MAX_CODES_SENT) {
    delete req.session.pendingLogin;
    return res.status(429).json({ error: "Too many codes were sent. " + LOG_IN_AGAIN, restart: true });
  }

  const user = await User.findById(pending.userId);
  if (!user) {
    delete req.session.pendingLogin;
    return res.status(401).json({ error: LOG_IN_AGAIN, restart: true });
  }

  const code = createCode();
  if (!(await deliverCode(user, code))) {
    return res.status(502).json({ error: CODE_NOT_SENT });
  }
  pending.codeHash = fingerprint(code);
  pending.expiresAt = Date.now() + CODE_MINUTES * 60 * 1000;
  pending.wrongCodes = 0;
  pending.codesSent += 1;
  pending.sentAt = Date.now();
  res.json({ message: "We sent you a new code.", ...codeStep(pending) });
}

// ---------- Forgot password: a code by email, then a new password ----------
// The same rules as the login code (10 minutes, 5 wrong tries, a new code after 60 seconds, 5
// codes at most). The session keeps "passwordReset", with only the code's fingerprint.

const RESET_DONE_MESSAGE = "If an account uses this email, we sent it a code.";

// POST /api/auth/forgot-password  (JSON: email)
// The answer is the same whether the email has an account or not, so nobody can use this form
// to find out who has an account. Without an account, the session still waits for a code, but
// none can ever match.
export async function forgotPassword(req, res) {
  const email = readEmail(req.body || {});
  if (!email) {
    return res.status(400).json({
      error: "Please correct the highlighted fields.",
      fields: { email: "Enter an email address in the format name@example.com." },
    });
  }

  await newSession(req);
  const user = await User.findByEmail(email);
  const code = createCode();
  if (user && !(await deliverCode(user, code, "reset"))) {
    return res.status(502).json({ error: CODE_NOT_SENT });
  }

  req.session.passwordReset = {
    userId: user ? user.user_id : null,
    email: maskEmail(email),
    sentByEmail: emailIsSetUp && canGetEmail(email),
    // No account: the fingerprint of a random text that no 6-digit code can match.
    codeHash: user ? fingerprint(code) : fingerprint("no-account-" + createCode() + Date.now()),
    expiresAt: Date.now() + CODE_MINUTES * 60 * 1000,
    wrongCodes: 0,
    codesSent: 1,
    sentAt: Date.now(),
  };
  await saveSession(req);
  res.json({ message: RESET_DONE_MESSAGE, ...codeStep(req.session.passwordReset) });
}

// POST /api/auth/forgot-password/resend
export async function resendResetCode(req, res) {
  const pending = req.session.passwordReset;
  if (!pending) {
    return res.status(401).json({ error: "Enter your email again to get a new code.", restart: true });
  }
  const step = codeStep(pending);
  if (step.resendIn > 0) {
    return res.status(429).json({ error: `Please wait ${step.resendIn} seconds before asking for a new code.`, resendIn: step.resendIn });
  }
  if (pending.codesSent >= MAX_CODES_SENT) {
    delete req.session.passwordReset;
    return res.status(429).json({ error: "Too many codes were sent. Enter your email again later.", restart: true });
  }

  const user = pending.userId ? await User.findById(pending.userId) : null;
  const code = createCode();
  if (user) {
    if (!(await deliverCode(user, code, "reset"))) return res.status(502).json({ error: CODE_NOT_SENT });
    pending.codeHash = fingerprint(code);
  }
  pending.expiresAt = Date.now() + CODE_MINUTES * 60 * 1000;
  pending.wrongCodes = 0;
  pending.codesSent += 1;
  pending.sentAt = Date.now();
  res.json({ message: "We sent you a new code.", ...codeStep(pending) });
}

// GET /api/auth/forgot-password: is this browser in the middle of a reset (after a reload)?
export function getPendingReset(req, res) {
  const pending = req.session.passwordReset;
  res.json({ pending: pending ? codeStep(pending) : null });
}

// POST /api/auth/reset-password  (JSON: code, password)
// The right code proves the user owns the email, like the login code does, so the user is
// logged in with the new password, and logged out in every other browser.
export async function resetPassword(req, res) {
  const pending = req.session.passwordReset;
  if (!pending) {
    return res.status(401).json({ error: "Enter your email again to get a new code.", restart: true });
  }

  const body = req.body || {};
  const code = readLoginCode(body);
  const password = readPasswordField(body);
  const fields = {};
  if (!code) fields.code = "Enter the 6-digit code from the email.";
  const passwordProblem = checkNewPassword(password);
  if (passwordProblem) fields.password = passwordProblem;
  if (Object.keys(fields).length > 0) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: fields });
  }

  if (Date.now() > pending.expiresAt) {
    return res.status(401).json({
      error: "Please correct the code.",
      fields: { code: 'This code has expired. Choose "Send a new code".' },
    });
  }
  if (!sameFingerprint(fingerprint(code), pending.codeHash)) {
    pending.wrongCodes += 1;
    if (pending.wrongCodes >= MAX_WRONG_CODES) {
      delete req.session.passwordReset;
      return res.status(401).json({ error: "Too many wrong codes. Enter your email again to get a new code.", restart: true });
    }
    const left = MAX_WRONG_CODES - pending.wrongCodes;
    return res.status(401).json({
      error: "Please correct the code.",
      fields: { code: `That code isn't right. You have ${left} more ${left === 1 ? "try" : "tries"}.` },
    });
  }

  const user = await User.findById(pending.userId);
  if (!user) {
    delete req.session.passwordReset;
    return res.status(401).json({ error: "Enter your email again to get a new code.", restart: true });
  }

  await User.updatePassword(user.user_id, await bcrypt.hash(password, BCRYPT_ROUNDS));
  await newSession(req);
  req.session.userId = user.user_id;
  await saveSession(req);
  // Someone who knew the old password is logged out everywhere else.
  await User.endSessions(user.user_id, req.sessionID);

  res.json({ message: "Your new password is saved, and you are logged in.", user: publicUser(user) });
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
