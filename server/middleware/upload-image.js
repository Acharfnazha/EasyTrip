// Reads a form sent as multipart/form-data (a form with a file), like upload.single("image") in
// the course. multer fills req.file (the image) and req.body (the text fields). The JSON body
// parser can't read this format.
//
// Two versions:
// - uploadImage: a stay's photo. It is saved in public/assets/images/uploads/ to be shown.
// - uploadDocumentImage: a photo of an identity document. It is kept in memory only (never
//   written to the disk) and forgotten after the scan, because it is personal data.
import crypto from "crypto";
import multer from "multer";
import {
  UPLOADS_DIR,
  deleteUploadedImage,
  UPLOADS_URL,
  readImageType,
  imageTypeFromBytes,
} from "../utils/file.js";

const MAX_SIZE_MB = 2;
const DOCUMENT_MAX_SIZE_MB = 5; // Phone photos of a document are bigger.

// The allowed image types, and the extension each one is saved with. SVG and GIF are not
// allowed: an SVG file can contain a script.
const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  // The server makes the name: the time, random text and the type's extension. The visitor's
  // own file name is never used, so it can't contain "../" or replace another file.
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + crypto.randomBytes(6).toString("hex") + EXTENSIONS[file.mimetype]);
  },
});

// Accept only the image types above, by the type the browser sends.
function fileFilter(req, file, cb) {
  if (EXTENSIONS[file.mimetype]) return cb(null, true);
  const error = new Error("The image must be a JPG, PNG or WebP file.");
  error.code = "WRONG_FILE_TYPE";
  cb(error);
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
});

// A problem with the image is answered like the other form errors: 400, with the message
// under the image field.
function imageError(res, message) {
  res.status(400).json({ error: "Please correct the highlighted fields.", fields: { image: message } });
}

// The route middleware: one image from the form field named "image" (optional here; the
// controller decides if it is required).
export function uploadImage(req, res, next) {
  upload.single("image")(req, res, async (error) => {
    if (error) {
      if (error.code === "WRONG_FILE_TYPE") return imageError(res, error.message);
      if (error.code === "LIMIT_FILE_SIZE") return imageError(res, `The image must be ${MAX_SIZE_MB} MB or smaller.`);
      if (error instanceof multer.MulterError) return imageError(res, "Send one image, in the image field.");
      return next(error);
    }
    if (!req.file) return next();

    // The browser's type can be faked, so the file's first bytes must match it too.
    try {
      const realType = await readImageType(req.file.path);
      if (realType !== req.file.mimetype) {
        deleteUploadedImage(UPLOADS_URL + req.file.filename);
        return imageError(res, "This file is not a real JPG, PNG or WebP image.");
      }
    } catch (readError) {
      deleteUploadedImage(UPLOADS_URL + req.file.filename);
      return next(readError);
    }
    next();
  });
}

// ---------- Identity document photos: memory only ----------

const documentUpload = multer({
  storage: multer.memoryStorage(), // req.file.buffer holds the bytes; nothing goes to the disk.
  fileFilter: fileFilter,
  // One photo, and one short text field (documentType).
  limits: { fileSize: DOCUMENT_MAX_SIZE_MB * 1024 * 1024, files: 1, fields: 1, fieldSize: 100 },
});

function documentError(res, message) {
  res.status(400).json({ error: message, fields: { document: message } });
}

// The route middleware: one image from the form field named "document" (required).
export function uploadDocumentImage(req, res, next) {
  documentUpload.single("document")(req, res, (error) => {
    if (error) {
      if (error.code === "WRONG_FILE_TYPE") return documentError(res, "The photo must be a JPG, PNG or WebP image.");
      if (error.code === "LIMIT_FILE_SIZE") {
        return documentError(res, `The photo must be ${DOCUMENT_MAX_SIZE_MB} MB or smaller.`);
      }
      if (error instanceof multer.MulterError) {
        return documentError(res, "Send the document type and one photo, in the document field.");
      }
      return next(error);
    }
    if (!req.file) return documentError(res, "Choose a photo of your document.");

    // The type the browser sends must match the file's first bytes.
    if (imageTypeFromBytes(req.file.buffer) !== req.file.mimetype) {
      req.file.buffer = null;
      return documentError(res, "This file is not a real JPG, PNG or WebP image.");
    }
    next();
  });
}

// ---------- Selfies for identity verification: memory, then private/selfies/ ----------
// The photo is read into memory first, so its first bytes can be checked before anything is
// written. The controller then saves it with utils/selfie.js, outside public/.

// The selfie, and the camera check's four movement photos (optional: a selfie can be uploaded
// without the camera).
const SELFIE_FIELDS = ["selfie", "straight", "left", "right", "closer"];
const selfieUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: DOCUMENT_MAX_SIZE_MB * 1024 * 1024, files: SELFIE_FIELDS.length, fields: 0 },
});

function selfieError(res, message) {
  res.status(400).json({ error: message, fields: { selfie: message } });
}

// The route middleware: the selfie (required) and the movement photos, one per field. It sets
// req.photos = { selfie: {buffer, mimetype}, left: {...}, ... } with only the photos sent.
export function uploadSelfieImage(req, res, next) {
  selfieUpload.fields(SELFIE_FIELDS.map((name) => ({ name: name, maxCount: 1 })))(req, res, (error) => {
    if (error) {
      if (error.code === "WRONG_FILE_TYPE") return selfieError(res, "The photos must be JPG, PNG or WebP images.");
      if (error.code === "LIMIT_FILE_SIZE") return selfieError(res, `Each photo must be ${DOCUMENT_MAX_SIZE_MB} MB or smaller.`);
      if (error instanceof multer.MulterError) return selfieError(res, "Send the selfie in the selfie field, and at most one photo per movement.");
      return next(error);
    }
    const files = req.files || {};
    if (!files.selfie) return selfieError(res, "Choose your selfie.");

    req.photos = {};
    for (const name of SELFIE_FIELDS) {
      const file = files[name] && files[name][0];
      if (!file) continue;
      if (imageTypeFromBytes(file.buffer) !== file.mimetype) {
        req.files = null;
        return selfieError(res, "This file is not a real JPG, PNG or WebP image.");
      }
      req.photos[name] = { buffer: file.buffer, mimetype: file.mimetype };
    }
    req.files = null; // The photos are only in req.photos now.
    next();
  });
}
