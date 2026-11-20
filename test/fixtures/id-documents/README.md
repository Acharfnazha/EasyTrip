# Synthetic identity documents for the tests

Every image in this folder is **computer-made test data**. None of them shows a real person or a
real document, and none of them copies any country's design. Each one says "SYNTHETIC TEST DATA"
and has a big SPECIMEN mark.

The person is the fictional "Sample Rose Tester" (in Arabic "وردة تجربة", Rose Test), born
12 April 1995, with the code `XXA` (ICAO's code for a stateless person, which belongs to no
country's design). Her documents expire on 30 August 2031.

| File | What it is | Expected result |
| --- | --- | --- |
| `passport-valid.png`, `.jpg`, `.webp` | A passport page with its code (2 lines of 44) | Read, check digits correct, names match the printed names |
| `passport-bad-check-digit.png` | The same, with a wrong date-of-birth check digit | Read, the check digit is reported |
| `passport-expired.png` | The same, expired in January 2024 | Read, flagged as expired |
| `passport-icao-specimen-expired.png` | The ICAO 9303 specimen (Anna Maria Eriksson, Utopia), whose code lines ICAO publishes | Read; "UTO" is not a real country, expired in 2012 |
| `passport-blurry.png` | The valid passport, blurred | The code can't be read |
| `id-card-td1.png` | The back of an ID card with a 3-line code (TD1) | Read as an ID card |
| `id-card-td2.png` | The back of an ID card with a 2-line code of 36 (TD2) | Read as an ID card |
| `visa.png` | A visa code (it starts with V) | Refused: not a passport or an ID card |
| `id-card-front-no-code.png` | The front of an ID card, with no code | The user types the details; the printed text is read |
| `driving-licence.png`, `.jpg` | A driving licence, with no code (number printed "DL 4829 1736") | The user types the details; the printed text is read |
| `no-text.png` | A picture with no text | Refused: no text |
| `words-no-date.png` | A hotel sign: words, but no date and no document labels | Refused: identity documents print dates and labels |
| `id-card-arabic.png` | An ID card front in Arabic only ("وردة تجربة"), dates and number in Arabic-Indic digits, no expiry date | The user types the details; the Arabic names are found, the Arabic-Indic digits usually are not |
| `driving-licence-arabic-english.png` | A driving licence in Arabic and English | The user types the details; all of them are found |

The code lines follow ICAO 9303, with real check digits. They are printed in the OCR-B font, as on
real documents (the free OCR-B by Matthew Skala, used only to make these images; the font itself is
not in this repository).

These images show that the scanning works step by step. They don't show how well real phone
photos are read: real photos have angles, shadows and glare, and are read less well.
