// Tests of the admin tools, identity verification and password reset: the checks on what is
// sent, and the emails that are written (none is sent).
// Run them with: npm test   (no server and no database needed)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkVerificationDecision, checkVerificationFilters, checkRoleChange, checkDestination,
} from "../server/validators/admin.js";
import { checkNewPassword, readEmail } from "../server/validators/auth.js";
import { write } from "../server/utils/notices.js";
import { selfiePath } from "../server/utils/selfie.js";

test("a verification is approved freely, but rejected only with a note", () => {
  assert.deepEqual(checkVerificationDecision({ decision: "approve" }).errors, {});
  assert.ok(checkVerificationDecision({ decision: "reject" }).errors.note);
  assert.ok(checkVerificationDecision({ decision: "reject", note: "   " }).errors.note);
  assert.deepEqual(checkVerificationDecision({ decision: "reject", note: "Blurry photo" }).errors, {});
  assert.ok(checkVerificationDecision({ decision: "maybe" }).errors.decision);
  assert.ok(checkVerificationDecision({ decision: "reject", note: "x".repeat(256) }).errors.note);
});

test("the verifications list accepts only its statuses", () => {
  assert.deepEqual(checkVerificationFilters({ status: "pending" }).errors, {});
  assert.ok(checkVerificationFilters({ status: "approved" }).errors.status);
  assert.ok(checkVerificationFilters({ page: "0" }).errors.page);
});

test("a role is customer or admin", () => {
  assert.deepEqual(checkRoleChange({ role: "admin" }).errors, {});
  assert.deepEqual(checkRoleChange({ role: "customer" }).errors, {});
  assert.ok(checkRoleChange({ role: "owner" }).errors.role);
  assert.ok(checkRoleChange({}).errors.role);
});

test("a destination needs a place, a country and a season", () => {
  const { data, errors } = checkDestination({ name: "  Faraya   Village ", country: "Lebanon", season: "winter" });
  assert.deepEqual(errors, {});
  assert.equal(data.name, "Faraya Village");
  const wrong = checkDestination({ name: "", country: "x".repeat(61), season: "monsoon" }).errors;
  assert.ok(wrong.name && wrong.country && wrong.season);
});

test("a new password has 8 characters or more, with a letter and a number", () => {
  assert.equal(checkNewPassword("NewPass123"), "");
  assert.ok(checkNewPassword(""));
  assert.ok(checkNewPassword("short1"));
  assert.ok(checkNewPassword("lettersonly"));
  assert.ok(checkNewPassword("12345678"));
  assert.ok(checkNewPassword("a1" + "é".repeat(40))); // more than 72 bytes
});

test("the forgot-password email is read in small letters, and refused when it isn't one", () => {
  assert.equal(readEmail({ email: " Karim.Saad@Example.com " }), "karim.saad@example.com");
  assert.equal(readEmail({ email: "not an email" }), "");
  assert.equal(readEmail({ email: 42 }), "");
});

test("a selfie's path never leaves the selfies folder", () => {
  assert.ok(selfiePath("../../server/config.js").endsWith("selfies" + (process.platform === "win32" ? "\\" : "/") + "config.js"));
});

const ROW = { email: "lara@gmail.com", first_name: "Lara", last_name: "Haddad" };

test("the verification emails say what happened, and why for a rejection", () => {
  const approved = write.verificationDecided(ROW, "verified", "")[0][1];
  assert.equal(approved.subject, "Your identity is verified");
  const rejected = write.verificationDecided(ROW, "rejected", "Blurry photo")[0][1];
  assert.ok(rejected.lines.includes("The reason: Blurry photo"));
  const [to, submitted] = write.verificationSubmitted({ ...ROW, user_id: 2 })[0];
  assert.match(submitted.subject, /Identity to verify: Lara Haddad/);
  assert.equal(typeof to, "string");
});

test("a reply to a contact message is emailed with the message it answers", () => {
  const visitor = { email: "sami@gmail.com", name: "Sami", user_id: null, message: "Which countries in spring?" };
  const [to, notice] = write.inquiryReplied(visitor, "Try Japan or Jordan.")[0];
  assert.equal(to, "sami@gmail.com");
  assert.ok(notice.lines.includes("Try Japan or Jordan."));
  assert.deepEqual(notice.details, [["Your message", "Which countries in spring?"]]);
  assert.match(notice.closing, /contact/);
  const customer = write.inquiryReplied({ ...visitor, user_id: 5 }, "Yes.")[0][1];
  assert.match(customer.closing, /account page/);
});
