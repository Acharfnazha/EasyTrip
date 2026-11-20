// CONTROLLER for the tickets (flights, buses and trains). A logged-in user buys a ticket with
// their credit, sees their tickets and can cancel one. The admin lists every ticket, confirms
// or cancels it (routes/admin.js, behind isAuth and isAdmin).
// EasyTrip has no real schedules, so the price is a sample fare from utils/fares.js.
import config from "../config.js";
import * as Ticket from "../models/ticket.js";
import * as IdDocument from "../models/id-document.js";
import * as Discount from "../models/discount.js";
import { checkTicket, checkTicketFilters } from "../validators/tickets.js";
import { checkBookingStatus } from "../validators/bookings.js";
import { hasErrors, readPositiveInt, today } from "../validators/common.js";
import { FARES, ticketPrice } from "../utils/fares.js";
import { money } from "../utils/money.js";
import { applyPercent, bestDiscount } from "../utils/discounts.js";
import * as notices from "../utils/notices.js";

// A ticket as the pages receive it. withUser adds who bought it (for the admin only).
function ticketJson(row, withUser) {
  const ticket = {
    id: row.ticket_id,
    type: row.type,
    origin: row.origin,
    destination: row.destination,
    tripType: row.trip_type,
    departDate: row.depart_date,
    returnDate: row.return_date,
    travelers: row.travelers,
    seatClass: row.seat_class,
    status: row.status,
    // null for a plan saved before tickets had a price: nothing was paid, so nothing is refunded.
    total: row.total_price === null ? null : Number(row.total_price),
    discountPercent: row.discount_percent ?? null,
    paidWithCredit: row.paid_with_credit === null ? null : Number(row.paid_with_credit),
    createdAt: row.created_at,
  };
  if (withUser) {
    ticket.user = {
      id: row.user_id,
      name: (row.first_name + " " + row.last_name).trim(),
      email: row.email,
    };
  }
  return ticket;
}

function readId(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) res.status(400).json({ error: "The ticket id must be a whole number of 1 or more." });
  return id;
}

function notFound(res) {
  res.status(404).json({ error: "This ticket does not exist." });
}

// ---------- For everyone ----------

// The discount on tickets for this customer today ({ id, name, percent }), or null.
async function ticketDiscount(user) {
  const discounts = await Discount.findCurrentFor(user ? user.user_id : null, today());
  return bestDiscount(discounts, { kind: "ticket" });
}

// GET /api/tickets/fares: the sample fares, so the pages show what the server will charge, and
// the discount on tickets that this visitor or customer gets today (or null).
export async function getFares(req, res) {
  const discount = await ticketDiscount(req.user);
  res.json({ fares: FARES, discount: discount && { name: discount.name, percent: discount.percent } });
}

// ---------- For a logged-in user ----------

// POST /api/tickets  (JSON: type, origin, destination, tripType, departDate, returnDate,
// travelers, seatClass)
export async function createTicket(req, res) {
  const { data, errors } = checkTicket(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  // Only a user whose identity an admin verified can buy a ticket (REQUIRE_VERIFIED_ID in .env).
  if (config.requireVerifiedId && !(await IdDocument.isVerified(req.user.user_id))) {
    return res.status(403).json({
      error: "Verify your identity before you buy a ticket: on My account, save your identity document " +
        "and send a selfie. Our team checks it, usually within a day.",
      code: "not-verified",
    });
  }

  // The price never comes from the browser: it is worked out here, from the fares.
  // Then the customer's discount on tickets, if they have one today (utils/discounts.js).
  const fullPrice = ticketPrice(data.type, data.seatClass, data.travelers, data.tripType === "round").toFixed(2);
  const discount = await ticketDiscount(req.user);
  const total = discount ? applyPercent(fullPrice, discount.percent) : fullPrice;

  let result;
  try {
    result = await Ticket.createWithCredit({
      ...data, userId: req.user.user_id, total: total, discountPercent: discount ? discount.percent : null,
    });
  } catch (error) {
    // The database compares the two places in its own way (it ignores capitals and accents).
    // In the rare case it finds them equal when the check above didn't, it refuses the row.
    if (error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      return res.status(400).json({
        error: "Please correct the highlighted fields.",
        fields: { destination: "Choose a destination that is different from where you are leaving from." },
      });
    }
    throw error;
  }

  if (result.problem === "no-credit") {
    const missing = (Number(total) - Number(result.credit)).toFixed(2);
    return res.status(409).json({
      error: `This ticket costs ${money(total)} and you have ${money(result.credit)} of credit. ` +
        `You need ${money(missing)} more. Ask the EasyTrip team to add credit to your account.`,
      code: "no-credit",
      total: Number(total),
      credit: Number(result.credit),
    });
  }

  const row = await Ticket.findById(result.ticketId);
  notices.ticketSaved(row, result.credit);
  res.status(201).json({
    message: `Your ticket is saved${discount ? ` with ${discount.percent}% off (${discount.name})` : ""}. ` +
      `${money(total)} was taken from your credit, and ` +
      `${money(result.credit)} is left. We will confirm it soon.`,
    ticket: ticketJson(row, false),
    credit: Number(result.credit),
  });
}

// GET /api/tickets/mine
export async function getMyTickets(req, res) {
  const rows = await Ticket.findByUser(req.user.user_id);
  res.json({ tickets: rows.map((row) => ticketJson(row, false)) });
}

// POST /api/tickets/:id/cancel: a user cancels their own ticket, before the departure day.
// The credit that paid for it comes back.
export async function cancelMyTicket(req, res) {
  const id = readId(req, res);
  if (!id) return;

  // Someone else's ticket answers like one that doesn't exist, so ids can't be explored.
  const row = await Ticket.findById(id);
  if (!row || row.user_id !== req.user.user_id) return notFound(res);
  if (row.depart_date <= today()) {
    return res.status(409).json({ error: "The departure day has come, so this ticket can't be cancelled here. Send us a message instead." });
  }

  const result = await Ticket.cancelWithRefund(id, null);
  if (result.problem === "not-found") return notFound(res);
  if (result.problem === "already-cancelled") {
    return res.status(409).json({ error: "This ticket is already cancelled." });
  }

  const refunded = Number(result.refunded);
  const cancelled = await Ticket.findById(id);
  notices.ticketCancelled(cancelled, result.refunded, false);
  res.json({
    message: refunded > 0
      ? `Your ticket is cancelled, and ${money(result.refunded)} is back in your credit.`
      : "Your ticket is cancelled.",
    ticket: ticketJson(cancelled, false),
    refunded: refunded,
  });
}

// ---------- For the admin ----------

// GET /api/admin/tickets?status=&type=&q=&page=&limit=
export async function listTickets(req, res) {
  const { data, errors } = checkTicketFilters(req.query);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Some list values are wrong.", fields: errors });
  }
  const { rows, total } = await Ticket.findAll(data);
  res.json({
    tickets: rows.map((row) => ticketJson(row, true)),
    pagination: { page: data.page, limit: data.limit, total: total, totalPages: Math.ceil(total / data.limit) },
  });
}

// PATCH /api/admin/tickets/:id  (JSON: status = "confirmed" or "cancelled")
// The same two choices as for a booking. Cancelling gives the customer's credit back.
export async function changeTicketStatus(req, res) {
  const id = readId(req, res);
  if (!id) return;
  const { data, errors } = checkBookingStatus(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "This status can't be chosen.", fields: errors });
  }

  const row = await Ticket.findById(id);
  if (!row) return notFound(res);

  let message;
  if (data.status === "confirmed") {
    if (!(await Ticket.confirm(id))) {
      return res.status(409).json({ error: `Only a pending ticket can be confirmed. This one is ${row.status}.` });
    }
    message = "The ticket is confirmed.";
    notices.ticketConfirmed(row);
  } else {
    const result = await Ticket.cancelWithRefund(id, req.user.user_id);
    if (result.problem === "not-found") return notFound(res);
    if (result.problem === "already-cancelled") {
      return res.status(409).json({ error: "This ticket is already cancelled." });
    }
    message = Number(result.refunded) > 0
      ? `The ticket is cancelled, and ${money(result.refunded)} went back to the customer's credit.`
      : "The ticket is cancelled. It was not paid with credit, so nothing was refunded.";
    notices.ticketCancelled(row, result.refunded, true);
  }

  res.json({ message: message, ticket: ticketJson(await Ticket.findById(id), true) });
}
