// CONTROLLER for the identity document on "My account" (a passport, an ID card or a driving
// licence): scan a photo, check or type the details, save them, see them, delete them. Every
// route needs a logged-in user.
//
// Two ways to get the details:
// - machine_code: the server reads the document's code (passports, most ID cards), and the user
//   checks what was read.
// - typed: the document has no code (most driving licences, some ID cards), so the user types
//   the details, and the server checks which of them appear in the text printed on the photo.
//
// Privacy rules in this file:
// - The photo is only in memory (multer memoryStorage) and is dropped right after the scan.
// - Document details are never written to the log: errors are logged with a general message.
// - The session never holds document details or the photo's text, only fingerprints (see below).
import crypto from "crypto";
import { states } from "mrz";
import config from "../config.js";
import * as IdDocument from "../models/id-document.js";
import { readDocument } from "../utils/document-reader.js";
import { detailTokens } from "../utils/printed-text.js";
import { DOCUMENT_TYPES, checkDocumentDetails, readDocumentType, today } from "../validators/id-document.js";
import { hasErrors } from "../validators/common.js";
import { saveSelfie, deleteSelfie, LIVENESS_STEPS } from "../utils/selfie.js";
import * as notices from "../utils/notices.js";

const SCAN_VALID_MINUTES = 30; // A scan must be saved within 30 minutes.
const MAX_PHOTO_TOKENS = 400; // A document has far fewer words; this keeps the session small.

// "a passport", "an ID card", "a driving licence"
const WITH_ARTICLE = { passport: "a passport", id_card: "an ID card", driving_licence: "a driving licence" };

// Shown with every result, so a good reading is never presented as a verified identity.
const NOT_PROOF =
  "A correct reading does not prove that the document is genuine or that it belongs to you: " +
  "the details are saved as not verified until our team checks them with your selfie.";
// After a scan (the user still has to check or type the details):
const NOTICES = {
  machine_code: "These details were read from the document's machine-readable code. " + NOT_PROOF,
  typed:
    "This document has no machine-readable code that could be read, so type the details exactly as " +
    "they are printed on it. When you save, the server checks which of them appear in the text it " +
    "read on the photo. " + NOT_PROOF,
};
// With saved details:
const SAVED_NOTICES = {
  machine_code: NOTICES.machine_code,
  typed:
    "These details were typed by you, because the document has no machine-readable code that could be " +
    "read. The server checked which of them appear in the text it read on the photo. " + NOT_PROOF,
};

// A fingerprint (HMAC) of a text: the same text always gives the same fingerprint, but the text
// can't be found from it. It lets the server compare things at saving time without keeping the
// document's details, or the words on the photo, in the session.
function fingerprint(userId, text) {
  return crypto.createHmac("sha256", config.sessionSecret).update(userId + "|" + text).digest("hex");
}

// Did the user save exactly what the code said?
function detailsFingerprint(userId, documentType, details) {
  return fingerprint(userId, [documentType, details.surname, details.givenNames, details.documentNumber,
    details.issuingCountry, details.nationality, details.dateOfBirth, details.expiryDate].join("|"));
}

// The words on the photo are kept as short fingerprints: 16 characters are enough to compare them.
function tokenFingerprint(userId, token) {
  return fingerprint(userId, "token|" + token).slice(0, 16);
}

// An error that is safe to log: it says which step failed, never which document.
function safeError(step, error) {
  return new Error(`ID document ${step} failed (${(error && (error.code || error.name)) || "unknown error"})`);
}

// "United States of America (the)" -> "United States of America"; "Stateless person, as ..." -> "Stateless person"
function countryName(code) {
  const name = code ? states[code] : "";
  return name ? name.split(",")[0].replace(/ \(the\)$/, "") : "";
}

// The saved document as the account page receives it. Only the last 3 characters of the document
// number are sent back, in case someone looks at the screen.
function documentJson(row) {
  const typed = row.read_method === "typed";
  // For a typed document: the details that could be checked on the photo (a detail with no tokens,
  // like a one-letter name, can't be).
  const tokens = detailTokens({
    surname: row.surname, givenNames: row.given_names, documentNumber: row.document_number,
    dateOfBirth: row.date_of_birth, expiryDate: row.expiry_date,
  });
  return {
    documentType: row.document_type,
    documentTypeName: DOCUMENT_TYPES[row.document_type],
    surname: row.surname,
    givenNames: row.given_names,
    documentNumberEnd: row.document_number.slice(-3),
    issuingCountry: row.issuing_country,
    issuingCountryName: countryName(row.issuing_country),
    nationality: row.nationality,
    nationalityName: countryName(row.nationality),
    dateOfBirth: row.date_of_birth,
    expiryDate: row.expiry_date,
    expired: row.expiry_date !== null && row.expiry_date < today(), // NULL: the document never expires
    readMethod: row.read_method,
    // machine_code only:
    sameAsRead: typed ? null : Boolean(row.same_as_read),
    checkDigitsValid: typed ? null : Boolean(row.check_digits_valid),
    // typed only: the details found on the photo, out of the ones that could be checked
    foundOnPhoto: typed ? row.found_on_photo.split(",").filter(Boolean) : null,
    checkedOnPhoto: typed ? Object.keys(tokens).filter((detail) => tokens[detail].length > 0) : null,
    // The admin's review: unverified (no selfie yet), pending, verified or rejected.
    status: row.status,
    verified: row.status === "verified",
    livenessChecked: Boolean(row.liveness_steps) && row.liveness_steps.split(",").length === LIVENESS_STEPS.length,
    reviewNote: row.review_note, // why it was rejected, or null
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at,
  };
}

// The 422 answers of a scan, by the reader's status.
function scanProblem(result, documentType) {
  switch (result.status) {
    case "no-code":
      return "We couldn't read the code at the bottom of the passport's photo page (the two lines of " +
        "letters, numbers and < signs). The photo may be blurry, too small, or have glare. Take a new " +
        "photo of the whole photo page, flat, in good light and in focus.";
    case "unsupported":
      return `This looks like ${result.what}. Only passports, ID cards and driving licences are accepted.`;
    case "wrong-type":
      return `This looks like ${WITH_ARTICLE[result.documentType]}, not ${WITH_ARTICLE[documentType]}. ` +
        `Choose "${DOCUMENT_TYPES[result.documentType]}" and try again.`;
    case "has-code":
      return "This photo has a machine-readable code (lines of letters and < signs), so it is a passport " +
        "or an ID card, not a driving licence. Choose the right type and try again.";
    case "no-text":
      return "We couldn't read a document's text on this photo (its names and dates). Take a photo of " +
        "the whole document, flat, in good light and in focus.";
    default:
      return "The photo couldn't be read. Please try another photo.";
  }
}

// POST /api/id-document/scan  (multipart form: "documentType" and the photo in "document")
export async function scanDocument(req, res) {
  const image = req.file.buffer;
  req.file.buffer = null; // The request object no longer holds the photo.

  const documentType = readDocumentType(req.body.documentType);
  if (!documentType) {
    const message = "Choose a passport, an ID card or a driving licence.";
    return res.status(400).json({ error: message, fields: { documentType: message } });
  }

  let result;
  try {
    result = await readDocument(image, documentType);
  } catch (error) {
    throw safeError("scan", error);
  }

  if (result.status !== "read" && result.status !== "typed") {
    return res.status(422).json({
      reason: result.status,
      detectedType: result.status === "wrong-type" ? result.documentType : undefined,
      error: scanProblem(result, documentType),
    });
  }

  // The session keeps what is needed at saving time, but no details and no words of the photo.
  const userId = req.user.user_id;
  let details;
  if (result.status === "read") {
    details = result.details;
    req.session.documentScan = {
      documentType: documentType,
      readMethod: "machine_code",
      fingerprint: detailsFingerprint(userId, documentType, checkDocumentDetails(details, documentType).data),
      checkDigitsValid: result.checks.checkDigitsValid,
      scannedAt: Date.now(),
    };
  } else {
    details = { surname: "", givenNames: "", documentNumber: "", issuingCountry: "", nationality: "", dateOfBirth: "", expiryDate: "" };
    req.session.documentScan = {
      documentType: documentType,
      readMethod: "typed",
      photoTokens: result.tokens.slice(0, MAX_PHOTO_TOKENS).map((token) => tokenFingerprint(userId, token)),
      scannedAt: Date.now(),
    };
  }

  const readMethod = req.session.documentScan.readMethod;
  res.json({
    documentType: documentType,
    documentTypeName: DOCUMENT_TYPES[documentType],
    readMethod: readMethod,
    details: details,
    checks: result.checks || null,
    warnings: result.warnings,
    notice: NOTICES[readMethod],
  });
}

// PUT /api/id-document  (JSON: the details the user checked, corrected or typed)
// The document type comes from the scan, not from the form.
export async function saveDocument(req, res) {
  const scan = req.session.documentScan;
  if (!scan || Date.now() - scan.scannedAt > SCAN_VALID_MINUTES * 60 * 1000) {
    return res.status(400).json({ error: "Scan your document first, then check the details and save them." });
  }

  const { data, errors } = checkDocumentDetails(req.body || {}, scan.documentType);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  const userId = req.user.user_id;
  let checks;
  if (scan.readMethod === "machine_code") {
    checks = {
      readMethod: "machine_code",
      sameAsRead: detailsFingerprint(userId, scan.documentType, data) === scan.fingerprint,
      checkDigitsValid: scan.checkDigitsValid,
      foundOnPhoto: null,
    };
  } else {
    // A typed detail is found when all its tokens are among the photo's.
    const onPhoto = new Set(scan.photoTokens);
    const found = Object.entries(detailTokens(data))
      .filter(([, tokens]) => tokens.length > 0 && tokens.every((token) => onPhoto.has(tokenFingerprint(userId, token))))
      .map(([detail]) => detail);
    checks = { readMethod: "typed", sameAsRead: null, checkDigitsValid: null, foundOnPhoto: found };
  }

  // New details start the review again, so an old selfie is no longer needed.
  const before = await IdDocument.findByUserId(userId);
  try {
    await IdDocument.save(userId, scan.documentType, data, checks);
  } catch (error) {
    throw safeError("save", error);
  }
  if (before) deleteSelfie(before.selfie_file);
  delete req.session.documentScan; // One scan, one save.

  const row = await IdDocument.findByUserId(userId);
  res.json({
    message: `Your ${DOCUMENT_TYPES[scan.documentType]} details were saved. They are not verified yet: send a selfie to verify them.`,
    document: documentJson(row),
    notice: SAVED_NOTICES[row.read_method],
  });
}

// GET /api/id-document
export async function getDocument(req, res) {
  const row = await IdDocument.findByUserId(req.user.user_id);
  res.json({ document: row ? documentJson(row) : null, notice: row ? SAVED_NOTICES[row.read_method] : NOT_PROOF });
}

// DELETE /api/id-document
export async function deleteDocument(req, res) {
  const before = await IdDocument.findByUserId(req.user.user_id);
  const deleted = await IdDocument.deleteByUserId(req.user.user_id);
  if (before) deleteSelfie(before.selfie_file);
  if (!deleted) {
    return res.status(404).json({ error: "There is no saved identity document." });
  }
  delete req.session.documentScan;
  res.json({ message: "Your identity document details were deleted." });
}

// POST /api/id-document/selfie  (multipart form: the photo in "selfie", and with the camera
// check, the movement photos in "straight", "left", "right" and "closer")
// The user sends a photo of their face holding the document. With the camera check, they also
// looked straight, turned left and right, and came closer: a printed photo or a screen can't do
// that. An admin then compares all the photos with the saved details, and approves or refuses
// them. The photos are saved in private/selfies/ (not in public/), and deleted as soon as the
// admin decides.
// The browser says which movements it saw, but the server can't check that by itself: the
// admin looks at the four photos. So the steps are only recorded when all four photos came.
export async function submitSelfie(req, res) {
  const userId = req.user.user_id;
  const photos = req.photos;
  req.photos = null; // The request object no longer holds the photos.
  const row = await IdDocument.findByUserId(userId);
  if (!row) {
    return res.status(400).json({ error: "Save your identity document first, then send your selfie." });
  }
  if (row.status === "verified") {
    return res.status(409).json({ error: "Your identity is already verified." });
  }
  if (row.expiry_date !== null && row.expiry_date < today()) {
    return res.status(400).json({ error: "This document has expired. Scan a valid document first." });
  }

  const steps = LIVENESS_STEPS.filter((step) => photos[step]);
  if (steps.length > 0 && steps.length < LIVENESS_STEPS.length) {
    return res.status(400).json({ error: "The camera check is incomplete. Do every movement again, then send." });
  }

  let file;
  try {
    file = await saveSelfie(photos);
  } catch (error) {
    throw safeError("selfie save", error);
  }

  if (!(await IdDocument.submitSelfie(userId, file, steps))) {
    deleteSelfie(file); // The document changed in the meantime: keep no unused photo.
    return res.status(409).json({ error: "Your document changed while the photo was sent. Reload the page and try again." });
  }
  deleteSelfie(row.selfie_file); // A selfie sent before, which this one replaces.

  notices.verificationSubmitted(req.user);
  const saved = await IdDocument.findByUserId(userId);
  res.json({
    message: steps.length > 0
      ? "Your camera check and selfie were sent. Our team will check them with your document, usually within a day, and email you."
      : "Your selfie was sent. Our team will check it with your document, usually within a day, and email you.",
    document: documentJson(saved),
    notice: SAVED_NOTICES[saved.read_method],
  });
}
