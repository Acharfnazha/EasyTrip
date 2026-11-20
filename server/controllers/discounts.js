// CONTROLLER for the discounts. Only an admin manages them: these routes are in routes/admin.js,
// behind isAuth and isAdmin. The customers get them on the stay cards, the booking and the
// tickets (controllers/stays.js, bookings.js and tickets.js, with utils/discounts.js).
import * as Discount from "../models/discount.js";
import * as Accommodation from "../models/accommodation.js";
import * as User from "../models/user.js";
import { checkDiscount } from "../validators/discounts.js";
import { hasErrors, readPositiveInt, today } from "../validators/common.js";

// Where a discount is now: "on" (it works today), "scheduled" (it starts later), "ended",
// or "off" (the admin turned it off).
function stateOf(row, day) {
  if (!row.is_active) return "off";
  if (row.start_date && row.start_date > day) return "scheduled";
  if (row.end_date && row.end_date < day) return "ended";
  return "on";
}

function discountJson(row) {
  return {
    id: row.discount_id,
    name: row.name,
    percent: row.percent,
    appliesTo: row.applies_to,
    active: Boolean(row.is_active),
    state: stateOf(row, today()),
    startDate: row.start_date,
    endDate: row.end_date,
    customer: row.user_id === null ? null : {
      id: row.user_id,
      name: (row.first_name + " " + row.last_name).trim(),
      email: row.email,
    },
    excluded: row.excluded,
    createdAt: row.created_at,
  };
}

function readId(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) res.status(400).json({ error: "The discount id must be a whole number of 1 or more." });
  return id;
}

function formErrors(res, fields) {
  return res.status(400).json({ error: "Please correct the highlighted fields.", fields: fields });
}

// Checks the form, and finds the customer's account from the email. Returns { data, errors },
// with data.userId (null: every customer).
async function readForm(req) {
  const { data, errors } = checkDiscount(req.body || {});
  data.userId = null;
  if (data.customerEmail && !errors.customerEmail) {
    const user = await User.findByEmail(data.customerEmail);
    if (!user) errors.customerEmail = "No account uses this email. Check it, or leave it empty for every customer.";
    else if (user.role !== "customer") errors.customerEmail = "This is an admin account. Choose a customer.";
    else data.userId = user.user_id;
  }
  return { data, errors };
}

// A stay in the excluded list was deleted meanwhile: the foreign key refuses the row.
function isMissingStay(error) {
  return error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_NO_REFERENCED_ROW";
}

// GET /api/admin/discounts: every discount, and what the form needs: the stays (to leave some out)
// and the customers (suggested in the email field).
export async function listDiscounts(req, res) {
  const [rows, stays, customers] = await Promise.all([
    Discount.findAll(), Accommodation.findAllShort(), User.findCustomersShort(),
  ]);
  res.json({
    discounts: rows.map(discountJson),
    stays: stays.map((row) => ({
      id: row.acc_id,
      name: row.name,
      type: row.type,
      location: row.dest_name === row.country ? row.country : row.dest_name + ", " + row.country,
    })),
    customers: customers.map((row) => ({
      id: row.user_id,
      name: (row.first_name + " " + row.last_name).trim(),
      email: row.email,
    })),
  });
}

// POST /api/admin/discounts
export async function createDiscount(req, res) {
  const { data, errors } = await readForm(req);
  if (hasErrors(errors)) return formErrors(res, errors);
  let id;
  try {
    id = await Discount.create(data);
  } catch (error) {
    if (isMissingStay(error)) return formErrors(res, { excluded: "One of the chosen stays was deleted. Please choose them again." });
    throw error;
  }
  const row = await Discount.findById(id);
  res.status(201).json({ message: `The discount "${row.name}" was added.`, discount: discountJson(row) });
}

// PUT /api/admin/discounts/:id
export async function updateDiscount(req, res) {
  const id = readId(req, res);
  if (!id) return;
  const { data, errors } = await readForm(req);
  if (hasErrors(errors)) return formErrors(res, errors);
  try {
    if (!(await Discount.update(id, data))) {
      return res.status(404).json({ error: "This discount does not exist." });
    }
  } catch (error) {
    if (isMissingStay(error)) return formErrors(res, { excluded: "One of the chosen stays was deleted. Please choose them again." });
    throw error;
  }
  const row = await Discount.findById(id);
  res.json({ message: `The discount "${row.name}" was saved.`, discount: discountJson(row) });
}

// DELETE /api/admin/discounts/:id. Bookings and tickets already paid keep their price.
export async function deleteDiscount(req, res) {
  const id = readId(req, res);
  if (!id) return;
  if (!(await Discount.deleteById(id))) {
    return res.status(404).json({ error: "This discount does not exist." });
  }
  res.json({ message: "The discount was deleted. Bookings and tickets already paid keep their price." });
}
