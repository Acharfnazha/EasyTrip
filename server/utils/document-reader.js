// Reads a photo of an identity document (a passport, an ID card or a driving licence) with OCR
// (tesseract.js), in two ways:
//
// 1. The machine-readable code: the 2 or 3 lines of capitals, digits and "<" signs on a passport's
//    photo page and on most ID cards (ICAO 9303). The mrz package reads its fields and checks its
//    check digits.
// 2. The printed text, in Arabic and English: the words a person reads on the document. It checks
//    the names read from the code, and, for a document without a code (most driving licences),
//    the details the user types.
//
// What this proves, and what it doesn't: a code that reads well and printed text that matches only
// show that the photo was read correctly. They do NOT prove that the document is genuine or that
// it belongs to the person who uploads it.
//
// The image only lives in memory: it is never written to the disk, and it is never logged.
import fs from "fs";
import path from "path";
import { createWorker } from "tesseract.js";
import { parse, states } from "mrz";
import rootDir from "./path.js";
import { labelCount, printedLines, textTokens } from "./printed-text.js";

// The OCR models are installed with npm (@tesseract.js-data/eng and /ara), so the server never
// downloads anything while it reads a document.
const MODELS = path.join(rootDir, "node_modules", "@tesseract.js-data");
const MRZ_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";

// The two kinds of reading, each with its own OCR worker and settings:
// - code: English only (the code is A to Z, 0 to 9 and "<"). Page segmentation mode "6" = one
//   block of text.
// - text: Arabic and English. Mode "3" = find the blocks and lines of the page by itself.
const READINGS = {
  code: { languages: "eng", settings: { tessedit_char_whitelist: MRZ_CHARACTERS, tessedit_pageseg_mode: "6" } },
  text: { languages: "ara+eng", settings: { tessedit_pageseg_mode: "3" } },
};

// A photo with fewer words than this shows no document (or is far too blurry to read). The OCR
// also "reads" a few words in any photo, so a document must also show a date, or at least 2 of
// the labels that documents print ("Surname", "Date of birth", "الاسم", ...).
const MIN_WORDS = 4;
const MIN_LABELS = 2;

// ---------- The OCR workers (one per kind of reading, reused) ----------

// tesseract.js reads all the models of a worker from one folder, but npm puts each language in its
// own package. So the folder with both models is made once, in node_modules/.cache (the usual
// place for files that tools make from installed packages).
function modelFolder(languages) {
  const folder = path.join(rootDir, "node_modules", ".cache", "easytrip-ocr");
  fs.mkdirSync(folder, { recursive: true });
  for (const language of languages.split("+")) {
    const file = `${language}.traineddata.gz`;
    const from = path.join(MODELS, language, "4.0.0_best_int", file);
    const to = path.join(folder, file);
    if (!fs.existsSync(to) || fs.statSync(to).size !== fs.statSync(from).size) fs.copyFileSync(from, to);
  }
  return folder;
}

// Starting tesseract takes about a second, so each worker is created the first time and reused.
// A worker reads one image at a time; other requests wait in its queue.
const workers = {}; // { code: Promise<worker>, text: Promise<worker> }

function getWorker(kind) {
  if (!workers[kind]) {
    const { languages, settings } = READINGS[kind];
    workers[kind] = Promise.resolve()
      .then(() => createWorker(languages, 1, { langPath: modelFolder(languages), cacheMethod: "none", gzip: true }))
      .then(async (worker) => {
        await worker.setParameters(settings);
        return worker;
      })
      .catch((error) => {
        delete workers[kind]; // Try again on the next request.
        throw error;
      });
  }
  return workers[kind];
}

async function recognise(kind, image, output) {
  const worker = await getWorker(kind);
  const { data } = await worker.recognize(image, {}, output);
  return data;
}

// Stops the workers (used by the tests, so Node can exit).
export async function closeDocumentReader() {
  const started = Object.values(workers);
  for (const kind of Object.keys(workers)) delete workers[kind];
  for (const workerPromise of started) {
    const worker = await workerPromise.catch(() => null);
    if (worker) await worker.terminate();
  }
}

// ---------- Finding the code lines ----------

// An OCR line as code characters only: no spaces, capitals.
function clean(text) {
  return text.toUpperCase().replace(/[^A-Z0-9<]/g, "");
}

// In runs of "<", the OCR often reads K, L or C instead, or adds them (they look alike when
// small). The two repairs below use each line's fixed layout to put the "<" back.

// A line that ends with a name or an optional field, after a fixed head: once the name ends, the
// line is only "<" filler. That filler (from its first "<") is rewritten as "<", and the line gets
// its exact length.
function repairEnd(text, headLength, length) {
  const head = text.slice(0, headLength);
  let rest = text.slice(headLength);
  const filler = rest.match(/<[<KLC]*$/); // The first "<" after which there is only filler.
  if (filler && filler[0].length >= 3) rest = rest.slice(0, filler.index);
  if (head.length < headLength || rest.length > length - headLength) return null;
  return head + rest.padEnd(length - headLength, "<");
}

// A line with numbers: a fixed part (number, dates, codes and their check digits), an optional
// field that is mostly filler, and the last check digit(s). A missed or extra "<" can only be in
// the optional field, so only that part is repaired.
function repairMiddle(text, fixedLength, optionalLength, tailLength) {
  if (text.length < fixedLength + tailLength) return null;
  const fixed = text.slice(0, fixedLength);
  const tail = text.slice(text.length - tailLength);
  const optionalText = text.slice(fixedLength, text.length - tailLength);
  const filler = optionalText.match(/<[<KLC]*$/);
  const content = filler ? optionalText.slice(0, filler.index) : optionalText;
  const optional = content.length <= optionalLength ? content.padEnd(optionalLength, "<") : content.slice(0, optionalLength);
  return fixed + optional + tail;
}

// The three ICAO 9303 formats: their lines, repaired to their exact layout.
const REPAIRS = {
  TD3: (a, b) => [repairEnd(a, 5, 44), repairMiddle(b, 28, 14, 2)], // passport: 2 lines of 44
  TD2: (a, b) => [repairEnd(a, 5, 36), repairMiddle(b, 28, 7, 1)], // some ID cards: 2 lines of 36
  TD1: (a, b, c) => [repairMiddle(a, 15, 15, 0), repairMiddle(b, 18, 11, 1), repairEnd(c, 0, 30)], // ID cards: 3 of 30
};

// Where each field is in each format: [line, start, end]. Used when the mrz package can't give a
// value (for example a country code with a misread letter), and for the names (see below).
const POSITIONS = {
  TD3: { number: [1, 0, 9], nationality: [1, 10, 13], birth: [1, 13, 19], expiry: [1, 21, 27], names: [0, 5, 44] },
  TD2: { number: [1, 0, 9], nationality: [1, 10, 13], birth: [1, 13, 19], expiry: [1, 21, 27], names: [0, 5, 36] },
  TD1: { number: [0, 5, 14], nationality: [1, 15, 18], birth: [1, 0, 6], expiry: [1, 8, 14], names: [2, 0, 30] },
};

// Looks at the OCR lines for a code. Returns { type, lines } with the repaired lines, or null.
// A code's first line starts with the document's letter (P, I, A, C or V) and has "<" in it.
// Junk read in the filler can make a line longer, so the lengths have some margin.
function findMachineReadableZone(ocrLines) {
  const lines = ocrLines.map((line) => clean(line.text)).filter((text) => text.length >= 26);
  const between = (text, min, max) => text.length >= min && text.length <= max;
  const repaired = (type, found) => {
    const zoneLines = REPAIRS[type](...found);
    return zoneLines.every(Boolean) ? { type, lines: zoneLines } : null;
  };

  // An ID card's three lines of 30 (TD1): the second one starts with the date of birth.
  for (let i = lines.length - 3; i >= 0; i--) {
    const [a, b, c] = lines.slice(i, i + 3);
    if (/^[IAC]/.test(a) && a.includes("<") && /^\d{6}/.test(b) && c.includes("<") &&
        between(a, 26, 52) && between(b, 26, 44) && between(c, 26, 52)) {
      const zone = repaired("TD1", [a, b, c]);
      if (zone) return zone;
    }
  }
  // Two lines. The second one holds the numbers and has little filler, so its length tells a
  // passport (44) from an ID card (36).
  for (let i = lines.length - 2; i >= 0; i--) {
    const [a, b] = lines.slice(i, i + 2);
    if (!/^[PIACV]/.test(a) || !a.includes("<") || a.length < 30) continue;
    const type = between(b, 41, 52) ? "TD3" : between(b, 33, 40) ? "TD2" : null;
    const zone = type && repaired(type, [a, b]);
    if (zone) return zone;
  }
  return null;
}

// Country codes are letters only, so a digit there is a misread letter (0 = O, 1 = I, ...).
function lettersOnly(code) {
  const lookalikes = { 0: "O", 1: "I", 2: "Z", 5: "S", 8: "B" };
  return code.replace(/[01258]/g, (digit) => lookalikes[digit]).replace(/</g, "");
}

// The "<" after the document's letter ("P<", "I<") is sometimes read as "<K": one character too
// many, which moves the rest of the first line. When the issuing country isn't at its place but
// is one character later (a known country, or the same as the nationality), that character is
// removed.
function fixShiftedFirstLine(line, nationality) {
  const known = (code) => code === nationality || Boolean(states[code]);
  if (/^[A-Z]<[KLC]/.test(line) && !known(line.slice(2, 5)) && known(line.slice(3, 6))) {
    return line.slice(0, 2) + line.slice(3) + "<";
  }
  return line;
}

// ---------- Turning the fields into details ----------

// Code dates are YYMMDD. A birth year after this year means 19xx; an expiry date is always 20xx.
function toIsoDate(yymmdd, kind) {
  if (!/^\d{6}$/.test(yymmdd || "")) return "";
  const yy = Number(yymmdd.slice(0, 2));
  const thisYear = new Date().getFullYear() % 100;
  const year = kind === "birth" && yy > thisYear ? 1900 + yy : 2000 + yy;
  const iso = `${year}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
  const check = new Date(iso + "T00:00:00Z");
  return Number.isNaN(check.getTime()) || check.toISOString().slice(0, 10) !== iso ? "" : iso;
}

const CHECK_DIGIT_LABELS = {
  documentNumberCheckDigit: "document number",
  birthDateCheckDigit: "date of birth",
  expirationDateCheckDigit: "expiry date",
  personalNumberCheckDigit: "personal number",
  compositeCheckDigit: "whole code",
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Reads the code. Returns one of:
//   { status: "read", documentType, details, checks, nameField }
//   { status: "no-code" }                no code found, or it can't be read
//   { status: "unsupported", what }      a code, but not a passport's or an ID card's
async function readCode(image) {
  const data = await recognise("code", image, { blocks: true, text: false });
  const ocrLines = (data.blocks || []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));
  const zone = findMachineReadableZone(ocrLines);
  if (!zone) return { status: "no-code" };

  // The code's first letter says what the document is: P = passport; I, A or C = an ID card; V = visa.
  const kind = zone.lines[0][0];
  if (kind === "V") return { status: "unsupported", what: "a visa" };
  const documentType = zone.type === "TD3" ? (kind === "P" ? "passport" : "") : "IAC".includes(kind) ? "id_card" : "";
  if (!documentType) return { status: "unsupported", what: "a travel document that is not a passport or an ID card" };

  const nationalityAt = POSITIONS[zone.type].nationality;
  zone.lines[0] = fixShiftedFirstLine(zone.lines[0], lettersOnly(zone.lines[nationalityAt[0]].slice(nationalityAt[1], nationalityAt[2])));

  let result;
  try {
    result = parse(zone.lines, { autocorrect: true });
  } catch (error) {
    return { status: "no-code" }; // The lines look like a code, but in no known layout.
  }

  // Old French ID cards have their own layout (the mrz package reads it): then only its fields are used.
  const positions = result.format === zone.type ? POSITIONS[zone.type] : null;
  const raw = (name) => (positions ? zone.lines[positions[name][0]].slice(positions[name][1], positions[name][2]) : "");
  const fields = result.fields;
  const failedDigits = result.details
    .filter((detail) => CHECK_DIGIT_LABELS[detail.field] && !detail.valid)
    .map((detail) => CHECK_DIGIT_LABELS[detail.field]);

  const details = {
    surname: fields.lastName || "",
    givenNames: fields.firstName || "",
    documentNumber: (result.documentNumber || fields.documentNumber || raw("number")).replace(/</g, ""),
    issuingCountry: lettersOnly(zone.lines[0].slice(2, 5)),
    nationality: positions ? lettersOnly(raw("nationality")) : fields.nationality || "",
    dateOfBirth: toIsoDate(fields.birthDate || raw("birth"), "birth"),
    expiryDate: toIsoDate(fields.expirationDate || raw("expiry"), "expiry"),
  };
  const countryCodes = [details.issuingCountry, details.nationality].filter(Boolean);

  return {
    status: "read",
    documentType: documentType,
    details: details,
    checks: {
      codeFormat: zone.type,
      checkDigitsValid: failedDigits.length === 0,
      failedCheckDigits: failedDigits,
      countryCodesRecognised: countryCodes.every((code) => Boolean(states[code])),
      expired: details.expiryDate !== "" && details.expiryDate < todayIso(),
    },
    nameField: raw("names"),
  };
}

// ---------- The printed text ----------

async function readPrintedText(image) {
  const data = await recognise("text", image, { text: true });
  const text = data.text || "";
  const lines = printedLines(text);
  return {
    text: text,
    lines: lines,
    wordCount: lines.flatMap((line) => line.split(" ")).filter((word) => word.length >= 2).length,
    // A code line read as ordinary text still has several "<" signs.
    hasCodeLines: text.split("\n").some((line) => /[<«].*[<«]/.test(line) && line.replace(/\s/g, "").length >= 26),
  };
}

// A word of the code's name, as the printed text confirms it. A "<" next to it may have been read as
// an extra K, L or C at its start or end, and a "<" between two names may have been read as one of
// these letters, joining them ("ANNAKMARIA"). Returns the word(s) printed on the document, or null.
function confirmWord(word, printedWords) {
  const trimmed = [word, word.replace(/^[KLC]/, ""), word.replace(/[KLC]$/, ""), word.replace(/^[KLC]|[KLC]$/g, "")];
  const kept = trimmed.find((option) => option && printedWords.has(option));
  if (kept) return [kept];
  for (const option of trimmed) {
    for (let i = 1; i < option.length - 1; i++) {
      const [before, after] = [option.slice(0, i), option.slice(i + 1)];
      if ("KLC".includes(option[i]) && printedWords.has(before) && printedWords.has(after)) return [before, after];
    }
  }
  return null;
}

// The names in a code have no check digit, and the OCR often misreads the "<" between them (see
// confirmWord). The names printed on the document show which reading is right. Then the words are
// split into surname and given names the way they are printed (most documents print each on its
// own line).
// Returns { surname, givenNames }, or null when the printed text doesn't confirm the names.
function namesFromPrintedText(nameField, lines) {
  const printedWords = new Set(lines.flatMap((line) => line.split(" ")));
  const printed = (phrase) => lines.some((line) => ` ${line} `.includes(` ${phrase} `));

  const words = [];
  for (const codeWord of nameField.split(/<+/)) {
    const word = lettersOnly(codeWord); // Names have no digits: a digit is a misread letter.
    if (!word || /^[KLC]{1,2}$/.test(word)) continue; // A "<" read as K, L or C on its own.
    const confirmed = confirmWord(word, printedWords);
    if (!confirmed) return null;
    words.push(...confirmed);
  }
  for (let split = 1; split <= words.length; split++) {
    const surname = words.slice(0, split).join(" ");
    const givenNames = words.slice(split).join(" ");
    if (printed(surname) && (!givenNames || printed(givenNames))) return { surname, givenNames };
  }
  return null;
}

// ---------- The main function ----------

// documentType is what the user chose: "passport", "id_card" or "driving_licence".
// Returns one of:
//   { status: "read", documentType, details, checks, warnings }   read from the code
//   { status: "typed", tokens, warnings }   no code: the user types the details, and the tokens
//                                           (see printed-text.js) are what the photo shows
//   { status: "no-code" }                   a passport whose code can't be read
//   { status: "unsupported", what }         a code, but of another document (a visa, ...)
//   { status: "wrong-type", documentType }  the code shows another type than the one chosen
//   { status: "has-code" }                  a "driving licence" with a passport's or ID card's code
//   { status: "no-text" }                   no document text on the photo (too few words, and no
//                                           date or labels)
export async function readDocument(image, documentType) {
  // Every passport has a code, and so do most ID cards. The driving licences we accept don't, so a
  // "driving licence" with a code is a passport or an ID card sent with the wrong type.
  const code = await readCode(image);
  if (documentType === "driving_licence") {
    if (code.status !== "no-code") return { status: "has-code" };
  } else {
    if (code.status === "unsupported") return code;
    if (code.status === "read" && code.documentType !== documentType) {
      return { status: "wrong-type", documentType: code.documentType };
    }
    if (code.status === "no-code" && documentType === "passport") return { status: "no-code" };
  }

  const printed = await readPrintedText(image);

  if (code.status === "read") {
    const { details, checks } = code;
    const names = code.nameField ? namesFromPrintedText(code.nameField, printed.lines) : null;
    if (names) {
      details.surname = names.surname;
      details.givenNames = names.givenNames;
    }
    checks.namesMatchPrintedText = Boolean(names);

    const warnings = [];
    if (!names) {
      warnings.push(
        "Check the names carefully: they could not be matched with the names printed on the document, " +
          "and the sign between names in the code is often read as K or L."
      );
    }
    if (!checks.checkDigitsValid) {
      warnings.push(
        `Some characters were probably misread: the check digits don't match (${checks.failedCheckDigits.join(", ")}). ` +
          "The photo may be blurry or have glare. Check every detail carefully, or take a sharper photo."
      );
    }
    if (!checks.countryCodesRecognised) {
      warnings.push("A country code is not a recognised country code. Check the issuing country and the nationality.");
    }
    if (checks.expired) warnings.push(`This document expired on ${details.expiryDate}, so it can't be saved.`);
    if (!details.dateOfBirth) warnings.push("The date of birth could not be read. Type it in.");
    if (!details.expiryDate) {
      warnings.push(documentType === "passport"
        ? "The expiry date could not be read. Type it in."
        : "No expiry date could be read. Type it in, or choose \"No expiry date\" if the card has none.");
    }
    if (!details.nationality) warnings.push("The nationality is not in this code. Type it in.");

    return { status: "read", documentType, details, checks, warnings };
  }

  // No code was read: a driving licence, or an ID card without a code.
  const tokens = textTokens(printed.text);
  const hasDate = tokens.some((token) => token.startsWith("D") && token.includes("-")); // "D1995-04-12"
  const looksLikeDocument = hasDate || labelCount(printed.lines.join("\n")) >= MIN_LABELS;
  if (printed.wordCount < MIN_WORDS || !looksLikeDocument) return { status: "no-text" };

  const warnings = [];
  if (printed.hasCodeLines) {
    warnings.push(
      "This photo seems to have a machine-readable code, but it couldn't be read. A sharper photo of " +
        "the side with the code lets the server read the details for you."
    );
  }
  return { status: "typed", tokens, warnings };
}
