// CONTROLLER for the admin's account tools: change an account's role, and delete an account.
// (The list of accounts and their credit is in controllers/credit.js.) The routes are in
// routes/admin.js, behind isAuth and isAdmin.
import * as User from "../models/user.js";
import * as IdDocument from "../models/id-document.js";
import { checkRoleChange } from "../validators/admin.js";
import { hasErrors, readPositiveInt } from "../validators/common.js";
import { deleteSelfie } from "../utils/selfie.js";

// Reads the account in the URL. Answers itself, and returns undefined, when it can't be used:
// a wrong id, an account that doesn't exist, or the admin's own account (an admin can't remove
// their own access by mistake, so the site always keeps at least one admin).
async function readOtherUser(req, res, action) {
  const id = readPositiveInt(req.params.id);
  if (!id) {
    res.status(400).json({ error: "The user id must be a whole number of 1 or more." });
    return undefined;
  }
  if (id === req.user.user_id) {
    res.status(409).json({ error: `You can't ${action} your own account. Ask another admin.` });
    return undefined;
  }
  const user = await User.findById(id);
  if (!user) res.status(404).json({ error: "This account does not exist (it may have been deleted)." });
  return user;
}

// PATCH /api/admin/users/:id  (JSON: role = "customer" or "admin")
export async function changeRole(req, res) {
  const { data, errors } = checkRoleChange(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "This role can't be chosen.", fields: errors });
  }
  const user = await readOtherUser(req, res, "change the role of");
  if (!user) return;

  const name = (user.first_name + " " + user.last_name).trim();
  if (user.role === data.role) {
    return res.json({ message: `${name} is already ${data.role === "admin" ? "an admin" : "a customer"}.` });
  }
  await User.setRole(user.user_id, data.role);
  // isAuth reads the role from the database on every request, so the change counts at once.
  res.json({
    message: data.role === "admin"
      ? `${name} is now an admin. They see the admin dashboard the next time they open a page.`
      : `${name} is now a customer, and can no longer open the admin dashboard.`,
  });
}

// DELETE /api/admin/users/:id
export async function deleteAccount(req, res) {
  const user = await readOtherUser(req, res, "delete");
  if (!user) return;

  // The selfie's file is outside the database, so it is deleted here.
  const document = await IdDocument.findByUserId(user.user_id);
  await User.deleteById(user.user_id);
  if (document) deleteSelfie(document.selfie_file);
  await User.endSessions(user.user_id, ""); // Logged out everywhere.

  const name = (user.first_name + " " + user.last_name).trim();
  res.json({
    message: `${name}'s account was deleted, with its bookings, tickets, credit and identity document. ` +
      "Their contact messages stay in the inbox.",
  });
}
