// The photo of the identity document (the passport, ID card or driving licence that the user
// scanned on "My account"), kept so an admin can compare it with the details and the selfie.
// It is personal data, so it is NOT in public/: it is saved in private/documents/, which
// express.static never serves. Only an admin can see it, through
// GET /api/admin/verifications/:userId/document. It is deleted when the identity is verified,
// when the user scans another document, and when they delete their document.
//
// Two steps, because the user checks the details before saving them:
// 1. The scan saves the photo as "scan-<random>.<ext>": not linked to any document yet. The
//    session keeps that name only (no details).
// 2. Saving the details renames it "<random>.<ext>", and id_documents.document_file keeps that.
// A scan that is never saved is deleted by the next scan, or after SCAN_KEEP_MINUTES.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import rootDir from "./path.js";

export const DOCUMENTS_DIR = path.join(rootDir, "private", "documents");
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true }); // Creates the folder if it is missing.

const EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const SCAN_PREFIX = "scan-";
const SCAN_KEEP_MINUTES = 60; // A scan must be saved within 30 minutes; this leaves a margin.

// The full path of a photo. basename keeps only the file name, so a name can never point
// outside the documents folder.
export function documentPhotoPath(name) {
  return path.join(DOCUMENTS_DIR, path.basename(name));
}

// Saves the photo of a scan under a random name the server makes. Returns that name.
export async function saveScanPhoto(buffer, mimetype) {
  const name = SCAN_PREFIX + crypto.randomBytes(16).toString("hex") + EXTENSIONS[mimetype];
  await fs.promises.writeFile(documentPhotoPath(name), buffer, { flag: "wx" });
  return name;
}

// The details were saved: the scan's photo becomes the document's photo. Returns its new name,
// or null when the scan's photo is gone.
export async function keepScanPhoto(scanName) {
  if (!scanName || !path.basename(scanName).startsWith(SCAN_PREFIX)) return null;
  const name = path.basename(scanName).slice(SCAN_PREFIX.length);
  try {
    await fs.promises.rename(documentPhotoPath(scanName), documentPhotoPath(name));
    return name;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// Deletes a photo. A missing file is not an error (it may be gone already).
export function deleteDocumentPhoto(name) {
  if (!name) return;
  fs.unlink(documentPhotoPath(name), (error) => {
    if (error && error.code !== "ENOENT") console.error(`A document photo could not be deleted (${error.code}).`);
  });
}

// Deletes the scans that were never saved and are too old to be. Called at each scan.
export function deleteOldScanPhotos() {
  const limit = Date.now() - SCAN_KEEP_MINUTES * 60 * 1000;
  fs.readdir(DOCUMENTS_DIR, (error, names) => {
    if (error) return;
    for (const name of names) {
      if (!name.startsWith(SCAN_PREFIX)) continue;
      fs.stat(documentPhotoPath(name), (statError, stats) => {
        if (!statError && stats.mtimeMs < limit) deleteDocumentPhoto(name);
      });
    }
  });
}
