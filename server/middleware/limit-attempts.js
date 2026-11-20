// Slows down password guessing: 20 failed attempts per visitor every 15 minutes.
// Used on register and login. Successful attempts are not counted.
import { rateLimit } from "express-rate-limit";

export const limitAttempts = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

// Stops a visitor (or a script) from filling the admin's inbox: 5 messages every 15 minutes from
// the same visitor. A form with mistakes doesn't count, so a visitor can correct it.
export const limitMessages = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You sent several messages in a short time. Please wait a few minutes before sending another one." },
});

// Reading a document photo takes the server's processor for up to a second, so each user can
// scan 10 photos every 15 minutes. Used after isAuth, so it counts per account.
export const limitDocumentScans = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => "user-" + req.user.user_id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You scanned many photos in a short time. Please wait a few minutes and try again." },
});

// The selfie for identity verification: 10 sends every 15 minutes per account. It has its own
// count, so scanning the document a few times doesn't use up the selfie's tries.
export const limitSelfies = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => "selfie-user-" + req.user.user_id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You sent many photos in a short time. Please wait a few minutes and try again." },
});
