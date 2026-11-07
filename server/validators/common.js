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

// true when a validator found at least one wrong field.
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
