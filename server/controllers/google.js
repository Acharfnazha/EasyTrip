// CONTROLLER for "Continue with Google". These two routes are opened by the browser itself (a
// link, then Google sending the browser back), not by fetch, so they answer with redirects.
// When something goes wrong, the browser goes back to the login page with ?google=reason, and
// the page shows the message (public/js/login-code.js).
import crypto from "crypto";
import * as User from "../models/user.js";
import { EMAIL_FORMAT } from "../validators/common.js";
import { googleIsSetUp, googleLoginUrl, readGoogleProfile } from "../utils/google.js";
import { startCodeStep } from "./auth.js";

function backToLogin(res, reason) {
  res.redirect("/login.html?google=" + reason);
}

// The names Google gives, cut to the size of the columns. Some Google accounts have no last
// name, and a few have no first name: the part of the email before the @ is used then.
function namesFrom(profile, email) {
  const text = (value) => (typeof value === "string" ? value.trim().slice(0, 50) : "");
  return {
    firstName: text(profile.given_name) || text(profile.name) || email.split("@")[0].slice(0, 50),
    lastName: text(profile.family_name),
  };
}

// GET /api/auth/google: sends the browser to Google's "choose an account" page.
export function start(req, res, next) {
  if (!googleIsSetUp) {
    return backToLogin(res, "not-set-up");
  }
  // state is a random text kept in the session. Google gives it back unchanged, so the callback
  // can check that the answer belongs to the login this browser started (and not to a link
  // someone else made).
  const state = crypto.randomBytes(16).toString("hex");
  req.session.googleState = state;
  req.session.save((error) => {
    if (error) return next(error);
    res.redirect(googleLoginUrl(state));
  });
}

// GET /api/auth/google/callback: Google sends the browser back here with ?code=...&state=...
export async function callback(req, res) {
  const expectedState = req.session.googleState;
  delete req.session.googleState;

  if (!googleIsSetUp) {
    return backToLogin(res, "not-set-up");
  }
  if (req.query.error) {
    return backToLogin(res, "cancelled"); // The user pressed "Cancel" on Google's page.
  }
  if (!expectedState || req.query.state !== expectedState || typeof req.query.code !== "string") {
    // No state in the session usually means the login was started on another address (for
    // example 127.0.0.1 instead of localhost), so the browser didn't send the same cookie back.
    console.error(
      expectedState
        ? "Google sign-in stopped: the answer did not match the login this browser started."
        : "Google sign-in stopped: this browser has no login waiting. Open the site with the same address as the redirect URI."
    );
    return backToLogin(res, "failed");
  }

  let profile;
  try {
    profile = await readGoogleProfile(req.query.code);
  } catch (error) {
    console.error(`Google sign-in failed (${error.code || error.message}).`);
    profile = null;
  }
  if (!profile || typeof profile.email !== "string") {
    return backToLogin(res, "failed");
  }

  // Only an address that Google has checked counts: the account is found by its email.
  const email = profile.email.trim().toLowerCase();
  if (profile.email_verified !== true || email.length > 190 || !EMAIL_FORMAT.test(email)) {
    return backToLogin(res, "unverified");
  }

  // The same email as an account made with a password is the same account. A new email makes
  // a new customer account, without a password.
  let user = await User.findByEmail(email);
  if (!user) {
    const names = namesFrom(profile, email);
    try {
      await User.createFromGoogle(names.firstName, names.lastName, email);
    } catch (error) {
      if (error.code !== "ER_DUP_ENTRY") throw error; // Made by another request a moment ago: use it.
    }
    user = await User.findByEmail(email);
  }

  // Like a password login, the last step is the code sent to the user's email.
  const step = await startCodeStep(req, user);
  if (!step) {
    return backToLogin(res, "code-not-sent");
  }
  res.redirect("/login.html?step=code");
}
