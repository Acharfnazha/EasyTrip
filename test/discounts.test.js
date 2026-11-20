// Tests of the discounts: which discount a customer gets, the price after it, and the checks on
// the admin's form. Run them with: npm test   (no server and no database needed)
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPercent, bestDiscount, covers } from "../server/utils/discounts.js";
import { checkDiscount } from "../server/validators/discounts.js";

const chalets = { id: 1, name: "Chalet sale", percent: 20, appliesTo: "chalets", excluded: [63] };
const stays = { id: 2, name: "Stays sale", percent: 10, appliesTo: "stays", excluded: [] };
const tickets = { id: 3, name: "Tickets", percent: 15, appliesTo: "tickets", excluded: [] };
const everything = { id: 4, name: "Everything", percent: 5, appliesTo: "everything", excluded: [] };

test("a discount covers only its kind, and not the stays left out", () => {
  assert.equal(covers(chalets, { kind: "stay", type: "chalet", id: 62 }), true);
  assert.equal(covers(chalets, { kind: "stay", type: "chalet", id: 63 }), false); // left out
  assert.equal(covers(chalets, { kind: "stay", type: "hotel", id: 55 }), false);
  assert.equal(covers(chalets, { kind: "ticket" }), false);
  assert.equal(covers(tickets, { kind: "ticket" }), true);
  assert.equal(covers(tickets, { kind: "stay", type: "hotel", id: 55 }), false);
  assert.equal(covers(everything, { kind: "ticket" }), true);
  assert.equal(covers(everything, { kind: "stay", type: "hotel", id: 55 }), true);
});

test("the biggest discount wins, and discounts don't add up", () => {
  const all = [stays, chalets, everything, tickets];
  assert.deepEqual(bestDiscount(all, { kind: "stay", type: "chalet", id: 62 }), { id: 1, name: "Chalet sale", percent: 20 });
  // The left-out chalet still gets the stays discount.
  assert.equal(bestDiscount(all, { kind: "stay", type: "chalet", id: 63 }).percent, 10);
  assert.equal(bestDiscount(all, { kind: "stay", type: "hotel", id: 55 }).percent, 10);
  assert.equal(bestDiscount(all, { kind: "ticket" }).percent, 15);
  assert.equal(bestDiscount([chalets], { kind: "ticket" }), null);
  assert.equal(bestDiscount([], { kind: "stay", type: "hotel", id: 1 }), null);
});

test("the price after a discount is exact to the cent", () => {
  assert.equal(applyPercent("840.00", 20), "672.00");
  assert.equal(applyPercent("880.00", 15), "748.00");
  assert.equal(applyPercent("299.97", 10), "269.97"); // 269.973 -> 269.97
  assert.equal(applyPercent("0.05", 10), "0.05"); // 4.5 cents -> 5 (half a cent goes up)
  assert.equal(applyPercent("100.00", 90), "10.00");
});

test("the discount form is checked", () => {
  const good = { name: "Winter sale", percent: "20", appliesTo: "chalets", customerEmail: "", active: true, excluded: [63, "64", 63] };
  const { data, errors } = checkDiscount(good);
  assert.deepEqual(errors, {});
  assert.deepEqual(data.excluded, [63, 64]); // no repeats
  assert.equal(data.active, true);

  assert.ok(checkDiscount({ ...good, name: "" }).errors.name);
  assert.ok(checkDiscount({ ...good, percent: "0" }).errors.percent);
  assert.ok(checkDiscount({ ...good, percent: "91" }).errors.percent);
  assert.ok(checkDiscount({ ...good, percent: "12.5" }).errors.percent);
  assert.ok(checkDiscount({ ...good, appliesTo: "boats" }).errors.appliesTo);
  assert.ok(checkDiscount({ ...good, customerEmail: "not-an-email" }).errors.customerEmail);
  assert.ok(checkDiscount({ ...good, startDate: "2027-02-30" }).errors.startDate);
  assert.ok(checkDiscount({ ...good, startDate: "2027-02-10", endDate: "2027-02-01" }).errors.endDate);
  assert.ok(checkDiscount({ ...good, excluded: ["abc"] }).errors.excluded);
  // A tickets discount has no stays to leave out.
  assert.deepEqual(checkDiscount({ ...good, appliesTo: "tickets" }).data.excluded, []);
});
