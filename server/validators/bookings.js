// Checks a booking request (the form in the stay's details dialog, public/js/booking.js), and
// what the admin sends from the bookings section: the list's filters and a status change.
// The browser checks the dates too, but anyone can skip the browser.
import { readText, readPositiveInt, isRealDate, isoDate, today } from "./common.js";

// The same values as the ENUM in database/schema.sql.
export const STATUSES = ["pending", "confirmed", "cancelled"];

export const MAX_NIGHTS = 30; // The longest stay that can be booked at once.
const MAX_TRAVELERS = 9; // The same limit as the CHECK rule in the bookings table.
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// How many nights are between two YYYY-MM-DD dates. UTC is used so a clock change (summer
// time) never makes a day 23 or 25 hours long.
export function nightsBetween(startDate, endDate) {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) / day);
}

// The last day a stay can start: one year from today.
export function lastStartDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return isoDate(date);
}

// The booking form: { accId, startDate, endDate, travelers }. Returns the clean data (with the
// number of nights) and one message per wrong field. The price is NOT read from the request:
// the server works it out from the stay's price in the database.
export function checkBooking(body) {
  const data = {
    accId: readPositiveInt(String(body.accId ?? "")),
    startDate: readText(body.startDate),
    endDate: readText(body.endDate),
    travelers: readPositiveInt(String(body.travelers ?? "")),
    nights: 0,
  };
  const errors = {};

  if (!data.accId) errors.accId = "Choose a stay.";

  if (!isRealDate(data.startDate)) errors.startDate = "Choose your check-in date.";
  else if (data.startDate < today()) errors.startDate = "The check-in date can't be in the past.";
  else if (data.startDate > lastStartDate()) errors.startDate = "The check-in date must be within one year from today.";

  if (!isRealDate(data.endDate)) errors.endDate = "Choose your check-out date.";
  else if (!errors.startDate) {
    data.nights = nightsBetween(data.startDate, data.endDate);
    if (data.nights < 1) errors.endDate = "The check-out date must be after the check-in date.";
    else if (data.nights > MAX_NIGHTS) errors.endDate = `A stay can be ${MAX_NIGHTS} nights at most.`;
  }

  if (!data.travelers || data.travelers > MAX_TRAVELERS) {
    errors.travelers = `Choose from 1 to ${MAX_TRAVELERS} travelers.`;
  }

  return { data, errors };
}

// The admin's list: /api/admin/bookings?status=pending&q=lara&page=1&limit=10
export function checkBookingFilters(query) {
  const data = {
    status: readText(query.status),
    search: readText(query.q),
    page: query.page === undefined ? 1 : readPositiveInt(query.page),
    limit: query.limit === undefined ? DEFAULT_LIMIT : readPositiveInt(query.limit),
  };
  const errors = {};

  if (data.status && !STATUSES.includes(data.status)) {
    errors.status = "status must be one of: " + STATUSES.join(", ") + ".";
  }
  if (data.search.length > 100) errors.q = "q must be 100 characters or fewer.";
  if (data.page === null) errors.page = "page must be a whole number of 1 or more.";
  if (data.limit === null || data.limit > MAX_LIMIT) {
    errors.limit = "limit must be a whole number from 1 to " + MAX_LIMIT + ".";
  }

  return { data, errors };
}

// A status the admin can choose: "confirmed" (for a pending booking) or "cancelled".
export function checkBookingStatus(body) {
  const data = { status: readText(body.status) };
  const errors = {};
  if (!["confirmed", "cancelled"].includes(data.status)) {
    errors.status = "status must be confirmed or cancelled.";
  }
  return { data, errors };
}
