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
