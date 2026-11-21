// Tests of identity-document scanning: the reader (tesseract.js + mrz) on the synthetic photos in
// test/fixtures/id-documents, the printed-text helpers, and the checks on the details a user saves.
// Run them with: npm test   (no server and no database needed)
//
// What the tests can't show: how well real phone photos are read. The fixtures are clean,
// computer-made images, so real photos (angle, glare, low light) will be read less well.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { readDocument, closeDocumentReader } from "../server/utils/document-reader.js";
import {
  datesIn, detailTokens, guessDetails, labelCount, plain, printedLines, textTokens, westernDigits, wordsOf,
} from "../server/utils/printed-text.js";
import { checkDocumentDetails, readDocumentType, yearsFromToday } from "../server/validators/id-document.js";

const fixtures = path.join(import.meta.dirname, "fixtures", "id-documents");
const read = (file, type) => readDocument(fs.readFileSync(path.join(fixtures, file)), type);

after(closeDocumentReader);

// The fictional person on every fixture (see test/fixtures/id-documents/README.md).
const ROSE = { surname: "TESTER", givenNames: "SAMPLE ROSE", dateOfBirth: "1995-04-12", expiryDate: "2031-08-30" };

// ---------- Documents with a code ----------

for (const file of ["passport-valid.png", "passport-valid.jpg", "passport-valid.webp"]) {
  test(`reads a valid passport (${path.extname(file)})`, async () => {
    const result = await read(file, "passport");
    assert.equal(result.status, "read");
    assert.equal(result.documentType, "passport");
    assert.deepEqual(result.details, { ...ROSE, documentNumber: "X4K29Q817", issuingCountry: "XXA", nationality: "XXA" });
    assert.equal(result.checks.codeFormat, "TD3");
    assert.equal(result.checks.checkDigitsValid, true);
    assert.equal(result.checks.countryCodesRecognised, true);
    assert.equal(result.checks.expired, false);
    // The code's names (with "<" read as K) were checked against the printed names.
    assert.equal(result.checks.namesMatchPrintedText, true);
    assert.deepEqual(result.warnings, []);
  });
}

test("reports a check digit that doesn't match", async () => {
  const result = await read("passport-bad-check-digit.png", "passport");
  assert.equal(result.status, "read");
  assert.equal(result.checks.checkDigitsValid, false);
  assert.ok(result.checks.failedCheckDigits.includes("date of birth"));
  assert.ok(result.warnings.some((warning) => warning.includes("check digits don't match")));
});

test("flags an expired passport", async () => {
  const result = await read("passport-expired.png", "passport");
  assert.equal(result.status, "read");
  assert.equal(result.checks.expired, true);
  assert.ok(result.warnings.some((warning) => warning.includes("expired")));
});

test("reads the ICAO specimen, repairs its shifted first line, and flags its fictional country", async () => {
  const result = await read("passport-icao-specimen-expired.png", "passport");
  assert.equal(result.status, "read");
  assert.equal(result.details.documentNumber, "L898902C3");
  assert.equal(result.details.issuingCountry, "UTO"); // "P<UTO" is read as "P<KUTO"
  assert.equal(result.details.nationality, "UTO"); // read as "UT0": a digit in a country code becomes a letter
  assert.equal(result.details.surname, "ERIKSSON");
  assert.equal(result.details.givenNames, "ANNA MARIA"); // "ANNA<MARIA" is read as "ANNAKMARIA"
  assert.equal(result.checks.checkDigitsValid, true);
  assert.equal(result.checks.countryCodesRecognised, false);
  assert.equal(result.checks.expired, true);
});

test("says the code of a blurry passport can't be read", async () => {
  const result = await read("passport-blurry.png", "passport");
  assert.equal(result.status, "no-code");
});

for (const [file, format] of [["id-card-td1.png", "TD1"], ["id-card-td2.png", "TD2"]]) {
  test(`reads an ID card with a ${format} code`, async () => {
    const result = await read(file, "id_card");
    assert.equal(result.status, "read");
    assert.equal(result.documentType, "id_card");
    assert.deepEqual(result.details, { ...ROSE, documentNumber: "C58219047", issuingCountry: "XXA", nationality: "XXA" });
    assert.equal(result.checks.codeFormat, format);
    assert.equal(result.checks.checkDigitsValid, true);
    assert.equal(result.checks.namesMatchPrintedText, true);
  });
}

test("says when the photo shows another type of document than the one chosen", async () => {
  assert.deepEqual(await read("id-card-td1.png", "passport"), { status: "wrong-type", documentType: "id_card" });
  assert.deepEqual(await read("passport-valid.png", "id_card"), { status: "wrong-type", documentType: "passport" });
});

test("refuses a visa", async () => {
  const result = await read("visa.png", "passport");
  assert.equal(result.status, "unsupported");
  assert.equal(result.what, "a visa");
});

// ---------- Documents without a code ----------

for (const file of ["driving-licence.png", "driving-licence.jpg"]) {
  test(`reads the printed text of a driving licence (${path.extname(file)})`, async () => {
    const result = await read(file, "driving_licence");
    assert.equal(result.status, "typed");
    // The licence number is printed "DL 4829 1736" and the dates "12.04.1995" and "30.08.2031".
    for (const token of ["TESTER", "SAMPLE", "ROSE", "DL48291736", "D1995-04-12", "D2031-08-30"]) {
      assert.ok(result.tokens.includes(token), `expected ${token} on the photo`);
    }
  });
}

test("lets the user type the details of an ID card without a code", async () => {
  const result = await read("id-card-front-no-code.png", "id_card");
  assert.equal(result.status, "typed");
  for (const token of ["TESTER", "SAMPLE", "ROSE", "582190473", "D1995-04-12", "D2031-08-30"]) {
    assert.ok(result.tokens.includes(token), `expected ${token} on the photo`);
  }
});

// ---------- Filling in the form from the printed text ----------

test("fills in the details of an ID card without a code from its printed text", async () => {
  const result = await read("id-card-front-no-code.png", "id_card");
  assert.deepEqual(result.details, {
    ...ROSE, documentNumber: "582190473", issuingCountry: "XXA", nationality: "XXA",
  });
});

test("fills in a driving licence, in English and in Arabic and English", async () => {
  for (const file of ["driving-licence.png", "driving-licence-arabic-english.png"]) {
    const result = await read(file, "driving_licence");
    assert.equal(result.details.surname, "TESTER", file);
    assert.equal(result.details.documentNumber, "DL48291736", file);
    assert.equal(result.details.dateOfBirth, "1995-04-12", file);
    assert.equal(result.details.expiryDate, "2031-08-30", file); // not the "Issued" date
    assert.equal(result.details.nationality, "", file); // a licence doesn't say it
  }
});

test("fills in a Lebanese ID card printed in Arabic, and leaves out the parents' names", () => {
  const text = [
    "الجمهورية اللبنانية",
    "بطاقة هوية",
    "الشهرة: تجربة",
    "الاسم: وردة",
    "اسم الأب: سامي",
    "اسم الأم: ليلى",
    "محل الولادة: بيروت",
    "تاريخ الولادة: 1995/04/12",
    "رقم البطاقة: 0001 2345 6789",
  ].join("\n");
  assert.deepEqual(guessDetails(text, "id_card"), {
    surname: "تجربة", givenNames: "وردة", documentNumber: "000123456789",
    issuingCountry: "LBN", nationality: "LBN", dateOfBirth: "1995-04-12", expiryDate: "",
  });
});

test("finds a value printed on the line after its label, and dates without labels", () => {
  const text = "REPUBLIC OF LEBANON\nSurname\nNAZHA\nGiven names\nACHRAF\n12/04/1995\n30/08/2031";
  const details = guessDetails(text, "id_card");
  assert.equal(details.surname, "NAZHA");
  assert.equal(details.givenNames, "ACHRAF");
  assert.equal(details.issuingCountry, "LBN");
  assert.equal(details.dateOfBirth, "1995-04-12"); // the date of an adult
  assert.equal(details.expiryDate, "2031-08-30"); // the date in the future
});

test("leaves every detail empty when nothing can be read", () => {
  assert.deepEqual(guessDetails("", "id_card"), {
    surname: "", givenNames: "", documentNumber: "", issuingCountry: "", nationality: "", dateOfBirth: "", expiryDate: "",
  });
});

test("says a 'driving licence' with a passport's code is the wrong type", async () => {
  assert.deepEqual(await read("passport-valid.png", "driving_licence"), { status: "has-code" });
});

test("refuses a photo with no text", async () => {
  assert.deepEqual(await read("no-text.png", "driving_licence"), { status: "no-text" });
  assert.deepEqual(await read("no-text.png", "id_card"), { status: "no-text" });
});

test("refuses a photo with words but no date and no document labels (not a document)", async () => {
  assert.deepEqual(await read("words-no-date.png", "driving_licence"), { status: "no-text" });
});

// ---------- Arabic ----------

// "وردة تجربة" (Rose Test), the Arabic fixtures' fictional person.
const WARDA = { surname: "تجربة", givenNames: "وردة", documentNumber: "٥٨٢١٩٠٤٧٣", dateOfBirth: "1995-04-12", expiryDate: "" };
const allFound = (result, tokens) => tokens.every((token) => result.tokens.includes(token));

test("reads the Arabic names of an ID card printed in Arabic only", async () => {
  const result = await read("id-card-arabic.png", "id_card");
  assert.equal(result.status, "typed"); // no code, and no date in Western digits: the labels show it is a document
  const typed = detailTokens(WARDA);
  assert.ok(allFound(result, typed.surname), "surname found");
  assert.ok(allFound(result, typed.given_names), "given name found");
  // Its dates and number use Arabic-Indic digits (١٩٩٥), which the OCR model reads badly: they
  // are not found, so an admin checks them (a known limit, see server/README.md).
});

test("reads a driving licence printed in Arabic and English", async () => {
  const result = await read("driving-licence-arabic-english.png", "driving_licence");
  assert.equal(result.status, "typed");
  for (const detail of [detailTokens(WARDA), detailTokens({ surname: "TESTER", givenNames: "ROSE" })]) {
    assert.ok(allFound(result, detail.surname) && allFound(result, detail.given_names));
  }
  for (const token of ["DL48291736", "D1995-04-12", "D2031-08-30"]) assert.ok(result.tokens.includes(token), token);
});

test("writes Arabic one way, so the same word always compares equal", () => {
  assert.equal(plain("أيار"), plain("ايار")); // hamza
  assert.equal(plain("آذار"), plain("اذار")); // madda
  assert.equal(plain("وَرْدَة"), plain("وردة")); // vowel marks
  assert.equal(plain("وردة"), plain("ورد")); // a final ة is often misread or missed
  assert.equal(plain("مستشفى"), plain("مستشفي"));
  assert.equal(plain("‏وردة‎"), plain("وردة")); // hidden direction marks
  assert.equal(westernDigits("١٩٩٥/٠٤/١٢ ۵"), "1995/04/12 5");
  assert.deepEqual(wordsOf("وردة / ROSE 4829"), [plain("وردة"), "ROSE", "4829"]);
});

test("finds Arabic dates and counts document labels", () => {
  assert.ok(datesIn("تاريخ الولادة: ١٩٩٥/٠٤/١٢").includes("1995-04-12"));
  assert.ok(datesIn("12 نيسان 1995").includes("1995-04-12"));
  assert.ok(datesIn("٣ تشرين الأول ٢٠٢٠").includes("2020-10-03"));
  assert.ok(datesIn("5 أغسطس 2001").includes("2001-08-05"));
  assert.equal(labelCount("الشهرة تجربة\nالاسم وردة\nتاريخ الولادة"), 4);
  assert.equal(labelCount("Surname TESTER\nDate of birth"), 3);
  assert.equal(labelCount("SEASIDE HOTEL\nBreakfast served on the terrace"), 0);
});

test("never claims that a document is genuine or verified", async () => {
  for (const [file, type] of [["passport-valid.png", "passport"], ["driving-licence.png", "driving_licence"]]) {
    const result = await read(file, type);
    assert.equal(JSON.stringify(result).match(/verified|genuine|authentic/i), null);
  }
});

// ---------- The printed-text helpers (no OCR) ----------

test("finds dates written in different ways", () => {
  assert.ok(datesIn("Date of birth 12.04.1995").includes("1995-04-12"));
  assert.ok(datesIn("12.04.1995").includes("1995-12-04")); // could also be month first
  assert.ok(datesIn("DOB 04/12/95").includes("1995-04-12")); // US order, 2-digit year
  assert.ok(datesIn("1995-04-12").includes("1995-04-12"));
  assert.ok(datesIn("12 APR 1995").includes("1995-04-12"));
  assert.ok(datesIn("12 avril 1995").includes("1995-04-12"));
  assert.ok(datesIn("12 juillet 1995").includes("1995-07-12"));
  assert.deepEqual(datesIn("31.02.1995"), []); // February 31st doesn't exist (and there is no month 31)
});

test("joins words printed with spaces and leaves the code lines out", () => {
  const text = "Licence no.\nDL 4829 1736\nP<XXATESTERK<KSAMPLE<KROSE<<<<<<<\nTESTER";
  const tokens = textTokens(text);
  assert.ok(tokens.includes("DL48291736"));
  assert.ok(tokens.includes("TESTER"));
  assert.ok(!tokens.includes("KSAMPLE")); // only in the code line
  assert.deepEqual(printedLines(text), ["LICENCE NO", "DL 4829 1736", "TESTER"]);
});

test("turns typed details into the tokens to look for", () => {
  const tokens = detailTokens({ ...ROSE, givenNames: "Sample  Rose J", documentNumber: "DL 4829-1736" });
  assert.deepEqual(tokens, {
    surname: ["TESTER"],
    given_names: ["SAMPLE", "ROSE"], // "J" (one letter) is skipped
    document_number: ["DL48291736"],
    date_of_birth: ["D1995-04-12"],
    expiry_date: ["D2031-08-30"],
  });
});

// ---------- The checks on saved details ----------

const goodPassport = {
  surname: "Tester",
  givenNames: "Sample  Rose",
  documentNumber: "x4k29q817",
  issuingCountry: "xxa",
  nationality: "xxa",
  dateOfBirth: "1995-04-12",
  expiryDate: "2031-08-30",
};

test("accepts good passport details and writes them like the document", () => {
  const { data, errors } = checkDocumentDetails(goodPassport, "passport");
  assert.deepEqual(errors, {});
  assert.deepEqual(data, { ...ROSE, documentNumber: "X4K29Q817", issuingCountry: "XXA", nationality: "XXA" });
});

test("accepts a driving licence without nationality and with a long, spaced number", () => {
  const licence = { ...goodPassport, documentNumber: "dl 4829-1736 0042", nationality: "anything" };
  const { data, errors } = checkDocumentDetails(licence, "driving_licence");
  assert.deepEqual(errors, {});
  assert.equal(data.documentNumber, "DL482917360042");
  assert.equal(data.nationality, ""); // a licence doesn't say it, so it is never saved
});

const wrong = [
  ["passport", "surname", "", "an empty surname"],
  ["passport", "surname", "<script>", "HTML in a name"],
  ["passport", "documentNumber", "X4K/29Q", "a symbol in the number"],
  ["passport", "documentNumber", "ABCDEFGHIJ", "a passport number longer than 9"],
  ["id_card", "documentNumber", "A".repeat(21), "an ID card number longer than 20"],
  ["id_card", "issuingCountry", "ZZZ", "an unknown issuing country"],
  ["id_card", "nationality", "", "an ID card without nationality"],
  ["passport", "nationality", "ZZZ", "an unknown nationality"],
  ["passport", "dateOfBirth", "1995-02-30", "a date that doesn't exist"],
  ["passport", "dateOfBirth", "2999-01-01", "a birth date in the future"],
  ["driving_licence", "expiryDate", "2020-01-01", "an expired driving licence"],
  ["passport", "expiryDate", "31/08/2031", "a date in another format"],
];
for (const [type, fieldName, value, what] of wrong) {
  test(`refuses ${what}`, () => {
    const { errors } = checkDocumentDetails({ ...goodPassport, [fieldName]: value }, type);
    assert.ok(errors[fieldName], `expected an error for ${fieldName}`);
  });
}

test("only accepts adults, and possible years", () => {
  const born = (date) => checkDocumentDetails({ ...goodPassport, dateOfBirth: date }, "passport").errors.dateOfBirth;
  const expires = (date) => checkDocumentDetails({ ...goodPassport, expiryDate: date }, "passport").errors.expiryDate;
  assert.equal(born(yearsFromToday(-18)), undefined); // 18 today: accepted
  assert.match(born(yearsFromToday(-17)), /at least 18/);
  assert.match(born(yearsFromToday(-1)), /at least 18/); // a one-year-old
  assert.match(born("1890-01-01"), /year of birth/);
  assert.equal(expires(yearsFromToday(10)), undefined);
  assert.match(expires(yearsFromToday(40)), /expiry year/);
});

test("accepts an Arabic ID card with no expiry date, and Arabic-Indic digits in its number", () => {
  const card = { ...WARDA, givenNames: "وَردة", issuingCountry: "LBN", nationality: "LBN", noExpiry: true, expiryDate: "2031-08-30" };
  const { data, errors } = checkDocumentDetails(card, "id_card");
  assert.deepEqual(errors, {});
  assert.equal(data.surname, "تجربة");
  assert.equal(data.documentNumber, "582190473");
  assert.equal(data.expiryDate, ""); // saved as NULL: "No expiry date" wins over a typed date
});

test("refuses a passport with no expiry date, and a card with no date and no choice", () => {
  assert.ok(checkDocumentDetails({ ...goodPassport, noExpiry: true }, "passport").errors.expiryDate);
  const { errors } = checkDocumentDetails({ ...goodPassport, expiryDate: "" }, "id_card");
  assert.match(errors.expiryDate, /No expiry date/);
  // Only the JSON value true counts, not the text "true".
  assert.ok(checkDocumentDetails({ ...goodPassport, expiryDate: "", noExpiry: "true" }, "id_card").errors.expiryDate);
});

test("refuses values that are not text", () => {
  const { errors } = checkDocumentDetails({ ...goodPassport, surname: ["TESTER"], documentNumber: { a: 1 } }, "passport");
  assert.ok(errors.surname);
  assert.ok(errors.documentNumber);
});

test("accepts only the three document types", () => {
  assert.equal(readDocumentType("id_card"), "id_card");
  assert.equal(readDocumentType(" driving_licence "), "driving_licence");
  for (const value of ["visa", "toString", "", ["passport"], undefined]) assert.equal(readDocumentType(value), "");
});
