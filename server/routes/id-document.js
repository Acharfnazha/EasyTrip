// ROUTES for the identity document of the logged-in user (a passport, an ID card or a driving
// licence). Mounted at /api/id-document in server.js.
// There is no id in the URLs: a user can only see and change their own document.
import express from "express";
import * as idDocumentController from "../controllers/id-document.js";
import { isAuth } from "../middleware/is-auth.js";
import { limitDocumentScans, limitSelfies } from "../middleware/limit-attempts.js";
import { uploadDocumentImage, uploadSelfieImage } from "../middleware/upload-image.js";

const router = express.Router();

router.use(isAuth);

// isAuth and the limit come before the upload, so the photo is only read for a logged-in user
// who hasn't reached the limit.
router.post("/scan", limitDocumentScans, uploadDocumentImage, idDocumentController.scanDocument);
router.get("/", idDocumentController.getDocument);
router.put("/", idDocumentController.saveDocument);
router.delete("/", idDocumentController.deleteDocument);

// Verification: a selfie holding the document (and the camera check's movement photos), for an
// admin to compare with the details. It has its own limit, so a user can't fill the disk.
router.post("/selfie", limitSelfies, uploadSelfieImage, idDocumentController.submitSelfie);

export default router;
