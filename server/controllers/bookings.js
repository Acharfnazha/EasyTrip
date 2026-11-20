// CONTROLLER for the bookings. A logged-in user books a stay and pays with their credit, sees
// their bookings and can cancel one. The admin lists every booking, confirms or cancels it.
// (The admin's routes are in routes/admin.js, behind isAuth and isAdmin.)
// Money comes from MySQL as text ("840.00"). It is only turned into a number for the answer.
import config from "../config.js";
import * as Booking from "../models/booking.js";
import * as IdDocument from "../models/id-document.js";
import { checkBooking, checkBookingFilters, checkBookingStatus } from "../validators/bookings.js";
import { hasErrors, readPositiveInt, today } from "../validators/common.js";
import { money } from "../utils/money.js";
import * as notices from "../utils/notices.js";

// A booking as the pages receive it. withUser adds who booked it (for the admin only).
function bookingJson(row, withUser) {
  const booking = {
    id: row.booking_id,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    nights: row.nights,
    travelers: row.travelers,
    total: Number(row.total_price),
    discountPercent: row.discount_percent ?? null,
    // null for a booking made before credit existed: nothing was paid, so nothing is refunded.
    paidWithCredit: row.paid_with_credit === null ? null : Number(row.paid_with_credit),
    createdAt: row.created_at,
    stay: {
      id: row.acc_id,
      name: row.stay_name,
      type: row.stay_type,
      image: row.image,
      imageAlt: row.image_alt,
      location: row.dest_name === row.country ? row.country : row.dest_name + ", " + row.country,
    },
  };
  if (withUser) {
    booking.user = {
      id: row.user_id,
      name: (row.first_name + " " + row.last_name).trim(),
      email: row.email,
    };
  }
  return booking;
}

function readId(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) res.status(400).json({ error: "The booking id must be a whole number of 1 or more." });
  return id;
}

function notFound(res) {
  res.status(404).json({ error: "This booking does not exist." });
}

// ---------- For a logged-in user ----------

// POST /api/bookings  (JSON: accId, startDate, endDate, travelers)
export async function createBooking(req, res) {
  const { data, errors } = checkBooking(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  // Only a user whose identity an admin verified can book a stay (REQUIRE_VERIFIED_ID in .env).
  if (config.requireVerifiedId && !(await IdDocument.isVerified(req.user.user_id))) {
    return res.status(403).json({
      error: "Verify your identity before you book a stay: on My account, save your identity document " +
        "and send a selfie. Our team checks it, usually within a day.",
      code: "not-verified",
    });
  }

  const result = await Booking.createWithCredit({ ...data, userId: req.user.user_id, today: today() });

  if (result.problem === "no-stay") {
    return res.status(404).json({ error: "This stay does not exist (it may have been removed)." });
  }
  if (result.problem === "dates-taken") {
    return res.status(409).json({
      error: "Please choose other dates.",
      code: "dates-taken",
      fields: { startDate: "Some of these nights are already booked. Choose other dates." },
    });
  }
  if (result.problem === "no-credit") {
    const missing = (Number(result.total) - Number(result.credit)).toFixed(2);
    return res.status(409).json({
      error: `This stay costs ${money(result.total)} and you have ${money(result.credit)} of credit. ` +
        `You need ${money(missing)} more. Ask the EasyTrip team to add credit to your account.`,
      code: "no-credit",
      total: Number(result.total),
      credit: Number(result.credit),
    });
  }

  const row = await Booking.findById(result.bookingId);
  notices.bookingSaved(row, result.credit); // Emails, sent in the background.
  res.status(201).json({
    message: `Your booking is saved${result.discount ? ` with ${result.discount.percent}% off (${result.discount.name})` : ""}. ` +
      `${money(result.total)} was taken from your credit, and ` +
      `${money(result.credit)} is left. We will confirm it soon.`,
    booking: bookingJson(row, false),
    credit: Number(result.credit),
  });
}

// GET /api/bookings/mine
export async function getMyBookings(req, res) {
  const rows = await Booking.findByUser(req.user.user_id);
  res.json({ bookings: rows.map((row) => bookingJson(row, false)) });
}

// POST /api/bookings/:id/cancel: a user cancels their own booking, before the stay starts.
// The credit that paid for it comes back.
export async function cancelMyBooking(req, res) {
  const id = readId(req, res);
  if (!id) return;

  // Someone else's booking answers like one that doesn't exist, so ids can't be explored.
  const row = await Booking.findById(id);
  if (!row || row.user_id !== req.user.user_id) return notFound(res);
  if (row.start_date <= today()) {
    return res.status(409).json({ error: "This stay has already started, so it can't be cancelled here. Send us a message instead." });
  }

  const result = await Booking.cancelWithRefund(id, null);
  if (result.problem === "not-found") return notFound(res);
  if (result.problem === "already-cancelled") {
    return res.status(409).json({ error: "This booking is already cancelled." });
  }

  const refunded = Number(result.refunded);
  const cancelled = await Booking.findById(id);
  notices.bookingCancelled(cancelled, result.refunded, false);
  res.json({
    message: refunded > 0
      ? `Your booking is cancelled, and ${money(result.refunded)} is back in your credit.`
      : "Your booking is cancelled.",
    booking: bookingJson(cancelled, false),
    refunded: refunded,
  });
}

// ---------- For everyone ----------

// GET /api/stays/:id/booked-dates: the nights of a stay that are already taken, so the booking
// form can say so before it is sent. Only dates, never who booked.
export async function getBookedDates(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "The stay id must be a whole number of 1 or more." });
  }
  const rows = await Booking.findBookedDates(id);
  res.json({ booked: rows.map((row) => ({ startDate: row.start_date, endDate: row.end_date })) });
}

// ---------- For the admin ----------

// GET /api/admin/bookings?status=&q=&page=&limit=
export async function listBookings(req, res) {
  const { data, errors } = checkBookingFilters(req.query);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Some list values are wrong.", fields: errors });
  }
  const { rows, total } = await Booking.findAll(data);
  res.json({
    bookings: rows.map((row) => bookingJson(row, true)),
    pagination: { page: data.page, limit: data.limit, total: total, totalPages: Math.ceil(total / data.limit) },
  });
}

// PATCH /api/admin/bookings/:id  (JSON: status = "confirmed" or "cancelled")
// Cancelling gives the customer's credit back.
export async function changeBookingStatus(req, res) {
  const id = readId(req, res);
  if (!id) return;
  const { data, errors } = checkBookingStatus(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "This status can't be chosen.", fields: errors });
  }

  const row = await Booking.findById(id);
  if (!row) return notFound(res);

  let message;
  if (data.status === "confirmed") {
    if (!(await Booking.confirm(id))) {
      return res.status(409).json({ error: `Only a pending booking can be confirmed. This one is ${row.status}.` });
    }
    message = "The booking is confirmed.";
    notices.bookingConfirmed(row);
  } else {
    const result = await Booking.cancelWithRefund(id, req.user.user_id);
    if (result.problem === "not-found") return notFound(res);
    if (result.problem === "already-cancelled") {
      return res.status(409).json({ error: "This booking is already cancelled." });
    }
    message = Number(result.refunded) > 0
      ? `The booking is cancelled, and ${money(result.refunded)} went back to the customer's credit.`
      : "The booking is cancelled. It was made before credit existed, so nothing was refunded.";
    notices.bookingCancelled(row, result.refunded, true);
  }

  res.json({ message: message, booking: bookingJson(await Booking.findById(id), true) });
}
