// Sends the site's emails from a Gmail account (nodemailer). The account and its app password
// are in .env (GMAIL_USER and GMAIL_APP_PASSWORD), never in the code.
import nodemailer from "nodemailer";
import config from "../config.js";

// false until both settings are filled in. The login then prints the code in the server's
// terminal instead (see deliverCode in controllers/auth.js), and no notice is sent.
export const emailIsSetUp = Boolean(config.mail.user && config.mail.password);

const transporter = emailIsSetUp
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.mail.user, pass: config.mail.password },
    })
  : null;

// Addresses that can never get email: these names are reserved for examples and tests, and
// the test accounts in seed.sql use them. Sending to them would only fill the sender's inbox
// with "address not found" answers.
const TEST_DOMAINS = /(@|\.)(example\.(com|net|org)|test|example|invalid|localhost)$/i;

export function canGetEmail(address) {
  return !TEST_DOMAINS.test(address);
}

// Text from a form (a name, a note) is escaped before it goes into an email's HTML.
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

// The frame every email has: the EasyTrip bar on top, then the content.
function emailPage(content) {
  return `
    <div style="max-width:480px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#13203a">
      <div style="padding:20px 24px;border-radius:12px 12px 0 0;background:#001B48;color:#ffffff;font-size:20px;font-weight:bold">EasyTrip</div>
      <div style="padding:24px;border:1px solid #dbe5ee;border-top:0;border-radius:0 0 12px 12px">${content}
      </div>
    </div>`;
}

// The email with a 6-digit code: for a login (purpose "login") or to choose a new password
// (purpose "reset"). It has a text version and an HTML version; the mail app shows the one it
// prefers.
const CODE_WORDS = {
  login: {
    subject: "is your EasyTrip login code",
    intro: "Your login code is:",
    ignore: "If you didn't try to log in, you can ignore this email: nobody can log in without the code.",
  },
  reset: {
    subject: "is your EasyTrip password reset code",
    intro: "To choose a new password, enter this code:",
    ignore: "If you didn't ask for a new password, you can ignore this email: your password stays the same.",
  },
};

export async function sendCode(user, code, minutes, purpose) {
  const words = CODE_WORDS[purpose];
  const text = [
    `Hello ${user.first_name},`,
    "",
    `${words.intro} ${code}`,
    "",
    `It works for ${minutes} minutes. ${words.ignore}`,
    "",
    "EasyTrip",
  ].join("\n");

  const html = emailPage(`
        <p style="margin:0 0 16px;font-size:16px">Hello ${escapeHtml(user.first_name)},</p>
        <p style="margin:0 0 12px;font-size:16px">${words.intro}</p>
        <p style="margin:0 0 16px;padding:16px;border-radius:10px;background:#e8f4fa;color:#001B48;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center">${code}</p>
        <p style="margin:0;color:#56627a;font-size:14px;line-height:1.5">It works for ${minutes} minutes. ${escapeHtml(words.ignore)}</p>`);

  await transporter.sendMail({
    from: `"EasyTrip" <${config.mail.user}>`,
    to: user.email,
    subject: `${code} ${words.subject}`,
    text: text,
    html: html,
  });
}

// Builds a notice: an email that tells someone what happened (a booking was saved, credit was
// added). notice is { subject, greeting, lines: [text], details: [[label, value]], closing }.
// It returns the text and HTML versions; sendNotice sends them. The two are separate so the
// tests can check the content without sending anything.
export function buildNotice(notice) {
  const details = notice.details || [];
  const text = [
    notice.greeting,
    "",
    ...notice.lines,
    ...(details.length > 0 ? ["", ...details.map(([label, value]) => `${label}: ${value}`)] : []),
    ...(notice.closing ? ["", notice.closing] : []),
    "",
    "EasyTrip",
  ].join("\n");

  const rows = details
    .map(([label, value]) => `
            <tr>
              <td style="padding:6px 12px 6px 0;color:#56627a;font-size:14px;vertical-align:top">${escapeHtml(label)}</td>
              <td style="padding:6px 0;font-size:14px;font-weight:bold;text-align:right">${escapeHtml(value)}</td>
            </tr>`)
    .join("");

  const html = emailPage(`
        <p style="margin:0 0 16px;font-size:16px">${escapeHtml(notice.greeting)}</p>
        ${notice.lines.map((line) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.5">${escapeHtml(line)}</p>`).join("\n        ")}
        ${rows ? `<table style="width:100%;margin:4px 0 16px;border-top:1px solid #dbe5ee;border-collapse:collapse">${rows}
        </table>` : ""}
        ${notice.closing ? `<p style="margin:0;color:#56627a;font-size:14px;line-height:1.5">${escapeHtml(notice.closing)}</p>` : ""}`);

  return { subject: notice.subject, text: text, html: html };
}

// Sends a notice to one address, in the background. It never stops the request that caused
// it: the booking (or the credit change) is already saved, so a problem with the email is
// only written in the server's log. Nothing is sent while email isn't set up, or to a test
// address.
export function sendNotice(to, notice) {
  if (!emailIsSetUp || !canGetEmail(to)) return;
  const email = buildNotice(notice);
  transporter
    .sendMail({ from: `"EasyTrip" <${config.mail.user}>`, to: to, ...email })
    .catch((error) => {
      console.error(`A notice email could not be sent (${error.code || error.message}).`);
    });
}

// The address that gets "a customer booked something" notices: the site's own Gmail account,
// which the admin reads. Empty while email isn't set up.
export const TEAM_ADDRESS = config.mail.user;
