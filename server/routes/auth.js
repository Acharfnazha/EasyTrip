// ROUTES for accounts: each URL, its middlewares, and the controller function that answers it.
// Mounted at /api/auth in server.js. This follows flow 2 (authentication) in docs/app-flow.
import express from "express";
import * as authController from "../controllers/auth.js";
import * as googleController from "../controllers/google.js";
import { limitAttempts } from "../middleware/limit-attempts.js";

const router = express.Router();

router.post("/register", limitAttempts, authController.register);

// Logging in has two steps: the password (or Google), then the code sent by email.
router.post("/login", limitAttempts, authController.login);
router.get("/pending-code", authController.getPendingCode);
router.post("/verify-code", limitAttempts, authController.verifyCode);
router.post("/resend-code", authController.resendCode);

// Forgot password: the email, then the code and the new password.
router.post("/forgot-password", limitAttempts, authController.forgotPassword);
router.get("/forgot-password", authController.getPendingReset);
router.post("/forgot-password/resend", authController.resendResetCode);
router.post("/reset-password", limitAttempts, authController.resetPassword);

// "Continue with Google": the browser goes to Google, and Google sends it back to /callback.
router.get("/google", googleController.start);
router.get("/google/callback", googleController.callback);

router.post("/logout", authController.logout);
router.get("/me", authController.getMe);

export default router;
