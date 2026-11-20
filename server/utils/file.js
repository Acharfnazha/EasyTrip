// Helpers for the images that admins upload. The files are saved in public/assets/images/uploads/
// (the database keeps only their path, like in the course: files are too big for the database).
import fs from "fs";
import path from "path";
import rootDir from "./path.js";

// Where the files are on the disk, and how their path starts in the database and in the browser.
export const UPLOADS_DIR = path.join(rootDir, "public", "assets", "images", "uploads");
export const UPLOADS_URL = "assets/images/uploads/";

fs.mkdirSync(UPLOADS_DIR, { recursive: true }); // Creates the folder if it is missing.

// Deletes an uploaded image. Only files in the uploads folder are deleted: the site's own
// images (assets/images/hotels/..., assets/images/chalets/...) are never touched.
export function deleteUploadedImage(imagePath) {
  if (!imagePath || !imagePath.startsWith(UPLOADS_URL)) return;
  // basename keeps only the file name, so a path can never point outside the uploads folder.
  const file = path.join(UPLOADS_DIR, path.basename(imagePath));
  fs.unlink(file, (error) => {
    if (error && error.code !== "ENOENT") console.error(error);
  });
}

// The first bytes of a file tell its real type, whatever its name or the browser says.
// Returns "image/jpeg", "image/png", "image/webp", or null for anything else.
export function imageTypeFromBytes(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.toString("hex", 0, 8) === "89504e470d0a1a0a") return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// The same check for a file saved on the disk: it reads only the first 12 bytes.
export async function readImageType(filePath) {
  const handle = await fs.promises.open(filePath, "r");
  const bytes = Buffer.alloc(12);
  try {
    await handle.read(bytes, 0, 12, 0);
  } finally {
    await handle.close();
  }
  return imageTypeFromBytes(bytes);
}
