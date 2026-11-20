// Small helpers that every validator uses.

export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads a text field from the request. Anything that isn't text (a number, an array, an object
// sent on purpose) counts as empty. Spaces at the start and end are removed.
export function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Reads a whole number from the URL or a form, like "7" in /api/stays/7 or ?page=2.
// Returns the number, or null when it isn't a whole number of 1 or more.
export function readPositiveInt(value) {
  const text = readText(value);
  if (!/^[0-9]{1,9}$/.test(text)) return null; // digits only, so "2.5", "-1" and "1e3" are refused
  const number = Number(text);
  return number >= 1 ? number : null;
}

// A date as YYYY-MM-DD, in the server's local time.
export function isoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Today's date as YYYY-MM-DD. Dates in this form can be compared as text: "2027-01-08" < "2027-01-11".
export function today() {
  return isoDate(new Date());
}

// true for a real calendar date written YYYY-MM-DD ("2023-02-30" is refused).
export function isRealDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// true when a validator found at least one wrong field.
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
