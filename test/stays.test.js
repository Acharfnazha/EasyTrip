// Tests of the stays search's filters (GET /api/stays): the season, and the dates that keep only
// the stays free on every night between them. Run them with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkStayFilters } from "../server/validators/stays.js";
import { isoDate } from "../server/validators/common.js";

function inDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

test("a season and two dates are accepted", () => {
  const { data, errors } = checkStayFilters({ season: "summer", start: inDays(10), end: inDays(13) });
  assert.deepEqual(errors, {});
  assert.equal(data.season, "summer");
  assert.equal(data.start, inDays(10));
});

test("no type means hotels and chalets together", () => {
  assert.deepEqual(checkStayFilters({}).errors, {});
  assert.equal(checkStayFilters({}).data.type, "");
});

test("an unknown season is refused", () => {
  assert.ok(checkStayFilters({ season: "monsoon" }).errors.season);
});

test("the dates come together, in order, from today, for 30 nights at most", () => {
  assert.ok(checkStayFilters({ start: inDays(5) }).errors.end);
  assert.ok(checkStayFilters({ end: inDays(5) }).errors.start);
  assert.ok(checkStayFilters({ start: inDays(5), end: inDays(5) }).errors.end);
  assert.ok(checkStayFilters({ start: inDays(-1), end: inDays(2) }).errors.start);
  assert.ok(checkStayFilters({ start: inDays(5), end: inDays(40) }).errors.end);
  assert.ok(checkStayFilters({ start: "2027-02-30", end: "2027-03-02" }).errors.start);
});
