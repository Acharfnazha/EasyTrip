// ROUTES for the contact messages. Mounted at /api/inquiries in server.js.
// The admin's inbox routes are in routes/admin.js, behind isAuth and isAdmin.
import express from "express";
import * as inquiriesController from "../controllers/inquiries.js";
import { isAuth, loadUser } from "../middleware/is-auth.js";
import { limitMessages } from "../middleware/limit-attempts.js";

const router = express.Router();

// Anyone can send a message; loadUser links it to the account of a logged-in user.
router.post("/", limitMessages, loadUser, inquiriesController.sendInquiry);

// A logged-in user's own messages, with the replies.
router.get("/mine", isAuth, inquiriesController.getMyInquiries);

export default router;
