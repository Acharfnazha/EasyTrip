// Checks the search, filter, sort and page values that the stays list receives in the URL,
// for example /api/stays?type=chalet&q=Lebanon&maxPrice=300&sort=price-asc&page=2&limit=9
import { readText, readPositiveInt, isRealDate, today } from "./common.js";
import { nightsBetween, MAX_NIGHTS } from "./bookings.js";

const SEASONS = ["winter", "spring", "summer", "autumn"];

// The allowed values. They are the same as the ENUMs in database/schema.sql and the
// options in the filter forms of hotels.html and chalets.html.
const TYPES = ["hotel", "chalet"];
const SETTINGS = ["mountain", "coastal", "countryside", "forest", "desert", "tropical"];
const SORTS = ["recommended", "price-asc", "price-desc", "name-asc"];

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50; // So nobody can ask for the whole table in one request.

// Reads a price like "300" or "299.50". Returns null when it is missing, NaN when it is wrong.
function readPrice(value) {
  const text = readText(value);
  if (text === "") return null;
  return /^[0-9]{1,6}(\.[0-9]{1,2})?$/.test(text) ? Number(text) : NaN;
}

// Returns the clean filters and one message per wrong value (an empty errors object means valid).
// A filter that is missing means "no filter".
export function checkStayFilters(query) {
  const data = {
    type: readText(query.type),
    search: readText(query.q),
    setting: readText(query.setting),
    minPrice: readPrice(query.minPrice),
    maxPrice: readPrice(query.maxPrice),
    // A season (the destination's), and dates: only the stays free on every night between them.
    season: readText(query.season),
    start: readText(query.start),
    end: readText(query.end),
    sort: readText(query.sort) || "recommended",
    page: query.page === undefined ? 1 : readPositiveInt(query.page),
    limit: query.limit === undefined ? DEFAULT_LIMIT : readPositiveInt(query.limit),
  };
  const errors = {};

  if (data.type && !TYPES.includes(data.type)) {
    errors.type = "type must be hotel or chalet.";
  }
  if (data.search.length > 100) {
    errors.q = "q must be 100 characters or fewer.";
  }
  if (data.setting && !SETTINGS.includes(data.setting)) {
    errors.setting = "setting must be one of: " + SETTINGS.join(", ") + ".";
  }
  if (Number.isNaN(data.minPrice)) {
    errors.minPrice = "minPrice must be a price, like 150 or 150.50.";
  }
  if (Number.isNaN(data.maxPrice)) {
    errors.maxPrice = "maxPrice must be a price, like 300 or 300.50.";
  }
  if (data.minPrice !== null && data.maxPrice !== null && data.minPrice > data.maxPrice) {
    errors.minPrice = "minPrice can't be more than maxPrice.";
  }
  if (data.season && !SEASONS.includes(data.season)) {
    errors.season = "season must be one of: " + SEASONS.join(", ") + ".";
  }
  // The dates come together, or not at all.
  if (data.start || data.end) {
    if (!isRealDate(data.start)) errors.start = "start must be a date, like 2027-01-18.";
    else if (data.start < today()) errors.start = "start can't be in the past.";
    if (!isRealDate(data.end)) errors.end = "end must be a date, like 2027-01-20.";
    else if (!errors.start) {
      const nights = nightsBetween(data.start, data.end);
      if (nights < 1) errors.end = "end must be after start.";
      else if (nights > MAX_NIGHTS) errors.end = "A stay can be " + MAX_NIGHTS + " nights at most.";
    }
  }
  if (!SORTS.includes(data.sort)) {
    errors.sort = "sort must be one of: " + SORTS.join(", ") + ".";
  }
  if (data.page === null) {
    errors.page = "page must be a whole number of 1 or more.";
  }
  if (data.limit === null || data.limit > MAX_LIMIT) {
    errors.limit = "limit must be a whole number from 1 to " + MAX_LIMIT + ".";
  }

  return { data, errors };
}

const MAX_PRICE = 10000;

// Checks the admin's form to add or edit a stay. The lengths are the column sizes in
// database/schema.sql. imageRequired is true when adding (a new stay needs an image) and
// false when editing (no new image keeps the old one).
export function checkStayForm(body, file, imageRequired) {
  const data = {
    name: readText(body.name),
    type: readText(body.type),
    destId: readPositiveInt(body.destId),
    category: readText(body.category),
    setting: readText(body.setting),
    price: readPrice(body.price),
    description: readText(body.description),
    imageAlt: readText(body.imageAlt),
  };
  const errors = {};

  if (!data.name) errors.name = "Enter the name of the stay.";
  else if (data.name.length > 100) errors.name = "The name must be 100 characters or fewer.";

  if (!TYPES.includes(data.type)) errors.type = "Choose hotel or chalet.";

  if (!data.destId) errors.destId = "Choose a destination.";

  // Only chalets have a category ("Cabin") and a setting ("mountain"), for the "Cabin · Mountain"
  // label and the Setting filter. Hotels save NULL in both columns.
  if (data.type === "chalet") {
    if (!data.category) errors.category = "Enter the kind of chalet, for example Cabin or Villa.";
    else if (data.category.length > 30) errors.category = "The kind must be 30 characters or fewer.";
    if (!SETTINGS.includes(data.setting)) errors.setting = "Choose the setting.";
  } else {
    data.category = null;
    data.setting = null;
  }

  if (data.price === null) errors.price = "Enter the price per night.";
  else if (Number.isNaN(data.price) || data.price < 1 || data.price > MAX_PRICE) {
    errors.price = `Enter a price from 1 to ${MAX_PRICE} dollars, like 250 or 249.99.`;
  }

  if (!data.description) errors.description = "Enter a short description.";
  else if (data.description.length > 255) errors.description = "The description must be 255 characters or fewer.";

  if (!data.imageAlt) errors.imageAlt = "Describe the image for visitors who can't see it.";
  else if (data.imageAlt.length > 255) errors.imageAlt = "The description must be 255 characters or fewer.";

  if (imageRequired && !file) errors.image = "Choose an image (JPG, PNG or WebP, 2 MB or smaller).";

  return { data, errors };
}
