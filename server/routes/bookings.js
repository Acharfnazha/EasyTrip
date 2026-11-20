// ROUTES for a user's own bookings, tickets and credit. Mounted at /api/bookings, /api/tickets
// and /api/credit in server.js. Every route needs a logged-in user (isAuth), except the list of
// fares. The admin's booking, ticket and credit routes are in routes/admin.js.
import express from "express";
import * as bookingsController from "../controllers/bookings.js";
import * as ticketsController from "../controllers/tickets.js";
import * as creditController from "../controllers/credit.js";
import { isAuth, loadUser } from "../middleware/is-auth.js";

// /api/bookings
export const bookingRoutes = express.Router();
bookingRoutes.post("/", isAuth, bookingsController.createBooking);
bookingRoutes.get("/mine", isAuth, bookingsController.getMyBookings);
bookingRoutes.post("/:id/cancel", isAuth, bookingsController.cancelMyBooking);

// /api/tickets
export const ticketRoutes = express.Router();
ticketRoutes.get("/fares", loadUser, ticketsController.getFares); // anyone: the planners show the fares (and the discount)
ticketRoutes.post("/", isAuth, ticketsController.createTicket);
ticketRoutes.get("/mine", isAuth, ticketsController.getMyTickets);
ticketRoutes.post("/:id/cancel", isAuth, ticketsController.cancelMyTicket);

// /api/credit
export const creditRoutes = express.Router();
creditRoutes.get("/mine", isAuth, creditController.getMyCredit);
