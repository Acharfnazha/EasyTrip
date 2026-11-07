// ROUTES for accounts: each URL, its middlewares, and the controller function that answers it.
// Mounted at /api/auth in server.js. This follows flow 2 (authentication) in docs/app-flow.
import express from "express";
import * as authController from "../controllers/auth.js";
import { limitAttempts } from "../middleware/limit-attempts.js";

const router = express.Router();

router.post("/register", limitAttempts, authController.register);
router.post("/login", limitAttempts, authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.getMe);

export default router;
