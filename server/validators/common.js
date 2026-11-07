// Small helpers that every validator uses.

export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads a text field from the request. Anything that isn't text (a number, an array, an object
// sent on purpose) counts as empty. Spaces at the start and end are removed.
export function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// true when a validator found at least one wrong field.
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
