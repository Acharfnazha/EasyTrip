// ROUTES for the admin dashboard. Mounted at /api/admin in server.js.
import express from "express";
import * as adminController from "../controllers/admin.js";
import { isAuth, isAdmin } from "../middleware/is-auth.js";

const router = express.Router();

// Every route in this file needs a logged-in admin.
router.use(isAuth, isAdmin);

router.get("/stats", adminController.getStats);

export default router;
