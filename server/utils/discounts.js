// Which discount a customer gets, and what it takes off. These are plain functions (no database),
// so the stay cards, the booking and the ticket all use the same rule, and the tests can check it.
//
// A discount (from models/discount.js) looks like
//   { id, name, percent, appliesTo, excluded: [acc_id, ...] }
// appliesTo is "everything", "stays", "hotels", "chalets" or "tickets". The excluded stays are the
// ones the admin left out (for example two chalets of a chalets discount).

export const APPLIES_TO = ["everything", "stays", "hotels", "chalets", "tickets"];

// true when the discount is for this thing. item is { kind: "stay", type: "hotel" or "chalet", id }
// or { kind: "ticket" }.
export function covers(discount, item) {
  if (item.kind === "ticket") return discount.appliesTo === "everything" || discount.appliesTo === "tickets";
  const forType = {
    everything: true,
    stays: true,
    hotels: item.type === "hotel",
    chalets: item.type === "chalet",
    tickets: false,
  };
  return forType[discount.appliesTo] === true && !discount.excluded.includes(item.id);
}

// The discount the customer gets for this thing: the biggest one that covers it (discounts never
// add up), or null. Returns only what the pages may see: { id, name, percent }.
export function bestDiscount(discounts, item) {
  let best = null;
  for (const discount of discounts) {
    if (covers(discount, item) && (!best || discount.percent > best.percent)) best = discount;
  }
  return best ? { id: best.id, name: best.name, percent: best.percent } : null;
}

// The amount after the discount, as text with 2 decimals: ("840.00", 20) -> "672.00".
// It is worked out in whole cents, and half a cent goes up, so the page and the server agree.
export function applyPercent(amount, percent) {
  const cents = Math.round(Number(amount) * 100);
  return (Math.round((cents * (100 - percent)) / 100) / 100).toFixed(2);
}
