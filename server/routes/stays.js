// ROUTES for the stays (hotels and chalets). Mounted at /api/stays in server.js.
// They only read data, so anyone can use them.
import express from "express";
import * as staysController from "../controllers/stays.js";

const router = express.Router();

router.get("/", staysController.listStays);
router.get("/:id", staysController.getStay);

export default router;
