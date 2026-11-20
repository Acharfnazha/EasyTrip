// Checks a ticket before it is bought (the flight and bus & train planners, public/js/flight.js
// and public/js/bus-train.js), and the filters of the admin's tickets list. The browser checks
// the same rules, but anyone can skip the browser.
import { readText, readPositiveInt, isRealDate, isoDate, today } from "./common.js";
import { FARES } from "../utils/fares.js";
import { STATUSES } from "./bookings.js";

// The same values as the ENUMs in database/schema.sql.
export const TYPES = ["flight", "bus", "train"];
const TRIP_TYPES = ["round", "oneway"];

const PLACE_MAX = 80; // The same as the origin and destination columns.
const MAX_TRAVELERS = 9; // The same limit as the CHECK rule in the tickets table.
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// "Beirut", "beirut " and "Béirut" are the same place: no accents, single spaces, small letters.
// The database compares the two columns the same way (its collation ignores capitals and
// accents), so its CHECK rule "origin <> destination" never disagrees with this.
function plainPlace(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
}

// The last day a ticket can leave: one year from today.
function lastDepartDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return isoDate(date);
}

// The ticket form: { type, origin, destination, tripType, departDate, returnDate, travelers,
// seatClass }. Returns the clean data and one message per wrong field. The price is NOT read
// from the request: the controller works it out from the fares.
export function checkTicket(body) {
  const data = {
    type: readText(body.type),
    origin: readText(body.origin).replace(/\s+/g, " "),
    destination: readText(body.destination).replace(/\s+/g, " "),
    tripType: readText(body.tripType),
    departDate: readText(body.departDate),
    returnDate: readText(body.returnDate),
    travelers: readPositiveInt(String(body.travelers ?? "")),
    seatClass: readText(body.seatClass),
  };
  const errors = {};

  if (!TYPES.includes(data.type)) errors.type = "Choose a flight, a bus or a train.";

  if (!data.origin) errors.origin = "Enter where you are leaving from.";
  else if (data.origin.length > PLACE_MAX) errors.origin = `This must be ${PLACE_MAX} characters or fewer.`;

  if (!data.destination) errors.destination = "Enter where you are going.";
  else if (data.destination.length > PLACE_MAX) errors.destination = `This must be ${PLACE_MAX} characters or fewer.`;
  else if (data.origin && plainPlace(data.origin) === plainPlace(data.destination)) {
    errors.destination = "Choose a destination that is different from where you are leaving from.";
  }

  if (!TRIP_TYPES.includes(data.tripType)) errors.tripType = "Choose round trip or one way.";

  if (!isRealDate(data.departDate)) errors.departDate = "Choose a departure date.";
  else if (data.departDate < today()) errors.departDate = "The departure date can't be in the past.";
  else if (data.departDate > lastDepartDate()) errors.departDate = "The departure date must be within one year from today.";

  // A round trip needs a return date on or after the departure; a one-way trip has none.
  if (data.tripType === "oneway") {
    data.returnDate = null;
  } else if (!isRealDate(data.returnDate)) {
    errors.returnDate = "Choose a return date, or switch to a one-way trip.";
  } else if (isRealDate(data.departDate) && data.returnDate < data.departDate) {
    errors.returnDate = "The return date must be on or after the departure date.";
  }

  if (!data.travelers || data.travelers > MAX_TRAVELERS) {
    errors.travelers = `Choose from 1 to ${MAX_TRAVELERS} travelers.`;
  }

  // The class must be one that this transport has: a bus has no "business".
  if (!errors.type && !FARES[data.type][data.seatClass]) {
    errors.seatClass = "Choose a class for this transport.";
  }

  return { data, errors };
}

// The admin's list: /api/admin/tickets?status=pending&type=flight&q=paris&page=1&limit=10
export function checkTicketFilters(query) {
  const data = {
    status: readText(query.status),
    type: readText(query.type),
    search: readText(query.q),
    page: query.page === undefined ? 1 : readPositiveInt(query.page),
    limit: query.limit === undefined ? DEFAULT_LIMIT : readPositiveInt(query.limit),
  };
  const errors = {};

  if (data.status && !STATUSES.includes(data.status)) {
    errors.status = "status must be one of: " + STATUSES.join(", ") + ".";
  }
  if (data.type && !TYPES.includes(data.type)) {
    errors.type = "type must be one of: " + TYPES.join(", ") + ".";
  }
  if (data.search.length > 100) errors.q = "q must be 100 characters or fewer.";
  if (data.page === null) errors.page = "page must be a whole number of 1 or more.";
  if (data.limit === null || data.limit > MAX_LIMIT) {
    errors.limit = "limit must be a whole number from 1 to " + MAX_LIMIT + ".";
  }

  return { data, errors };
}
