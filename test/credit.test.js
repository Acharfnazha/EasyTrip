// Tests of credit, bookings and tickets: the sample fares, the checks on what a user or an admin
// sends, and the emails that are written afterwards.
// Run them with: npm test   (no server and no database needed, and NO email is sent: the tests
// only read what the emails would say)
import { test } from "node:test";
import assert from "node:assert/strict";
import { FARES, ticketPrice } from "../server/utils/fares.js";
import { money } from "../server/utils/money.js";
import { buildNotice, canGetEmail } from "../server/utils/mailer.js";
import { write } from "../server/utils/notices.js";
import { isoDate, today } from "../server/validators/common.js";
import { checkBooking, checkBookingStatus, nightsBetween, MAX_NIGHTS } from "../server/validators/bookings.js";
import { checkTicket } from "../server/validators/tickets.js";
import { checkCreditChange, MAX_CHANGE } from "../server/validators/credit.js";

// A date some days from today, as YYYY-MM-DD.
function inDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

// ---------- Money and fares ----------

test("money is written without cents for a whole amount, and with two for the rest", () => {
  assert.equal(money("560.00"), "$560");
  assert.equal(money("1000.50"), "$1,000.50");
  assert.equal(money(0), "$0");
});

test("a ticket's price is the fare for every traveler, twice for a round trip", () => {
  assert.equal(ticketPrice("flight", "economy", 1, false), FARES.flight.economy);
  assert.equal(ticketPrice("flight", "economy", 2, true), FARES.flight.economy * 4);
  assert.equal(ticketPrice("bus", "standard", 3, false), FARES.bus.standard * 3);
});

test("a class that the transport doesn't have has no price", () => {
  assert.equal(ticketPrice("bus", "business", 1, false), null);
  assert.equal(ticketPrice("train", "economy", 1, false), null);
  assert.equal(ticketPrice("boat", "standard", 1, false), null);
});

// ---------- Booking a stay ----------

test("nights are counted between two days", () => {
  assert.equal(nightsBetween("2027-01-18", "2027-01-20"), 2);
  assert.equal(nightsBetween("2027-03-27", "2027-03-29"), 2); // across the clock change
  assert.equal(nightsBetween("2027-01-20", "2027-01-20"), 0);
});

test("a correct booking passes, and its nights are worked out", () => {
  const { data, errors } = checkBooking({ accId: 28, startDate: inDays(10), endDate: inDays(13), travelers: "2" });
  assert.deepEqual(errors, {});
  assert.equal(data.nights, 3);
  assert.equal(data.accId, 28);
  assert.equal(data.travelers, 2);
});

test("a booking can start today, but not yesterday", () => {
  assert.equal(checkBooking({ accId: 1, startDate: today(), endDate: inDays(1), travelers: 1 }).errors.startDate, undefined);
  assert.ok(checkBooking({ accId: 1, startDate: inDays(-1), endDate: inDays(1), travelers: 1 }).errors.startDate);
});

test("a booking needs a check-out after the check-in, and at most 30 nights", () => {
  assert.ok(checkBooking({ accId: 1, startDate: inDays(5), endDate: inDays(5), travelers: 1 }).errors.endDate);
  assert.ok(checkBooking({ accId: 1, startDate: inDays(5), endDate: inDays(4), travelers: 1 }).errors.endDate);
  assert.ok(checkBooking({ accId: 1, startDate: inDays(5), endDate: inDays(5 + MAX_NIGHTS + 1), travelers: 1 }).errors.endDate);
  assert.equal(checkBooking({ accId: 1, startDate: inDays(5), endDate: inDays(5 + MAX_NIGHTS), travelers: 1 }).errors.endDate, undefined);
});

test("a booking refuses dates that don't exist, more than a year ahead, and 0 or 10 travelers", () => {
  assert.ok(checkBooking({ accId: 1, startDate: "2027-02-30", endDate: "2027-03-02", travelers: 1 }).errors.startDate);
  assert.ok(checkBooking({ accId: 1, startDate: inDays(400), endDate: inDays(402), travelers: 1 }).errors.startDate);
  assert.ok(checkBooking({ accId: 1, startDate: inDays(5), endDate: inDays(6), travelers: 0 }).errors.travelers);
  assert.ok(checkBooking({ accId: 1, startDate: inDays(5), endDate: inDays(6), travelers: 10 }).errors.travelers);
});

test("a booking ignores a price sent by the browser", () => {
  const { data } = checkBooking({ accId: 1, startDate: inDays(5), endDate: inDays(6), travelers: 1, total: 1, price: 0 });
  assert.equal("total" in data, false);
  assert.equal("price" in data, false);
});

test("the admin can only choose confirmed or cancelled", () => {
  assert.deepEqual(checkBookingStatus({ status: "confirmed" }).errors, {});
  assert.deepEqual(checkBookingStatus({ status: "cancelled" }).errors, {});
  assert.ok(checkBookingStatus({ status: "pending" }).errors.status);
  assert.ok(checkBookingStatus({}).errors.status);
});

// ---------- Buying a ticket ----------

const FLIGHT = {
  type: "flight", origin: "Beirut", destination: "Paris", tripType: "round",
  departDate: inDays(20), returnDate: inDays(30), travelers: 2, seatClass: "economy",
};

test("a correct ticket passes", () => {
  const { data, errors } = checkTicket(FLIGHT);
  assert.deepEqual(errors, {});
  assert.equal(data.travelers, 2);
});

test("a one-way ticket has no return date, even when one is sent", () => {
  const { data, errors } = checkTicket({ ...FLIGHT, tripType: "oneway" });
  assert.deepEqual(errors, {});
  assert.equal(data.returnDate, null);
});

test("a round trip needs a return on or after the departure", () => {
  assert.ok(checkTicket({ ...FLIGHT, returnDate: "" }).errors.returnDate);
  assert.ok(checkTicket({ ...FLIGHT, returnDate: inDays(19) }).errors.returnDate);
  assert.deepEqual(checkTicket({ ...FLIGHT, returnDate: FLIGHT.departDate }).errors, {}); // back the same day
});

test("the two places of a ticket must be different, whatever the capitals and accents", () => {
  assert.ok(checkTicket({ ...FLIGHT, destination: "beirut" }).errors.destination);
  assert.ok(checkTicket({ ...FLIGHT, origin: "Göreme", destination: " goreme " }).errors.destination);
});

test("the class must be one that the transport has", () => {
  assert.ok(checkTicket({ ...FLIGHT, type: "bus" }).errors.seatClass); // a bus has no economy
  assert.deepEqual(checkTicket({ ...FLIGHT, type: "bus", seatClass: "premium" }).errors, {});
  assert.ok(checkTicket({ ...FLIGHT, type: "train", seatClass: "business" }).errors.seatClass);
  assert.ok(checkTicket({ ...FLIGHT, type: "boat" }).errors.type);
});

test("a ticket can't leave in the past", () => {
  assert.ok(checkTicket({ ...FLIGHT, departDate: inDays(-1) }).errors.departDate);
});

// ---------- Changing credit ----------

test("credit amounts are digits with at most two decimals", () => {
  for (const amount of ["200", "49.9", "49.99", "0.5", 200]) {
    assert.deepEqual(checkCreditChange({ action: "add", amount: amount }).errors, {}, String(amount));
  }
  for (const amount of ["", "-5", "0", "0.00", "1e3", "5.999", "12,50", "abc", String(MAX_CHANGE + 1)]) {
    assert.ok(checkCreditChange({ action: "add", amount: amount }).errors.amount, amount);
  }
});

test("a credit change is add or remove, with a note of 255 characters at most", () => {
  assert.ok(checkCreditChange({ action: "give", amount: "5" }).errors.action);
  assert.deepEqual(checkCreditChange({ action: "remove", amount: "5", note: "  Too   much  " }).data.note, "Too much");
  assert.ok(checkCreditChange({ action: "add", amount: "5", note: "x".repeat(256) }).errors.note);
});

// ---------- Emails (written, never sent) ----------

const BOOKING = {
  email: "lara@gmail.com", first_name: "Lara", last_name: "Haddad",
  stay_name: "Mountain Top Cabin", dest_name: "Faraya", country: "Lebanon",
  start_date: "2027-01-18", end_date: "2027-01-20", nights: 2, travelers: 2, total_price: "560.00",
};
const TICKET = {
  email: "lara@gmail.com", first_name: "Lara", last_name: "Haddad",
  type: "flight", origin: "Beirut", destination: "Paris", depart_date: "2027-03-01",
  return_date: "2027-03-10", travelers: 2, seat_class: "economy", total_price: "880.00",
};

test("a saved booking writes one email to the customer and one to the team", () => {
  const emails = write.bookingSaved(BOOKING, "440.00");
  assert.equal(emails.length, 2);
  const [to, notice] = emails[0];
  assert.equal(to, "lara@gmail.com");
  assert.match(notice.subject, /Mountain Top Cabin is saved/);
  assert.ok(notice.lines.some((line) => line.includes("$560") && line.includes("$440")));
  assert.deepEqual(notice.details.find(([label]) => label === "Check-in"), ["Check-in", "18 Jan 2027"]);
  assert.match(emails[1][1].subject, /New booking to confirm/);
});

test("a cancelled booking says what comes back to the credit", () => {
  const paid = write.bookingCancelled(BOOKING, "560.00", true)[0][1];
  assert.ok(paid.lines.includes("$560 is back in your credit."));
  assert.match(paid.lines[0], /EasyTrip team cancelled/);
  const notPaid = write.bookingCancelled(BOOKING, "0.00", false)[0][1];
  assert.ok(notPaid.lines.includes("Nothing was paid with credit, so there is no refund."));
  assert.match(notPaid.lines[0], /as you asked/);
});

test("a ticket's emails name the transport and the route", () => {
  const notice = write.ticketSaved(TICKET, "120.00")[0][1];
  assert.match(notice.subject, /flight ticket from Beirut to Paris is saved/);
  assert.deepEqual(notice.details.find(([label]) => label === "Return"), ["Return", "10 Mar 2027"]);
  const oneWay = write.ticketConfirmed({ ...TICKET, return_date: null })[0][1];
  assert.equal(oneWay.details.some(([label]) => label === "Return"), false);
});

test("a credit change writes the amount, the new credit and the note", () => {
  const added = write.creditChanged({ email: "lara@gmail.com", first_name: "Lara" }, true, "200", "640.00", "Welcome credit")[0][1];
  assert.match(added.subject, /\$200 of credit was added/);
  assert.deepEqual(added.details, [["Added", "$200"], ["Your credit now", "$640"], ["Note", "Welcome credit"]]);
  const removed = write.creditChanged({ email: "lara@gmail.com", first_name: "Lara" }, false, "49.5", "590.50", "")[0][1];
  assert.deepEqual(removed.details, [["Removed", "$49.50"], ["Your credit now", "$590.50"]]);
});

test("text from a form is escaped in the email's HTML, and left as it is in the text version", () => {
  const email = buildNotice({
    subject: "Test", greeting: "Hello <b>Lara</b>,", lines: ["Tom & Jerry"], details: [["Note", '<script>alert("x")</script>']],
  });
  assert.ok(email.html.includes("Hello &lt;b&gt;Lara&lt;/b&gt;,"));
  assert.ok(email.html.includes("Tom &amp; Jerry"));
  assert.equal(email.html.includes("<script>"), false);
  assert.ok(email.text.includes("Hello <b>Lara</b>,"));
});

test("no email goes to a test address", () => {
  for (const address of ["lara.haddad@example.com", "a@mail.example.org", "b@site.test", "c@localhost"]) {
    assert.equal(canGetEmail(address), false, address);
  }
  for (const address of ["someone@gmail.com", "x@myexample.com", "y@contest.com"]) {
    assert.equal(canGetEmail(address), true, address);
  }
});
