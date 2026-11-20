// CONTROLLER for the users' credit: the money an admin gives an account, which the user spends
// on bookings. A user sees their own credit and its history. The admin lists the accounts, adds
// or removes credit, and sees one account's history (routes/admin.js, behind isAuth and isAdmin).
import * as Credit from "../models/credit.js";
import * as User from "../models/user.js";
import { checkCreditChange, checkUserFilters, MAX_CREDIT } from "../validators/credit.js";
import { hasErrors, readPositiveInt } from "../validators/common.js";
import { money } from "../utils/money.js";
import * as notices from "../utils/notices.js";

const HISTORY_ROWS = 30;

// One line of the credit history. Money comes from MySQL as text ("200.00").
function transactionJson(row) {
  return {
    id: row.transaction_id,
    type: row.type, // top_up, deduction, booking, ticket or refund
    amount: Number(row.amount), // above zero: credit added; below zero: credit used
    balanceAfter: Number(row.balance_after),
    stay: row.stay_name, // the stay's name, for a booking or its refund (or null)
    // the ticket's transport and route, for a ticket or its refund (or null)
    ticket: row.ticket_type ? { type: row.ticket_type, origin: row.ticket_origin, destination: row.ticket_destination } : null,
    note: row.note,
    createdAt: row.created_at,
  };
}

// GET /api/credit/mine  (logged in): the user's credit and its latest changes.
export async function getMyCredit(req, res) {
  const rows = await Credit.findByUser(req.user.user_id, HISTORY_ROWS);
  res.json({ credit: Number(req.user.credit), history: rows.map(transactionJson) });
}

// ---------- For the admin ----------

// GET /api/admin/users?q=&page=&limit=
export async function listUsers(req, res) {
  const { data, errors } = checkUserFilters(req.query);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Some list values are wrong.", fields: errors });
  }
  const { rows, total } = await User.findAllForAdmin(data);
  res.json({
    users: rows.map((row) => ({
      id: row.user_id,
      name: (row.first_name + " " + row.last_name).trim(),
      email: row.email,
      role: row.role,
      credit: Number(row.credit),
      bookings: row.booking_count,
      tickets: row.ticket_count,
      idStatus: row.id_status, // null (no document), unverified, pending, verified or rejected
      isYou: row.user_id === req.user.user_id, // the admin can't change or delete their own account
      createdAt: row.created_at,
    })),
    pagination: { page: data.page, limit: data.limit, total: total, totalPages: Math.ceil(total / data.limit) },
  });
}

// Reads the user in the URL. Answers 400 or 404 itself and returns undefined when there is none.
async function readUser(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) {
    res.status(400).json({ error: "The user id must be a whole number of 1 or more." });
    return undefined;
  }
  const user = await User.findById(id);
  if (!user) res.status(404).json({ error: "This account does not exist (it may have been deleted)." });
  return user;
}

// GET /api/admin/users/:id/credit: one account's credit and its latest changes.
export async function getUserCredit(req, res) {
  const user = await readUser(req, res);
  if (!user) return;
  const rows = await Credit.findByUser(user.user_id, HISTORY_ROWS);
  res.json({ credit: Number(user.credit), history: rows.map(transactionJson) });
}

// POST /api/admin/users/:id/credit  (JSON: action = "add" or "remove", amount, note)
export async function changeUserCredit(req, res) {
  const user = await readUser(req, res);
  if (!user) return;

  const { data, errors } = checkCreditChange(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  const adding = data.action === "add";
  const newCredit = await Credit.changeByAdmin(
    user.user_id,
    adding ? data.amount : "-" + data.amount,
    adding ? "top_up" : "deduction",
    req.user.user_id,
    data.note,
    MAX_CREDIT
  );

  // null: MySQL refused the change, because the credit would leave its limits.
  if (newCredit === null) {
    return res.status(409).json({
      error: "Please correct the highlighted fields.",
      fields: {
        amount: adding
          ? `An account can hold ${money(MAX_CREDIT)} at most. This account has ${money(user.credit)}.`
          : `This account only has ${money(user.credit)}, so you can't remove ${money(data.amount)}.`,
      },
    });
  }

  notices.creditChanged(user, adding, data.amount, newCredit, data.note); // An email, in the background.

  const name = (user.first_name + " " + user.last_name).trim();
  const rows = await Credit.findByUser(user.user_id, HISTORY_ROWS);
  res.status(201).json({
    message: adding
      ? `${money(data.amount)} was added to ${name}'s credit. It is now ${money(newCredit)}.`
      : `${money(data.amount)} was removed from ${name}'s credit. It is now ${money(newCredit)}.`,
    credit: Number(newCredit),
    history: rows.map(transactionJson),
  });
}
