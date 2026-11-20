// Checks the contact form (public/contact.html), and what the admin sends from the messages
// inbox: the list's filters, a reply and a status change. The browser checks the contact form
// with the same rules (public/js/contact.js), but anyone can skip the browser.
import { EMAIL_FORMAT, readText, readPositiveInt } from "./common.js";

// The same values as the ENUMs in database/schema.sql and the options in contact.html.
export const TOPICS = ["general", "destinations", "stays", "flights", "bus-train", "website", "other"];
export const STATUSES = ["new", "read", "answered", "closed"];

// The same limits as the columns in database/schema.sql and the maxlength in contact.html.
const LIMITS = { name: 120, email: 190, phone: 40, message: 2000 };
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// The contact form. Returns the clean data and one message per wrong field.
export function checkInquiry(body) {
  const data = {
    name: readText(body.name).replace(/\s+/g, " "),
    email: readText(body.email).toLowerCase(),
    phone: readText(body.phone),
    topic: readText(body.topic),
    message: readText(body.message),
  };
  const errors = {};

  if (!data.name) errors.name = "Enter your full name.";
  else if (data.name.length > LIMITS.name) errors.name = `Your name must be ${LIMITS.name} characters or fewer.`;

  if (!data.email) errors.email = "Enter your email address.";
  else if (data.email.length > LIMITS.email || !EMAIL_FORMAT.test(data.email)) {
    errors.email = "Enter an email address in the format name@example.com.";
  }

  // The phone number is optional: digits, spaces and + ( ) . - only, with 6 to 17 digits.
  if (data.phone) {
    const digits = data.phone.replace(/\D/g, "").length;
    if (data.phone.length > LIMITS.phone || !/^[0-9+().\-\s]+$/.test(data.phone) || digits < 6 || digits > 17) {
      errors.phone = "Enter a phone number using digits, spaces and + ( ) - only, or leave it blank.";
    }
  }

  if (!TOPICS.includes(data.topic)) errors.topic = "Choose a topic.";

  if (!data.message) errors.message = "Enter your message.";
  else if (data.message.length > LIMITS.message) {
    errors.message = `Your message must be ${LIMITS.message.toLocaleString("en-GB")} characters or fewer.`;
  }

  return { data, errors };
}

// The admin's inbox: /api/admin/inquiries?status=new&q=chalet&page=2&limit=10
export function checkInquiryFilters(query) {
  const data = {
    status: readText(query.status),
    search: readText(query.q),
    page: query.page === undefined ? 1 : readPositiveInt(query.page),
    limit: query.limit === undefined ? DEFAULT_LIMIT : readPositiveInt(query.limit),
  };
  const errors = {};

  if (data.status && !STATUSES.includes(data.status)) {
    errors.status = "status must be one of: " + STATUSES.join(", ") + ".";
  }
  if (data.search.length > 100) errors.q = "q must be 100 characters or fewer.";
  if (data.page === null) errors.page = "page must be a whole number of 1 or more.";
  if (data.limit === null || data.limit > MAX_LIMIT) {
    errors.limit = "limit must be a whole number from 1 to " + MAX_LIMIT + ".";
  }

  return { data, errors };
}

// The admin's reply.
export function checkReply(body) {
  const data = { message: readText(body.message) };
  const errors = {};
  if (!data.message) errors.message = "Write your reply.";
  else if (data.message.length > LIMITS.message) {
    errors.message = `Your reply must be ${LIMITS.message.toLocaleString("en-GB")} characters or fewer.`;
  }
  return { data, errors };
}

// A status the admin can choose: "closed" (nothing more to do), or "read" to open it again.
// "new" is only for messages nobody has opened, and "answered" is set by a reply.
export function checkStatusChange(body) {
  const data = { status: readText(body.status) };
  const errors = {};
  if (!["read", "closed"].includes(data.status)) errors.status = "status must be read or closed.";
  return { data, errors };
}
