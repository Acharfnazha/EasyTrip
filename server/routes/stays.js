// ROUTES for the stays (hotels and chalets). Mounted at /api/stays in server.js.
import express from "express";
import * as staysController from "../controllers/stays.js";
import * as bookingsController from "../controllers/bookings.js";
import { isAuth, isAdmin, loadUser } from "../middleware/is-auth.js";
import { uploadImage } from "../middleware/upload-image.js";

const router = express.Router();

// Reading: anyone. loadUser: a logged-in customer also sees their own discounts on the prices.
router.get("/", loadUser, staysController.listStays);
router.get("/:id", loadUser, staysController.getStay);
router.get("/:id/booked-dates", bookingsController.getBookedDates); // the nights already taken

// Adding, editing and deleting: admins only. The middlewares are put on each route.
// isAuth and isAdmin come before uploadImage, so a visitor can't even upload a file.
router.post("/", isAuth, isAdmin, uploadImage, staysController.createStay);
router.put("/:id", isAuth, isAdmin, uploadImage, staysController.updateStay);
router.delete("/:id", isAuth, isAdmin, staysController.deleteStay);

export default router;
