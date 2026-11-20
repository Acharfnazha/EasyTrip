// Helpers for the login code (the 6-digit code emailed at each login). They only make and
// compare codes: the rules of the login are in controllers/auth.js.
import crypto from "crypto";
import config from "../config.js";

export const CODE_MINUTES = 10; // How long a code works.
export const MAX_WRONG_CODES = 5; // After this many wrong codes, the user logs in again.
export const MAX_CODES_SENT = 5; // Codes sent for one login, the first one included.
export const RESEND_WAIT_SECONDS = 60; // The wait before "Send a new code" works again.

// Six random digits, like "042917". crypto.randomInt can't be predicted (Math.random can).
export function createCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// The session never keeps the code itself, only this fingerprint (an HMAC with SESSION_SECRET).
// Someone who reads the sessions table can't turn it back into the code.
export function fingerprint(code) {
  return crypto.createHmac("sha256", config.sessionSecret).update("login-code:" + code).digest("hex");
}

// Compares two fingerprints in constant time, so the answer's speed tells nothing about the code.
export function sameFingerprint(first, second) {
  const a = Buffer.from(String(first));
  const b = Buffer.from(String(second));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// "lara.haddad@example.com" becomes "la*********@example.com": enough to recognise the address
// on the page, without showing all of it.
export function maskEmail(email) {
  const at = email.lastIndexOf("@");
  const name = email.slice(0, at);
  const shown = name.slice(0, Math.min(2, Math.max(name.length - 1, 1)));
  return shown + "*".repeat(Math.max(name.length - shown.length, 1)) + email.slice(at);
}
