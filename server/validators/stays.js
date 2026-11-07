// Checks the search, filter, sort and page values that the stays list receives in the URL,
// for example /api/stays?type=chalet&q=Lebanon&maxPrice=300&sort=price-asc&page=2&limit=9
import { readText, readPositiveInt } from "./common.js";

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
