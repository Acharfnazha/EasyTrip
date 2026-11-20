// Checks the register and login data on the server. The browser checks the same rules
// (public/js/auth.js), but anyone can skip the browser, so the server checks everything again.
import { EMAIL_FORMAT, readText } from "./common.js";

// Passwords are not trimmed, because a space can be part of a password.
function readPassword(value) {
  return typeof value === "string" ? value : "";
}

// Reads the register form. Returns the clean data and one message per wrong field
// (an empty errors object means the data is valid).
export function checkRegistration(body) {
  const data = {
    firstName: readText(body.firstName),
    lastName: readText(body.lastName),
    email: readText(body.email).toLowerCase(),
    password: readPassword(body.password),
  };
  const errors = {};

  if (!data.firstName) errors.firstName = "Enter your first name.";
  else if (data.firstName.length > 50) errors.firstName = "Your first name must be 50 characters or fewer.";

  if (!data.lastName) errors.lastName = "Enter your last name.";
  else if (data.lastName.length > 50) errors.lastName = "Your last name must be 50 characters or fewer.";

  if (!data.email) errors.email = "Enter your email address.";
  else if (data.email.length > 190 || !EMAIL_FORMAT.test(data.email)) {
    errors.email = "Enter an email address in the format name@example.com.";
  }

  const passwordProblem = checkNewPassword(data.password);
  if (passwordProblem) errors.password = passwordProblem;

  return { data, errors };
}

// The rule for a new password (register and password reset). Returns the message, or "".
export function checkNewPassword(password) {
  if (!password) return "Enter a password.";
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use at least 8 characters, with a letter and a number.";
  }
  // bcrypt only uses the first 72 bytes of a password.
  if (Buffer.byteLength(password) > 72) return "Your password is too long. Use 72 characters or fewer.";
  return "";
}

// Reads the email of the "forgot password" form. Returns it in small letters, or "".
export function readEmail(body) {
  const email = readText(body.email).toLowerCase();
  return email.length <= 190 && EMAIL_FORMAT.test(email) ? email : "";
}

// The new password of a reset, which isn't trimmed (a space can be part of a password).
export function readPasswordField(body) {
  return readPassword(body.password);
}

// Reads the login code. Spaces are removed, so "123 456" is accepted. Returns the six digits,
// or "" when it isn't a 6-digit code.
export function readLoginCode(body) {
  const code = readText(body.code).replace(/\s/g, "");
  return /^[0-9]{6}$/.test(code) ? code : "";
}

// Reads the login form. Login only checks that both fields are filled in: the real check is
// the password comparison in the controller.
export function checkLogin(body) {
  const data = {
    email: readText(body.email).toLowerCase(),
    password: readPassword(body.password),
  };
  const errors = {};
  if (!data.email) errors.email = "Enter your email address.";
  if (!data.password) errors.password = "Enter your password.";
  return { data, errors };
}
