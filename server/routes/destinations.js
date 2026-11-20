// ROUTES for the destinations. Mounted at /api/destinations in server.js.
import express from "express";
import * as destinationsController from "../controllers/destinations.js";

const router = express.Router();

router.get("/", destinationsController.listDestinations);

export default router;
