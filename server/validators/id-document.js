// Checks the identity-document details before they are saved: the details read from the code that
// the user checked (and maybe corrected), or the details the user typed. The scan can misread a
// character, and the user can type anything, so every field is checked.
import { states } from "mrz";
import { readText, isoDate, today, isRealDate } from "./common.js";

// The controller and the tests take these two from this file.
export { today, isRealDate };
import { westernDigits } from "../utils/printed-text.js";

// The documents that can be saved, with the name shown to the user.
export const DOCUMENT_TYPES = {
  passport: "passport",
  id_card: "ID card",
  driving_licence: "driving licence",
};

// Letters of any script (Latin with accents, Arabic with its vowel marks), spaces, hyphens and
// apostrophes. A code only has A to Z, but the user may type the name as printed on the document.
const NAME_FORMAT = /^[\p{L}][\p{L}\p{M} '-]*$/u;
const NAME_MAX = 50;

// The limits on dates. A verified account is for renting and booking, so its holder must be an
// adult. The other two limits catch typing mistakes in the year.
export const MIN_AGE = 18;
const MAX_AGE = 120;
const MAX_YEARS_VALID = 30; // No identity document is valid for longer.

// The date "years" years from today, as YYYY-MM-DD (a negative number goes back in time).
export function yearsFromToday(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return isoDate(date);
}

// The same clean-up for the scan and the form: capitals, single spaces, and one Unicode form
// (NFC), so the same Arabic or accented name is always stored the same way.
export function normaliseName(text) {
  return readText(text).normalize("NFC").replace(/\s+/g, " ").toUpperCase();
}

// The document type sent by the form: one of the keys of DOCUMENT_TYPES, or "" for anything else.
export function readDocumentType(value) {
  const type = readText(value);
  return Object.hasOwn(DOCUMENT_TYPES, type) ? type : "";
}

// documentType must be one of DOCUMENT_TYPES (the controller takes it from the scan, not the form).
// body.noExpiry = true means the document has no expiry date (some ID cards and driving licences
// never expire); then expiryDate is "" and is saved as NULL. A passport always has one.
export function checkDocumentDetails(body, documentType) {
  const label = DOCUMENT_TYPES[documentType];
  const hasNationality = documentType !== "driving_licence"; // A driving licence doesn't say it.
  const noExpiry = body.noExpiry === true;
  const data = {
    surname: normaliseName(body.surname),
    givenNames: normaliseName(body.givenNames),
    // Arabic-Indic digits become 0-9, and spaces and hyphens are removed: "DL 4829-1736" -> DL48291736.
    documentNumber: westernDigits(readText(body.documentNumber)).toUpperCase().replace(/[\s-]+/g, ""),
    issuingCountry: readText(body.issuingCountry).toUpperCase(),
    nationality: hasNationality ? readText(body.nationality).toUpperCase() : "",
    dateOfBirth: westernDigits(readText(body.dateOfBirth)),
    expiryDate: noExpiry ? "" : westernDigits(readText(body.expiryDate)),
  };
  const errors = {};

  if (!data.surname) errors.surname = `Enter the surname as written on the ${label}.`;
  else if (data.surname.length > NAME_MAX || !NAME_FORMAT.test(data.surname)) {
    errors.surname = `Use letters, spaces, hyphens or apostrophes only (${NAME_MAX} characters at most).`;
  }

  // Some people have no given names, so this field may be empty.
  if (data.givenNames && (data.givenNames.length > NAME_MAX || !NAME_FORMAT.test(data.givenNames))) {
    errors.givenNames = `Use letters, spaces, hyphens or apostrophes only (${NAME_MAX} characters at most).`;
  }

  // A passport number has 9 characters at most (its place in the code); other documents up to 20.
  const maxLength = documentType === "passport" ? 9 : 20;
  if (!data.documentNumber) errors.documentNumber = `Enter the ${label} number.`;
  else if (!new RegExp(`^[A-Z0-9]{1,${maxLength}}$`).test(data.documentNumber)) {
    errors.documentNumber = `A ${label} number has 1 to ${maxLength} letters and numbers.`;
  }

  if (!data.issuingCountry) {
    errors.issuingCountry = `Enter the 3-letter code of the country that issued the ${label}, for example LBN.`;
  } else if (!/^[A-Z]{3}$/.test(data.issuingCountry) || !states[data.issuingCountry]) {
    errors.issuingCountry = "This is not a recognised 3-letter country code (for example LBN or FRA).";
  }

  if (hasNationality) {
    if (!data.nationality) errors.nationality = "Enter the 3-letter nationality code, for example LBN.";
    else if (!/^[A-Z]{3}$/.test(data.nationality) || !states[data.nationality]) {
      errors.nationality = "This is not a recognised 3-letter nationality code (for example LBN or FRA).";
    }
  }

  const now = today();
  if (!isRealDate(data.dateOfBirth)) errors.dateOfBirth = "Enter the date of birth.";
  else if (data.dateOfBirth >= now) errors.dateOfBirth = "The date of birth must be in the past.";
  else if (data.dateOfBirth > yearsFromToday(-MIN_AGE)) {
    errors.dateOfBirth = `You must be at least ${MIN_AGE} years old to verify your account. Check the date of birth.`;
  } else if (data.dateOfBirth < yearsFromToday(-MAX_AGE)) errors.dateOfBirth = "Check the year of birth.";

  if (noExpiry) {
    if (documentType === "passport") errors.expiryDate = "A passport always has an expiry date. Enter it.";
  } else if (!isRealDate(data.expiryDate)) {
    errors.expiryDate = documentType === "passport"
      ? "Enter the expiry date."
      : `Enter the expiry date, or choose "No expiry date" if your ${label} has none.`;
  } else if (data.expiryDate < now) errors.expiryDate = `This ${label} has expired, so it can't be saved.`;
  else if (data.expiryDate > yearsFromToday(MAX_YEARS_VALID)) {
    errors.expiryDate = `Check the expiry year: no ${label} is valid for more than ${MAX_YEARS_VALID} years.`;
  }
  else if (!errors.dateOfBirth && data.expiryDate <= data.dateOfBirth) {
    errors.expiryDate = "The expiry date must be after the date of birth.";
  }

  return { data, errors };
}
