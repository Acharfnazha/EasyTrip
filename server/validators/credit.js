// Checks what the admin sends from the "Customers" section: the list's filters, and a credit
// change (add or remove an amount of a user's credit).
import { readText, readPositiveInt } from "./common.js";

export const MAX_CHANGE = 10000; // The most credit one change can add or remove, in US dollars.
export const MAX_CREDIT = 100000; // The most credit an account can hold.
const NOTE_MAX = 255; // The same as the note column in database/schema.sql.
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// The credit form: { action: "add" or "remove", amount: "200" or "49.99", note: "..." }.
// The amount stays TEXT ("200.00"), like MySQL's DECIMAL: money is never a JavaScript decimal
// number, because 0.1 + 0.2 is not exactly 0.3 there. MySQL does the sums.
export function checkCreditChange(body) {
  const data = {
    action: readText(body.action),
    amount: readText(typeof body.amount === "number" ? String(body.amount) : body.amount),
    note: readText(body.note).replace(/\s+/g, " "),
  };
  const errors = {};

  if (data.action !== "add" && data.action !== "remove") errors.action = "Choose to add or to remove credit.";

  // Digits, then at most 2 decimals: "200", "49.9" and "49.99" pass; "-5", "1e3" and "5.999" don't.
  if (!/^[0-9]{1,6}(\.[0-9]{1,2})?$/.test(data.amount)) {
    errors.amount = "Enter an amount like 200 or 49.99.";
  } else if (Number(data.amount) <= 0) {
    errors.amount = "The amount must be more than 0.";
  } else if (Number(data.amount) > MAX_CHANGE) {
    errors.amount = `One change can be $${MAX_CHANGE.toLocaleString("en-US")} at most.`;
  }

  if (data.note.length > NOTE_MAX) errors.note = `The note must be ${NOTE_MAX} characters or fewer.`;

  return { data, errors };
}

// The admin's list of accounts: /api/admin/users?q=lara&page=1&limit=10
export function checkUserFilters(query) {
  const data = {
    search: readText(query.q),
    page: query.page === undefined ? 1 : readPositiveInt(query.page),
    limit: query.limit === undefined ? DEFAULT_LIMIT : readPositiveInt(query.limit),
  };
  const errors = {};

  if (data.search.length > 100) errors.q = "q must be 100 characters or fewer.";
  if (data.page === null) errors.page = "page must be a whole number of 1 or more.";
  if (data.limit === null || data.limit > MAX_LIMIT) {
    errors.limit = "limit must be a whole number from 1 to " + MAX_LIMIT + ".";
  }

  return { data, errors };
}
