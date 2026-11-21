// ROUTES for the admin page. Mounted at /api/admin in server.js.
import express from "express";
import * as adminController from "../controllers/admin.js";
import * as inquiriesController from "../controllers/inquiries.js";
import * as bookingsController from "../controllers/bookings.js";
import * as ticketsController from "../controllers/tickets.js";
import * as creditController from "../controllers/credit.js";
import * as accountsController from "../controllers/accounts.js";
import * as verificationsController from "../controllers/verifications.js";
import * as destinationsController from "../controllers/destinations.js";
import * as discountsController from "../controllers/discounts.js";
import { isAuth, isAdmin } from "../middleware/is-auth.js";

const router = express.Router();

// Every route in this file needs a logged-in admin.
router.use(isAuth, isAdmin);

router.get("/stats", adminController.getStats);
router.get("/overview", adminController.getOverview);

// The database viewer (read only): the tables, then one table's columns and rows.
router.get("/database", adminController.listTables);
router.get("/database/:table", adminController.getTable);

// The messages inbox: list, read one, reply, close or reopen, delete.
router.get("/inquiries", inquiriesController.listInquiries);
router.get("/inquiries/:id", inquiriesController.getInquiry);
router.post("/inquiries/:id/replies", inquiriesController.replyToInquiry);
router.patch("/inquiries/:id", inquiriesController.changeInquiryStatus);
router.delete("/inquiries/:id", inquiriesController.deleteInquiry);

// The bookings: list them, then confirm or cancel one (cancelling refunds the credit).
router.get("/bookings", bookingsController.listBookings);
router.patch("/bookings/:id", bookingsController.changeBookingStatus);

// The tickets: the same two actions as the bookings.
router.get("/tickets", ticketsController.listTickets);
router.patch("/tickets/:id", ticketsController.changeTicketStatus);

// The accounts and their credit: list them, see one account's credit history, add or remove credit.
router.get("/users", creditController.listUsers);
router.get("/users/:id/credit", creditController.getUserCredit);
router.post("/users/:id/credit", creditController.changeUserCredit);

// The admin's account tools: change a role, delete an account (never their own).
router.patch("/users/:id", accountsController.changeRole);
router.delete("/users/:id", accountsController.deleteAccount);

// The identity verifications: the list, one document, its photo, its selfie, and the decision.
router.get("/verifications/:userId/document", verificationsController.getDocumentPhoto);
router.get("/verifications", verificationsController.listVerifications);
router.get("/verifications/:userId", verificationsController.getVerification);
router.get("/verifications/:userId/selfie", verificationsController.getSelfie);
router.post("/verifications/:userId", verificationsController.decideVerification);

// The destinations: the list with their stays, add, edit and delete.
router.get("/destinations", destinationsController.listForAdmin);
router.post("/destinations", destinationsController.createDestination);
router.put("/destinations/:id", destinationsController.updateDestination);
router.delete("/destinations/:id", destinationsController.deleteDestination);

// The discounts: the list (with the stays and customers the form offers), add, edit and delete.
router.get("/discounts", discountsController.listDiscounts);
router.post("/discounts", discountsController.createDiscount);
router.put("/discounts/:id", discountsController.updateDiscount);
router.delete("/discounts/:id", discountsController.deleteDiscount);

export default router;
