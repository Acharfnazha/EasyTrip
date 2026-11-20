// Checks what the admin sends from the newer sections of the admin page: the identity
// verifications, an account's role, and the destinations.
import { readText, readPositiveInt } from "./common.js";

export const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "rejected"];
export const ROLES = ["customer", "admin"];
export const SEASONS = ["winter", "spring", "summer", "autumn"];

const NOTE_MAX = 255; // The same as id_documents.review_note.
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// The list's page and limit, the same rules as every other list.
function readPage(query, data, errors) {
  data.page = query.page === undefined ? 1 : readPositiveInt(query.page);
  data.limit = query.limit === undefined ? DEFAULT_LIMIT : readPositiveInt(query.limit);
  if (data.page === null) errors.page = "page must be a whole number of 1 or more.";
  if (data.limit === null || data.limit > MAX_LIMIT) {
    errors.limit = "limit must be a whole number from 1 to " + MAX_LIMIT + ".";
  }
}

// /api/admin/verifications?status=pending&q=lara&page=1&limit=10
export function checkVerificationFilters(query) {
  const data = { status: readText(query.status), search: readText(query.q) };
  const errors = {};
  if (data.status && !VERIFICATION_STATUSES.includes(data.status)) {
    errors.status = "status must be one of: " + VERIFICATION_STATUSES.join(", ") + ".";
  }
  if (data.search.length > 100) errors.q = "q must be 100 characters or fewer.";
  readPage(query, data, errors);
  return { data, errors };
}

// The admin's decision: { decision: "approve" or "reject", note }. A refusal needs a note,
// because the user must know what to fix.
export function checkVerificationDecision(body) {
  const data = {
    decision: readText(body.decision),
    note: readText(body.note).replace(/\s+/g, " "),
  };
  const errors = {};
  if (data.decision !== "approve" && data.decision !== "reject") {
    errors.decision = "Choose to approve or to reject.";
  }
  if (data.decision === "reject" && !data.note) {
    errors.note = "Say why, so the customer knows what to fix (for example: the document isn't readable in the selfie).";
  }
  if (data.note.length > NOTE_MAX) errors.note = `The note must be ${NOTE_MAX} characters or fewer.`;
  return { data, errors };
}

// { role: "customer" or "admin" }
export function checkRoleChange(body) {
  const data = { role: readText(body.role) };
  const errors = {};
  if (!ROLES.includes(data.role)) errors.role = "role must be customer or admin.";
  return { data, errors };
}

// The destination form: { name, country, season }. The same limits as the columns.
export function checkDestination(body) {
  const data = {
    name: readText(body.name).replace(/\s+/g, " "),
    country: readText(body.country).replace(/\s+/g, " "),
    season: readText(body.season),
  };
  const errors = {};
  if (!data.name) errors.name = "Enter the place's name, like Faraya or Paris.";
  else if (data.name.length > 80) errors.name = "The name must be 80 characters or fewer.";
  if (!data.country) errors.country = "Enter the country.";
  else if (data.country.length > 60) errors.country = "The country must be 60 characters or fewer.";
  if (!SEASONS.includes(data.season)) errors.season = "Choose a season.";
  return { data, errors };
}
