// CONTROLLER for the contact messages ("inquiries").
// - Anyone can send a message from contact.html. A message sent while logged in is linked to the
//   account, so its replies appear on "My account".
// - The admin reads them in the admin page's inbox, replies, closes, reopens or deletes them.
//   Those routes are in routes/admin.js, behind isAuth and isAdmin.
import * as Inquiry from "../models/inquiry.js";
import { checkInquiry, checkInquiryFilters, checkReply, checkStatusChange } from "../validators/inquiries.js";
import { hasErrors, readPositiveInt } from "../validators/common.js";
import { emailIsSetUp, canGetEmail } from "../utils/mailer.js";
import * as notices from "../utils/notices.js";

// ---------- For everyone ----------

// POST /api/inquiries  (JSON: name, email, phone, topic, message)
export async function sendInquiry(req, res) {
  const { data, errors } = checkInquiry(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  // loadUser (middleware/is-auth.js) set req.user if someone is logged in.
  const linked = Boolean(req.user);
  const id = await Inquiry.create({ ...data, userId: linked ? req.user.user_id : null });
  res.status(201).json({
    message: linked
      ? "Your message was sent. Our reply will appear on your account page, under \"My messages\"."
      : "Your message was sent to the EasyTrip team.",
    inquiryId: id,
    linkedToAccount: linked,
  });
}

// GET /api/inquiries/mine  (logged in): the user's messages and the replies to them. The admin's
// name is not shown: the reply comes from "the EasyTrip team".
export async function getMyInquiries(req, res) {
  const messages = await Inquiry.findByUser(req.user.user_id);
  res.json({
    inquiries: messages.map((m) => ({
      id: m.inquiry_id,
      topic: m.topic,
      message: m.message,
      status: m.status,
      createdAt: m.created_at,
      replies: m.replies.map((r) => ({ message: r.message, createdAt: r.created_at })),
    })),
  });
}

// ---------- For the admin ----------

function readId(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) res.status(400).json({ error: "The message id must be a whole number of 1 or more." });
  return id;
}

function notFound(res) {
  res.status(404).json({ error: "This message does not exist (it may have been deleted)." });
}

// One message as the admin page receives it.
function inquiryJson(row) {
  return {
    id: row.inquiry_id,
    fromAccount: row.user_id !== null, // sent while logged in: the reply shows on the account page
    name: row.name,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    replies: row.replies.map((r) => ({
      id: r.reply_id,
      message: r.message,
      createdAt: r.created_at,
      by: r.admin_first_name || "A deleted admin",
    })),
  };
}

// GET /api/admin/inquiries?status=&q=&page=&limit=
export async function listInquiries(req, res) {
  const { data, errors } = checkInquiryFilters(req.query);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Some list values are wrong.", fields: errors });
  }
  const { rows, total } = await Inquiry.findAll(data);
  res.json({
    inquiries: rows.map((row) => ({
      id: row.inquiry_id,
      fromAccount: row.user_id !== null,
      name: row.name,
      email: row.email,
      topic: row.topic,
      status: row.status,
      preview: row.preview,
      replyCount: row.reply_count,
      createdAt: row.created_at,
    })),
    pagination: { page: data.page, limit: data.limit, total: total, totalPages: Math.ceil(total / data.limit) },
  });
}

// GET /api/admin/inquiries/:id
export async function getInquiry(req, res) {
  const id = readId(req, res);
  if (!id) return;
  const row = await Inquiry.findById(id);
  if (!row) return notFound(res);
  res.json({ inquiry: inquiryJson(row) });
}

// POST /api/admin/inquiries/:id/replies  (JSON: message)
export async function replyToInquiry(req, res) {
  const id = readId(req, res);
  if (!id) return;
  if (!(await Inquiry.findById(id))) return notFound(res);

  const { data, errors } = checkReply(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }

  try {
    await Inquiry.addReply(id, req.user.user_id, data.message);
  } catch (error) {
    // The message was deleted between the check above and the save (its foreign key is gone).
    if (error.code === "ER_NO_REFERENCED_ROW_2") return notFound(res);
    throw error;
  }
  const row = await Inquiry.findById(id);
  // The reply is emailed to the address in the message, in the background.
  notices.inquiryReplied(row, data.message);
  const emailed = emailIsSetUp && canGetEmail(row.email);
  const where = row.user_id !== null ? "The customer also sees it on their account page." : "";
  res.status(201).json({
    message: emailed
      ? `Your reply was saved and emailed to ${row.email}. ${where}`.trim()
      : row.user_id !== null
        ? "Your reply was saved. The customer sees it on their account page. It wasn't emailed (email isn't set up, or this is a test address)."
        : "Your reply was saved, but it couldn't be emailed (email isn't set up, or this is a test address), and this visitor has no account.",
    inquiry: inquiryJson(row),
  });
}

// PATCH /api/admin/inquiries/:id  (JSON: status = "read" or "closed")
// "read" also reopens a closed message: a message that has a reply becomes "answered" again.
export async function changeInquiryStatus(req, res) {
  const id = readId(req, res);
  if (!id) return;
  const { data, errors } = checkStatusChange(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "This status can't be chosen.", fields: errors });
  }

  const row = await Inquiry.findById(id);
  if (!row) return notFound(res);
  const status = data.status === "read" && row.replies.length > 0 ? "answered" : data.status;
  await Inquiry.setStatus(id, status);
  res.json({ inquiry: inquiryJson({ ...row, status: status }) });
}

// DELETE /api/admin/inquiries/:id  (its replies are deleted with it)
export async function deleteInquiry(req, res) {
  const id = readId(req, res);
  if (!id) return;
  if (!(await Inquiry.deleteById(id))) return notFound(res);
  res.json({ message: "The message was deleted." });
}
