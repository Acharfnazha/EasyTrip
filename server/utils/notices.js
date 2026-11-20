// The emails that tell a customer (and the EasyTrip team) what happened: a booking or a ticket
// was saved, confirmed or cancelled, or the account's credit changed.
//
// Writing and sending are separate:
//   write.bookingSaved(...)   only WRITES the emails: it returns a list of [address, notice].
//   bookingSaved(...)         writes them and sends them in the background (utils/mailer.js).
// The controllers call the second kind, AFTER the change is saved, so an email is never sent
// for something that didn't happen. The tests read the first kind, so they send nothing.
import config from "../config.js";
import { sendNotice, TEAM_ADDRESS } from "./mailer.js";
import { money } from "./money.js";

const ACCOUNT_PAGE = config.siteUrl + "/account.html";
const ADMIN_PAGE = config.siteUrl + "/admin.html";
const CONTACT_PAGE = config.siteUrl + "/contact.html";

const TRANSPORTS = { flight: "Flight", bus: "Bus", train: "Train" };
const CLASSES = {
  economy: "Economy", premium: "Premium", business: "Business", first: "First",
  standard: "Standard", sleeper: "Sleeper",
};

// "18 Jan 2027" from "2027-01-18". The date is a plain day, so it is read as UTC noon: no
// time zone can move it to the day before.
function day(iso) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

// ---------- What was bought, as lines of the email ----------

// row is a booking as models/booking.js reads it (with its stay and its user).
function bookingDetails(row) {
  return [
    ["Stay", row.stay_name],
    ["Place", row.dest_name === row.country ? row.country : row.dest_name + ", " + row.country],
    ["Check-in", day(row.start_date)],
    ["Check-out", day(row.end_date)],
    ["Nights", String(row.nights)],
    ["Travelers", String(row.travelers)],
    ["Total", money(row.total_price)],
  ];
}

// row is a ticket as models/ticket.js reads it (with its user).
function ticketDetails(row) {
  const details = [
    ["Transport", TRANSPORTS[row.type]],
    ["From", row.origin],
    ["To", row.destination],
    ["Departure", day(row.depart_date)],
  ];
  if (row.return_date) details.push(["Return", day(row.return_date)]);
  details.push(
    ["Travelers", String(row.travelers)],
    ["Class", CLASSES[row.seat_class]],
    ["Total", row.total_price === null ? "Not paid with credit" : money(row.total_price)]
  );
  return details;
}

// "flight ticket from Beirut to Paris"
function ticketName(row) {
  return `${TRANSPORTS[row.type].toLowerCase()} ticket from ${row.origin} to ${row.destination}`;
}

// The sentence about the money of a cancelled booking or ticket.
function refundLine(refunded) {
  return Number(refunded) > 0
    ? `${money(refunded)} is back in your credit.`
    : "Nothing was paid with credit, so there is no refund.";
}

// ---------- Writing the emails ----------

export const write = {
  // A customer booked a stay: one email to them, one to the team (who confirms it).
  bookingSaved(row, creditLeft) {
    return [
      [row.email, {
        subject: `Your booking of ${row.stay_name} is saved`,
        greeting: `Hello ${row.first_name},`,
        lines: [
          `Your booking of ${row.stay_name} is saved and is waiting for our confirmation.`,
          `${money(row.total_price)} was taken from your credit, and ${money(creditLeft)} is left.`,
        ],
        details: bookingDetails(row),
        closing: `You can see it, or cancel it before it starts, on your account page: ${ACCOUNT_PAGE}`,
      }],
      [TEAM_ADDRESS, {
        subject: `New booking to confirm: ${row.stay_name}`,
        greeting: "Hello,",
        lines: [`${row.first_name} ${row.last_name} (${row.email}) booked ${row.stay_name} and paid with credit.`],
        details: bookingDetails(row),
        closing: `Confirm or cancel it in the admin dashboard, under Bookings: ${ADMIN_PAGE}#bookings`,
      }],
    ];
  },

  bookingConfirmed(row) {
    return [[row.email, {
      subject: `Your booking of ${row.stay_name} is confirmed`,
      greeting: `Hello ${row.first_name},`,
      lines: [`Good news: your booking of ${row.stay_name} is confirmed.`],
      details: bookingDetails(row),
      closing: `Your bookings are on your account page: ${ACCOUNT_PAGE}`,
    }]];
  },

  // byAdmin: true when the team cancelled it, false when the customer did.
  bookingCancelled(row, refunded, byAdmin) {
    return [[row.email, {
      subject: `Your booking of ${row.stay_name} is cancelled`,
      greeting: `Hello ${row.first_name},`,
      lines: [
        byAdmin
          ? `The EasyTrip team cancelled your booking of ${row.stay_name}.`
          : `Your booking of ${row.stay_name} is cancelled, as you asked.`,
        refundLine(refunded),
      ],
      details: bookingDetails(row),
      closing: byAdmin ? `If you have a question, send us a message: ${CONTACT_PAGE}?topic=stays` : "",
    }]];
  },

  // A customer bought a ticket: one email to them, one to the team.
  ticketSaved(row, creditLeft) {
    return [
      [row.email, {
        subject: `Your ${ticketName(row)} is saved`,
        greeting: `Hello ${row.first_name},`,
        lines: [
          `Your ${ticketName(row)} is saved and is waiting for our confirmation.`,
          `${money(row.total_price)} was taken from your credit, and ${money(creditLeft)} is left.`,
        ],
        details: ticketDetails(row),
        closing: `You can see it, or cancel it before the departure day, on your account page: ${ACCOUNT_PAGE}`,
      }],
      [TEAM_ADDRESS, {
        subject: `New ticket to confirm: ${row.origin} to ${row.destination}`,
        greeting: "Hello,",
        lines: [`${row.first_name} ${row.last_name} (${row.email}) bought a ${ticketName(row)} and paid with credit.`],
        details: ticketDetails(row),
        closing: `Confirm or cancel it in the admin dashboard, under Tickets: ${ADMIN_PAGE}#tickets`,
      }],
    ];
  },

  ticketConfirmed(row) {
    return [[row.email, {
      subject: `Your ${ticketName(row)} is confirmed`,
      greeting: `Hello ${row.first_name},`,
      lines: [`Good news: your ${ticketName(row)} is confirmed.`],
      details: ticketDetails(row),
      closing: `Your tickets are on your account page: ${ACCOUNT_PAGE}`,
    }]];
  },

  ticketCancelled(row, refunded, byAdmin) {
    return [[row.email, {
      subject: `Your ${ticketName(row)} is cancelled`,
      greeting: `Hello ${row.first_name},`,
      lines: [
        byAdmin
          ? `The EasyTrip team cancelled your ${ticketName(row)}.`
          : `Your ${ticketName(row)} is cancelled, as you asked.`,
        refundLine(refunded),
      ],
      details: ticketDetails(row),
      closing: byAdmin ? `If you have a question, send us a message: ${CONTACT_PAGE}` : "",
    }]];
  },

  // An admin added or removed credit. user is a row of the users table.
  creditChanged(user, adding, amount, newCredit, note) {
    const details = [
      [adding ? "Added" : "Removed", money(amount)],
      ["Your credit now", money(newCredit)],
    ];
    if (note) details.push(["Note", note]);
    return [[user.email, {
      subject: adding
        ? `${money(amount)} of credit was added to your EasyTrip account`
        : "Your EasyTrip credit changed",
      greeting: `Hello ${user.first_name},`,
      lines: [
        adding
          ? `The EasyTrip team added ${money(amount)} of credit to your account. You can use it to book hotels and chalets and to buy tickets.`
          : `The EasyTrip team removed ${money(amount)} of credit from your account.`,
      ],
      details: details,
      closing: `Your credit and its history are on your account page: ${ACCOUNT_PAGE}`,
    }]];
  },

  // A user sent a selfie: the team must look at it.
  verificationSubmitted(user) {
    return [[TEAM_ADDRESS, {
      subject: `Identity to verify: ${user.first_name} ${user.last_name}`,
      greeting: "Hello,",
      lines: [`${user.first_name} ${user.last_name} (${user.email}) sent a selfie to verify their identity.`],
      closing: `Compare it with their document in the admin dashboard, under Verifications: ${ADMIN_PAGE}#verifications`,
    }]];
  },

  // The team approved or rejected a user's identity. row has the user's names and email.
  verificationDecided(row, status, note) {
    const approved = status === "verified";
    return [[row.email, {
      subject: approved ? "Your identity is verified" : "We couldn't verify your identity",
      greeting: `Hello ${row.first_name},`,
      lines: approved
        ? ["Our team checked your selfie and your identity document: your identity is verified.",
           "You can now book hotels and chalets and buy tickets with your credit."]
        : ["Our team checked your selfie and your identity document, but couldn't verify your identity.",
           `The reason: ${note}`,
           "You can send a new selfie, or scan your document again, on your account page."],
      closing: `Your account page: ${ACCOUNT_PAGE}`,
    }]];
  },

  // The team answered a contact message. row is the message, with its sender's name and email.
  inquiryReplied(row, reply) {
    return [[row.email, {
      subject: "Re: your message to EasyTrip",
      greeting: `Hello ${row.name},`,
      lines: ["Thank you for your message. Here is our answer:", reply],
      details: [["Your message", row.message.length > 300 ? row.message.slice(0, 300) + "…" : row.message]],
      closing: row.user_id !== null
        ? `You can also read it on your account page, under "My messages": ${ACCOUNT_PAGE}`
        : `To write to us again: ${CONTACT_PAGE}`,
    }]];
  },
};

// ---------- Sending them ----------

// Turns a writer into the function the controllers call: write the emails, then send each
// one in the background.
function sender(writer) {
  return (...args) => {
    writer(...args).forEach(([address, notice]) => sendNotice(address, notice));
  };
}

export const bookingSaved = sender(write.bookingSaved);
export const bookingConfirmed = sender(write.bookingConfirmed);
export const bookingCancelled = sender(write.bookingCancelled);
export const ticketSaved = sender(write.ticketSaved);
export const ticketConfirmed = sender(write.ticketConfirmed);
export const ticketCancelled = sender(write.ticketCancelled);
export const creditChanged = sender(write.creditChanged);
export const verificationSubmitted = sender(write.verificationSubmitted);
export const verificationDecided = sender(write.verificationDecided);
export const inquiryReplied = sender(write.inquiryReplied);
