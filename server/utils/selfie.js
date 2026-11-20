// The photos that users send to verify their identity: the selfie (their face, holding their
// document) and, with the camera check, four photos of the movements (looking straight, turning
// left, turning right, coming closer). They are personal data, so they are NOT in public/: they
// are saved in private/selfies/, which express.static never serves. Only an admin can see them,
// through GET /api/admin/verifications/:userId/selfie. They are deleted as soon as the admin
// decides.
//
// The selfie is saved as "<random>.jpg"; its movement photos next to it as "<random>-left.jpg"
// and so on. The database keeps only the selfie's name.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import rootDir from "./path.js";

export const SELFIES_DIR = path.join(rootDir, "private", "selfies");
fs.mkdirSync(SELFIES_DIR, { recursive: true }); // Creates the folder if it is missing.

// The movements of the camera check, in the order the user does them.
export const LIVENESS_STEPS = ["straight", "left", "right", "closer"];

const EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

// The full path of a selfie, or of one of its movement photos (frame is "left", "right"...).
// basename keeps only the file name, so a name can never point outside the selfies folder.
export function selfiePath(name, frame) {
  const file = path.basename(name);
  if (!frame) return path.join(SELFIES_DIR, file);
  const extension = path.extname(file);
  return path.join(SELFIES_DIR, path.basename(file, extension) + "-" + frame + extension);
}

// Saves the selfie and its movement photos under one random name the server makes (never the
// visitor's own file name). photos is { selfie: {buffer, mimetype}, left: {...}, ... }.
// The movement photos are saved with the selfie's extension, whatever their own type: the
// first bytes of every photo were checked already, and the browser shows any of the three.
// Returns the selfie's name, which goes into id_documents.selfie_file.
export async function saveSelfie(photos) {
  const extension = EXTENSIONS[photos.selfie.mimetype];
  const name = crypto.randomBytes(16).toString("hex") + extension;
  const written = [];
  try {
    for (const frame of [null, ...LIVENESS_STEPS]) {
      const photo = frame ? photos[frame] : photos.selfie;
      if (!photo) continue;
      const file = selfiePath(name, frame);
      await fs.promises.writeFile(file, photo.buffer, { flag: "wx" });
      written.push(file);
    }
  } catch (error) {
    written.forEach((file) => fs.rm(file, { force: true }, () => {}));
    throw error;
  }
  return name;
}

// Deletes a selfie and its movement photos. A missing file is not an error (it may be gone).
export function deleteSelfie(name) {
  if (!name) return;
  for (const frame of [null, ...LIVENESS_STEPS]) {
    fs.unlink(selfiePath(name, frame), (error) => {
      if (error && error.code !== "ENOENT") console.error(`A selfie could not be deleted (${error.code}).`);
    });
  }
}
