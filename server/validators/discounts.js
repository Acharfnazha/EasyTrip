// Checks the admin's discount form. Returns the clean data and one message per wrong field.
// The JSON is: { name, percent, appliesTo, customerEmail, startDate, endDate, active, excluded }
//   customerEmail: empty for every customer, or the email of one customer's account
//   startDate, endDate: YYYY-MM-DD, or empty for no limit
//   excluded: the ids of the stays the discount leaves out (only for a discount on stays)
import { APPLIES_TO } from "../utils/discounts.js";
import { EMAIL_FORMAT, isRealDate, readPositiveInt, readText } from "./common.js";

export const MAX_PERCENT = 90; // The same limit as the CHECK rule in the discounts table.
const MAX_EXCLUDED = 500;

export function checkDiscount(body) {
  const percentText = readText(String(body.percent ?? ""));
  const data = {
    name: readText(body.name).replace(/\s+/g, " "),
    percent: /^[0-9]{1,2}$/.test(percentText) ? Number(percentText) : null,
    appliesTo: readText(body.appliesTo),
    customerEmail: readText(body.customerEmail).toLowerCase(),
    startDate: readText(body.startDate) || null,
    endDate: readText(body.endDate) || null,
    active: body.active === true || body.active === "true",
    excluded: [],
  };
  const errors = {};

  if (!data.name) errors.name = "Enter a name the customer will see, like Winter chalet sale.";
  else if (data.name.length > 80) errors.name = "The name must be 80 characters or fewer.";

  if (data.percent === null || data.percent < 1 || data.percent > MAX_PERCENT) {
    errors.percent = `Enter a whole number from 1 to ${MAX_PERCENT}.`;
  }

  if (!APPLIES_TO.includes(data.appliesTo)) errors.appliesTo = "Choose what the discount is for.";

  if (data.customerEmail && (data.customerEmail.length > 254 || !EMAIL_FORMAT.test(data.customerEmail))) {
    errors.customerEmail = "Enter the customer's email, like name@example.com, or leave it empty for every customer.";
  }

  if (data.startDate && !isRealDate(data.startDate)) errors.startDate = "Enter a real date.";
  if (data.endDate && !isRealDate(data.endDate)) errors.endDate = "Enter a real date.";
  if (!errors.startDate && !errors.endDate && data.startDate && data.endDate && data.endDate < data.startDate) {
    errors.endDate = "The last day must be on or after the first day.";
  }

  // The excluded stays only mean something for a discount on stays. For tickets they are dropped.
  const list = Array.isArray(body.excluded) ? body.excluded : [];
  if (data.appliesTo !== "tickets") {
    const ids = list.map((value) => readPositiveInt(String(value)));
    if (ids.includes(null) || ids.length > MAX_EXCLUDED) {
      errors.excluded = "The list of stays to leave out is not valid. Please choose them again.";
    } else {
      data.excluded = [...new Set(ids)];
    }
  }

  return { data, errors };
}
