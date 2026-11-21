// CONTROLLER for the admin's identity verifications. A user saves their document's details on
// "My account", then sends a selfie holding the document. The admin compares the selfie with
// the details and the document in the photo, then approves or rejects. Only a verified user can
// book a stay or buy a ticket (when REQUIRE_VERIFIED_ID isn't "false" in .env).
// The routes are in routes/admin.js, behind isAuth and isAdmin.
import fs from "fs";
import * as IdDocument from "../models/id-document.js";
import { checkVerificationFilters, checkVerificationDecision } from "../validators/admin.js";
import { hasErrors, readPositiveInt, today } from "../validators/common.js";
import { DOCUMENT_TYPES } from "../validators/id-document.js";
import { selfiePath, deleteSelfie, LIVENESS_STEPS } from "../utils/selfie.js";
import { documentPhotoPath, deleteDocumentPhoto } from "../utils/document-photo.js";
import * as notices from "../utils/notices.js";

// A document as the admin page receives it. The admin needs the whole document number, to
// compare it with the one on the document in the selfie.
function verificationJson(row) {
  return {
    userId: row.user_id,
    user: { name: (row.first_name + " " + row.last_name).trim(), email: row.email },
    documentType: row.document_type,
    documentTypeName: DOCUMENT_TYPES[row.document_type],
    surname: row.surname,
    givenNames: row.given_names,
    documentNumber: row.document_number,
    issuingCountry: row.issuing_country,
    nationality: row.nationality,
    dateOfBirth: row.date_of_birth,
    expiryDate: row.expiry_date,
    expired: row.expiry_date !== null && row.expiry_date < today(),
    readMethod: row.read_method,
    sameAsRead: row.same_as_read === null ? null : Boolean(row.same_as_read),
    checkDigitsValid: row.check_digits_valid === null ? null : Boolean(row.check_digits_valid),
    foundOnPhoto: row.found_on_photo === null ? null : row.found_on_photo.split(",").filter(Boolean),
    status: row.status,
    hasDocumentPhoto: Boolean(row.document_file),
    hasSelfie: Boolean(row.selfie_file),
    // The movements of the camera check that have a photo: [] when the selfie was uploaded.
    livenessSteps: row.selfie_file && row.liveness_steps ? row.liveness_steps.split(",") : [],
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewer_first_name || null,
    reviewNote: row.review_note,
  };
}

function readUserId(req, res) {
  const id = readPositiveInt(req.params.userId);
  if (!id) res.status(400).json({ error: "The user id must be a whole number of 1 or more." });
  return id;
}

function notFound(res) {
  res.status(404).json({ error: "This user has no saved identity document." });
}

// GET /api/admin/verifications?status=&q=&page=&limit=
export async function listVerifications(req, res) {
  const { data, errors } = checkVerificationFilters(req.query);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Some list values are wrong.", fields: errors });
  }
  const { rows, total } = await IdDocument.findAllForAdmin(data);
  res.json({
    verifications: rows.map(verificationJson),
    pagination: { page: data.page, limit: data.limit, total: total, totalPages: Math.ceil(total / data.limit) },
  });
}

// GET /api/admin/verifications/:userId
export async function getVerification(req, res) {
  const userId = readUserId(req, res);
  if (!userId) return;
  const row = await IdDocument.findOneForAdmin(userId);
  if (!row) return notFound(res);
  res.json({ verification: verificationJson(row) });
}

// GET /api/admin/verifications/:userId/selfie: the photo itself, for the admin's <img>.
// ?frame=left (or straight, right, closer) gives one of the camera check's movement photos.
// It is never cached, and never sent to anyone but an admin.
export async function getSelfie(req, res) {
  const userId = readUserId(req, res);
  if (!userId) return;
  const frame = req.query.frame === undefined ? null : String(req.query.frame);
  if (frame !== null && !LIVENESS_STEPS.includes(frame)) {
    return res.status(400).json({ error: "frame must be one of: " + LIVENESS_STEPS.join(", ") + "." });
  }
  const row = await IdDocument.findOneForAdmin(userId);
  if (!row || !row.selfie_file) {
    return res.status(404).json({ error: "There is no selfie to show (it is deleted once a decision is made)." });
  }
  const file = selfiePath(row.selfie_file, frame);
  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: "The selfie's file is missing. Ask the customer to send it again." });
  }
  res.set("Cache-Control", "no-store");
  res.sendFile(file);
}

// GET /api/admin/verifications/:userId/document: the photo of the document the user scanned, for
// the admin's <img>. It is never cached, and never sent to anyone but an admin.
export async function getDocumentPhoto(req, res) {
  const userId = readUserId(req, res);
  if (!userId) return;
  const row = await IdDocument.findOneForAdmin(userId);
  if (!row || !row.document_file) {
    return res.status(404).json({ error: "There is no photo of this document (it is deleted once the identity is verified)." });
  }
  const file = documentPhotoPath(row.document_file);
  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: "The document photo's file is missing. Ask the customer to scan the document again." });
  }
  res.set("Cache-Control", "no-store");
  res.sendFile(file);
}

// POST /api/admin/verifications/:userId  (JSON: decision = "approve" or "reject", note)
export async function decideVerification(req, res) {
  const userId = readUserId(req, res);
  if (!userId) return;
  const { data, errors } = checkVerificationDecision(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  const row = await IdDocument.findOneForAdmin(userId);
  if (!row) return notFound(res);
  if (row.status !== "pending") {
    return res.status(409).json({ error: `Only a document that waits for a review can be decided. This one is ${row.status}.` });
  }
  if (data.decision === "approve" && row.expiry_date !== null && row.expiry_date < today()) {
    return res.status(409).json({ error: "This document has expired, so it can't be approved. Reject it and ask for a valid one." });
  }

  const status = data.decision === "approve" ? "verified" : "rejected";
  if (!(await IdDocument.decide(userId, status, req.user.user_id, data.note))) {
    return res.status(409).json({ error: "Another admin decided this a moment ago. Reload the list." });
  }
  deleteSelfie(row.selfie_file); // The decision is made, so the photo is no longer kept.
  // A verified document's photo is no longer needed either. After a rejection it is kept: the
  // user can send a new selfie for the same document.
  if (status === "verified") deleteDocumentPhoto(row.document_file);

  notices.verificationDecided(row, status, data.note);
  const name = (row.first_name + " " + row.last_name).trim();
  res.json({
    message: status === "verified"
      ? `${name}'s identity is verified. They can now book stays and buy tickets.`
      : `${name}'s identity was rejected. They were told why and can send a new selfie.`,
    verification: verificationJson(await IdDocument.findOneForAdmin(userId)),
  });
}
