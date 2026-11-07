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

  if (!data.password) errors.password = "Enter a password.";
  else if (data.password.length < 8 || !/[a-zA-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    errors.password = "Use at least 8 characters, with a letter and a number.";
  } else if (Buffer.byteLength(data.password) > 72) {
    // bcrypt only uses the first 72 bytes of a password.
    errors.password = "Your password is too long. Use 72 characters or fewer.";
  }

  return { data, errors };
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
