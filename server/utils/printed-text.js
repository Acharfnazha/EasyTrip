// The printed text of a document photo: the words a person reads on it (not the machine-readable
// code). It is used in two ways:
// - to check the names read from the code (see document-reader.js);
// - for a document without a code (most driving licences): the user types the details, and the
//   server checks which of them appear in the text read on the photo.
//
// To compare them, the photo's text and the typed details are turned into "tokens" with the same
// rules: words (English or Arabic) written one way, numbers without spaces, and dates as YYYY-MM-DD.
// These functions only work on text, so the tests can run them without OCR.

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"; // Arabic-Indic digits
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"; // Extended Arabic-Indic digits (Persian, Urdu)

// "١٩٩٥" -> "1995"
export function westernDigits(text) {
  return String(text)
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
}

// One way to write each word, so the same word always compares equal:
// - capitals without accents: "Hélène" -> "HELENE";
// - Arabic without vowel marks (harakat), hamza or madda, and without the stretching line (tatweel):
//   "أ", "إ", "آ" -> "ا"; and "ى" -> "ي", which are often written one for the other;
// - Arabic without "ة" or "ه" at the end of a word: the OCR often reads a final "ة" as "ه", as "3",
//   or not at all, so "وردة", "ورده" and "ورد" all compare equal;
// - Western digits, and no hidden right-to-left marks (the OCR adds them around Arabic words).
// NFD splits a letter from its marks ("أ" = "ا" + hamza), and \p{M} removes the marks.
export function plain(text) {
  return westernDigits(String(text).normalize("NFD"))
    .replace(/[\p{M}\p{Cf}ـ]/gu, "")
    .replace(/ى/g, "ي")
    .replace(/ٱ/g, "ا")
    .replace(/[ةه](?![\p{L}\p{N}])/gu, "")
    .toUpperCase();
}

// The words of a text: letters (of any script) and digits only.
// "DL 4829-1736." -> ["DL", "4829", "1736"]; "وردة تجربة" -> ["ورده", "تجربه"]
export function wordsOf(text) {
  return plain(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// A line of the machine-readable code, read as ordinary text: it has "<" signs (sometimes read as
// "«"), or a long run of letters and digits without spaces. It is not printed text for a person,
// so it is left out: otherwise the names read from the code would be "checked" against themselves.
export function isCodeLine(line) {
  return /[<«]/.test(line) || /[A-Z0-9]{25,}/.test(plain(line));
}

// The lines a person reads (code lines left out), each as its words with single spaces.
export function printedLines(text) {
  return String(text)
    .split("\n")
    .filter((line) => !isCodeLine(line))
    .map((line) => wordsOf(line).join(" "))
    .filter(Boolean);
}

// ---------- Dates ----------

// Month names in English and French, by their first 3 or 4 letters (JUIN and JUIL need 4).
const LATIN_MONTHS = {
  JAN: 1, FEB: 2, FEV: 2, MAR: 3, APR: 4, AVR: 4, MAY: 5, MAI: 5, JUN: 6, JUIN: 6,
  JUL: 7, JUIL: 7, AUG: 8, AOU: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

// Month names in Arabic: the names used in Lebanon, Syria, Jordan and Iraq, then the ones used in
// Egypt and the Gulf. They are written here normally and turned into their plain() form.
const ARABIC_MONTHS = Object.fromEntries(
  [
    ["كانون الثاني", 1], ["شباط", 2], ["آذار", 3], ["نيسان", 4], ["أيار", 5], ["حزيران", 6],
    ["تموز", 7], ["آب", 8], ["أيلول", 9], ["تشرين الأول", 10], ["تشرين الثاني", 11], ["كانون الأول", 12],
    ["يناير", 1], ["فبراير", 2], ["مارس", 3], ["أبريل", 4], ["إبريل", 4], ["مايو", 5], ["يونيو", 6],
    ["يونيه", 6], ["يوليو", 7], ["يوليه", 7], ["أغسطس", 8], ["سبتمبر", 9], ["أكتوبر", 10],
    ["نوفمبر", 11], ["ديسمبر", 12],
  ].map(([name, month]) => [plain(name), month])
);

// The month of a written name ("APRIL", "AVRIL", "نيسان", "تشرين الأول"), or 0.
function monthNumber(name) {
  return ARABIC_MONTHS[name] || ARABIC_MONTHS[name.split(" ")[0]] || LATIN_MONTHS[name.slice(0, 4)] ||
    LATIN_MONTHS[name.slice(0, 3)] || 0;
}

// "YYYY-MM-DD" for a real date, or "" ("1995-02-30" doesn't exist).
function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== Number(day)) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

// A 2-digit year can be 19xx or 20xx, so both are kept.
function fullYears(year) {
  return year.length === 4 ? [Number(year)] : [1900 + Number(year), 2000 + Number(year)];
}

// The dates written in one line, as YYYY-MM-DD. Documents write dates in many ways, so every
// possible reading is kept: 12.04.1995 (day first), 04/12/1995 (month first, as in the US),
// 1995/04/12, 12 APR 95, 12 AVRIL 1995, 12 نيسان 1995, and the same with Arabic-Indic digits.
export function datesIn(line) {
  const text = plain(line);
  const found = new Set();
  const add = (year, month, day) => {
    const iso = isoDate(year, Number(month), Number(day));
    if (iso) found.add(iso);
  };

  for (const [, a, b, year] of text.matchAll(/(?<!\d)(\d{1,2})[./ -](\d{1,2})[./ -](\d{4}|\d{2})(?!\d)/g)) {
    for (const y of fullYears(year)) {
      add(y, b, a); // day first
      add(y, a, b); // month first
    }
  }
  for (const [, year, month, day] of text.matchAll(/(?<!\d)(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?!\d)/g)) {
    add(Number(year), month, day);
  }
  // A month name of one or two words ("تشرين الأول") between the day and the year.
  const withName = /(?<!\d)(\d{1,2})[ .-]*(\p{L}{2,9}(?: \p{L}{2,9})?)[ .-]*(\d{4}|\d{2})(?!\d)/gu;
  for (const [, day, name, year] of text.matchAll(withName)) {
    const month = monthNumber(name);
    if (month) for (const y of fullYears(year)) add(y, month, day);
  }
  return [...found];
}

// ---------- Is it a document? ----------

// Words that identity documents print as labels, in English, French and Arabic. A photo with
// none of them and no date is not a document: the OCR also "reads" a few words in any photo.
const LABELS = new Set(
  [
    "SURNAME", "NAME", "NAMES", "GIVEN", "BIRTH", "DATE", "EXPIRY", "EXPIRES", "VALID", "ISSUED",
    "ISSUE", "NATIONALITY", "SEX", "LICENCE", "LICENSE", "DRIVING", "CARD", "IDENTITY", "PASSPORT",
    "NUMBER", "PLACE", "NOM", "PRENOM", "PRENOMS", "NAISSANCE", "NATIONALITE", "PERMIS", "CONDUIRE",
    "CARTE", "IDENTITE", "VALABLE", "SEXE",
    "اسم", "شهرة", "لقب", "عائلة", "تاريخ", "ولادة", "ميلاد", "رقم", "بطاقة", "هوية", "رخصة", "سوق",
    "قيادة", "جنسية", "محل", "مكان", "إصدار", "صالحة", "لغاية", "انتهاء", "جواز", "سفر",
  ].map(plain)
);

// How many different label words a text has. Arabic writes "the" ("ال") as part of the word, so
// "الاسم" also counts as "اسم".
export function labelCount(text) {
  const found = new Set();
  for (const word of wordsOf(text)) {
    const withoutThe = word.startsWith("ال") && word.length > 3 ? word.slice(2) : word;
    if (LABELS.has(word)) found.add(word);
    else if (LABELS.has(withoutThe)) found.add(withoutThe);
  }
  return found.size;
}

// ---------- Tokens ----------

// Everything on the photo that a typed detail could match:
// - each word ("TESTER", "1995"),
// - up to 4 words of a line written together, because a number printed as "DL 4829 1736" is
//   typed as "DL48291736" (20 characters at most, the longest document number),
// - each date, as "D" + YYYY-MM-DD (the "-" means it can never be the same as a word).
export function textTokens(text) {
  const tokens = new Set();
  for (const line of String(text).split("\n")) {
    if (isCodeLine(line)) continue;
    const words = wordsOf(line);
    for (let start = 0; start < words.length; start++) {
      let joined = "";
      for (let end = start; end < Math.min(words.length, start + 4); end++) {
        joined += words[end];
        if (joined.length > 20) break;
        if (joined.length >= 2) tokens.add(joined);
      }
    }
    for (const iso of datesIn(line)) tokens.add("D" + iso);
  }
  return [...tokens];
}

// ---------- Filling in the form from the printed text ----------

// The label words of each detail, in their plain() form. An Arabic label is also found with "ال"
// ("the") in front ("الشهرة" = "شهرة"). "SUMAME" is how the OCR often reads "Surname".
const LABEL_WORDS = Object.fromEntries(
  Object.entries({
    surname: ["SURNAME", "SURNAMES", "SUMAME", "FAMILY", "LAST", "NOM", "شهرة", "لقب", "عائلة", "كنية"],
    givenNames: ["GIVEN", "FIRST", "FORENAME", "FORENAMES", "PRENOM", "PRENOMS", "اسم"],
    name: ["NAME", "NAMES"],
    birth: ["BIRTH", "NAISSANCE", "ولادة", "ميلاد"],
    expiry: ["EXPIRY", "EXPIRES", "EXPIRATION", "VALID", "UNTIL", "VALABLE", "صالحة", "لغاية", "انتهاء"],
    issued: ["ISSUED", "ISSUE", "DELIVRE", "DELIVRANCE", "اصدار", "إصدار", "منح"],
    number: ["NO", "NUMBER", "NUM", "NR", "N", "رقم"],
    nationality: ["NATIONALITY", "NATIONALITE", "جنسية"],
    // Another person's name ("father's name", "اسم الأب") or the place of birth: never the holder's name.
    other: ["FATHER", "MOTHER", "FATHERS", "MOTHERS", "PLACE", "LIEU", "اب", "أب", "ام", "أم", "والد", "والدة", "محل", "مكان"],
  }).map(([kind, words]) => [kind, new Set(words.map(plain))])
);
// Small words around the labels, never part of a name.
const FILLER_WORDS = new Set(["OF", "DATE", "THE", "DE", "DU", "CARD", "تاريخ", "حتى"].map(plain));

// The label kinds of one word ("الشهرة" -> ["surname"]).
function labelKinds(word) {
  const options = [word];
  if (word.startsWith("ال") && word.length > 3) options.push(word.slice(2));
  return Object.keys(LABEL_WORDS).filter((kind) => options.some((option) => LABEL_WORDS[kind].has(option)));
}

// A line as its words, each with its written form (kept for the names, as printed) and its plain
// form (to compare), and the label kinds found in the line.
function lineInfo(line) {
  const words = String(line).replace(/\p{Cf}/gu, "").split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean)
    .map((raw) => ({ raw, plain: plain(raw) })).filter((word) => word.plain);
  for (const word of words) word.kinds = labelKinds(word.plain);
  return { text: line, words, kinds: new Set(words.flatMap((word) => word.kinds)) };
}

// The name in a line: its words that are not labels, letters only. A bilingual line
// ("TESTER / تجربة Surname / الشهرة") gives the name in English letters.
function nameIn(info) {
  const words = info.words
    .filter((word) => word.kinds.length === 0 && !FILLER_WORDS.has(word.plain) && /^\p{L}[\p{L}\p{M}]+$/u.test(word.raw))
    .map((word) => word.raw);
  const latin = words.filter((word) => /^[A-Za-zÀ-ÿ'-]+$/.test(word));
  const chosen = latin.length > 0 ? latin : words;
  return chosen.join(" ").slice(0, 50);
}

// The document number in a line: the longest run of words made of A-Z and 0-9 with a digit in it,
// written together ("DL 4829 1736" -> "DL48291736"). Labels are left out first.
function numberIn(info) {
  let best = "";
  let run = [];
  const close = () => {
    const joined = run.join("");
    if (/\d/.test(joined) && joined.length <= 20 && joined.length > best.length) best = joined;
    run = [];
  };
  for (const word of info.words) {
    // Letters alone only in a short prefix ("DL"), so a word like "LICENCE" never joins the number.
    const fits = /^[A-Z0-9]+$/.test(word.plain) && (/\d/.test(word.plain) || word.plain.length <= 3);
    if (word.kinds.length === 0 && fits) run.push(word.plain);
    else close();
  }
  close();
  return best;
}

// Countries found by name in the text, with their 3-letter code. Arabic names are found inside a
// word too ("اللبنانية" has "لبنان").
const COUNTRY_NAMES = [
  ["LBN", ["LEBANON", "LEBANESE", "LIBAN", "LIBANAISE"], ["لبنان"]],
  ["SYR", ["SYRIA", "SYRIAN"], ["سوري"]],
  ["JOR", ["JORDAN", "JORDANIAN"], ["اردن"]],
  ["IRQ", ["IRAQ", "IRAQI"], ["عراق"]],
  ["EGY", ["EGYPT", "EGYPTIAN"], ["مصري", "مصر"]],
  ["SAU", ["SAUDI"], ["سعودي"]],
  ["ARE", ["EMIRATES"], ["امارات"]],
  ["PSE", ["PALESTINE", "PALESTINIAN"], ["فلسطين"]],
  ["FRA", ["FRANCE", "FRANCAISE"], []],
];

function countryIn(text) {
  const words = new Set(wordsOf(text));
  const joined = wordsOf(text).join(" ");
  for (const [code, latin, arabic] of COUNTRY_NAMES) {
    if (latin.some((name) => words.has(name)) || arabic.some((name) => joined.includes(plain(name)))) return code;
  }
  return "";
}

// The details a person would read on a document without a code, guessed from its printed text by
// their labels ("Surname", "الشهرة", "Date of birth", "Card no."...). A detail that isn't found is
// "": the user types it. The user checks every detail before saving, and the server then checks
// which of them are on the photo, as for typed details.
export function guessDetails(text, documentType) {
  const lines = String(text).split("\n").filter((line) => line.trim() && !isCodeLine(line)).map(lineInfo);
  const details = { surname: "", givenNames: "", documentNumber: "", issuingCountry: "", nationality: "", dateOfBirth: "", expiryDate: "" };

  // The value of a label is on its own line, or on the next line when the label is alone.
  const valueOf = (index, read) => read(lines[index]) || (lines[index + 1] && lines[index + 1].kinds.size === 0 ? read(lines[index + 1]) : "");
  const firstDate = (info) => datesIn(info.text)[0] || ""; // day first: 12.04.1995 is 12 April

  lines.forEach((info, index) => {
    const has = (kind) => info.kinds.has(kind);
    if (has("other") && !has("birth")) return;
    if (has("surname") && !details.surname) details.surname = valueOf(index, nameIn);
    else if ((has("givenNames") || (has("name") && !has("surname"))) && !has("birth") && !details.givenNames) {
      details.givenNames = valueOf(index, nameIn);
    }
    if (has("birth") && !has("other") && !details.dateOfBirth) details.dateOfBirth = valueOf(index, firstDate);
    if (has("expiry") && !has("issued") && !details.expiryDate) details.expiryDate = valueOf(index, firstDate);
    if (has("number") && !has("birth") && !has("expiry") && !details.documentNumber) {
      details.documentNumber = valueOf(index, numberIn);
    }
    if (has("nationality") && !details.nationality) {
      const code = info.words.find((word) => word.kinds.length === 0 && /^[A-Z]{3}$/.test(word.plain));
      details.nationality = code ? code.plain : countryIn(info.text);
    }
  });

  // No date label: the dates themselves tell. The birth date is the oldest date of an adult, the
  // expiry date the first one in the future (at most 30 years ahead).
  const thisYear = new Date().getFullYear();
  const todayText = new Date().toISOString().slice(0, 10);
  const allDates = [...new Set(lines.flatMap((info) => datesIn(info.text)))].sort();
  if (!details.dateOfBirth) {
    details.dateOfBirth = allDates.find((date) => Number(date.slice(0, 4)) >= thisYear - 120 && Number(date.slice(0, 4)) <= thisYear - 18) || "";
  }
  if (!details.expiryDate) {
    details.expiryDate = allDates.find((date) => date > todayText && Number(date.slice(0, 4)) <= thisYear + 30) || "";
  }

  // The country: printed on the card ("الجمهورية اللبنانية"), or the nationality for an ID card.
  details.issuingCountry = countryIn(text) || (documentType === "id_card" ? details.nationality : "");
  if (documentType === "id_card" && !details.nationality) details.nationality = details.issuingCountry;
  if (documentType === "driving_licence") details.nationality = "";
  return details;
}

// For each typed detail, the tokens that must ALL be on the photo for it to count as found.
// The keys are the values of the found_on_photo column. One-letter words of a name are skipped,
// because one letter is on almost any photo. A detail with no tokens can't be checked.
export function detailTokens(details) {
  const nameWords = (name) => wordsOf(name || "").filter((word) => word.length >= 2);
  const number = wordsOf(details.documentNumber || "").join("");
  return {
    surname: nameWords(details.surname),
    given_names: nameWords(details.givenNames),
    document_number: number ? [number] : [],
    date_of_birth: details.dateOfBirth ? ["D" + details.dateOfBirth] : [],
    expiry_date: details.expiryDate ? ["D" + details.expiryDate] : [],
  };
}
