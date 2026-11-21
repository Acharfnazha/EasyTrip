# EasyTrip Server

This is the backend of EasyTrip, the Web Programming I project. It uses Node.js and Express, and it
connects the website to the [MySQL database](../database/README.md).

- **Part 2** added accounts: register, log in, log out, and different access for customers and admins.
- **Part 3** reorganised the code into the 3-tier architecture with MVC, and moved login to
  sessions saved in MySQL, as in the course. The pages and the API work the same as before.
- **Part 4** added the Stays API: the hotels and chalets now come from the database, with search,
  filters, sorting and pages done by the server.
- **Part 5** lets admins add, edit and delete stays from the admin page, with image upload (multer).
- **Identity documents** (first step towards hosts): on "My account", a user adds a passport, an
  ID card or a driving licence from a photo (tesseract.js + mrz), checks or types the details, and
  saves them as not verified.
- **Contact messages:** the contact form saves its messages in MySQL; the admin page has an inbox to
  read, answer, close and delete them; customers read the answers on "My account".
- **Email codes and Google sign-in:** every login ends with a 6-digit code sent to the user's email
  (nodemailer, from a Gmail account), and "Continue with Google" is a second way to start a login.
- **Admin dashboard:** a side menu with seven sections: an overview with totals and charts, the
  stays, the messages, the bookings, the tickets, the customers and their credit, and a read-only
  viewer of every table in the database.
- **Credit and bookings (Part 6):** an admin adds credit (money) to an account; the customer books
  a hotel or a chalet and pays with it; without enough credit the stay can't be booked. The admin
  confirms or cancels bookings, and a cancelled booking gives the credit back.
- **Part 8:** identity verification (a selfie holding the saved document, reviewed by an admin;
  only verified users can book), the admin's tools for accounts (role, delete) and destinations,
  "Forgot your password?", and contact replies sent by email.
- **Tickets and emails (Part 7):** flight, bus and train tickets are bought with the same credit,
  at a sample fare. An email is sent when a booking or a ticket is saved, confirmed or cancelled,
  and when an account's credit changes.

## The 3-tier architecture

The brief asks for a multitier architecture. EasyTrip is split into three layers, as in the
course's separation of concerns and MVC lessons. Each layer only talks to the layer next to it.

```text
 Presentation layer          public/               HTML pages, CSS, browser JavaScript, images
        |  fetch('/api/...') sends JSON, gets JSON back
 Business logic layer        server/routes/        which URL goes to which controller
                             server/middleware/    checks before a controller (logged in? admin?)
                             server/controllers/   the rules: read the request, decide the answer
                             server/validators/    the form checks the controllers use
        |  calls a model function, never SQL
 Data access layer           server/models/        the only files that run SQL
        |  mysql2 pool, ? placeholders
 Database                    MySQL (database/schema.sql)
```

| MVC part | In EasyTrip |
| --- | --- |
| Model | `server/models/*.js`: one file per table (or group of tables), and the only code that runs SQL |
| View | The pages in `public/`. They ask the API for data with `fetch` and show it |
| Controller | `server/controllers/*.js`: they get the request, use the models, and answer in JSON |

## Files

| File | What it does |
| --- | --- |
| `server.js` | Starts the server: serves `public/`, reads JSON, sets up sessions, connects the routes, handles errors |
| `config.js` | Reads the settings from `.env` |
| `utils/database.js` | The connection pool to MySQL |
| `utils/path.js` | The project's folder, so other files don't guess paths |
| `routes/auth.js` | The account URLs: register, log in, the login code, Google sign-in, log out, "who is logged in" |
| `routes/admin.js` | The admin URLs, all protected by `isAuth` and `isAdmin` |
| `routes/stays.js` | The stays URLs: the list and one stay (anyone), add, edit and delete (admins) |
| `routes/bookings.js` | A user's own bookings and tickets (buy, list, cancel), the fares, and their credit; the admin's URLs for them are in `routes/admin.js` |
| `routes/inquiries.js` | The contact form (anyone) and "My messages" (logged in); the admin's inbox URLs are in `routes/admin.js` |
| `routes/destinations.js` | The destinations list |
| `routes/id-document.js` | The user's own identity document: scan, save, see, delete |
| `middleware/is-auth.js` | `isAuth` (logged in) and `isAdmin` (admin role) |
| `middleware/limit-attempts.js` | The limits on failed register and login attempts, on contact messages, and on document scans |
| `middleware/security-headers.js` | The security headers sent with every answer (Content-Security-Policy and three others) |
| `middleware/upload-image.js` | Reads a form with an image (multer), and checks the image's type, size and first bytes. A stay's photo is saved in public/; a document photo is checked in memory, then kept in private/documents/ |
| `controllers/auth.js` | Register, log in (password, then the emailed code), log out, "who is logged in" |
| `controllers/google.js` | "Continue with Google": sends the browser to Google and reads the answer |
| `controllers/admin.js` | The admin dashboard: the totals, the charts' figures, and the database viewer |
| `controllers/stays.js` | The stays list (search, filters, sorting, pages), one stay, and add, edit and delete |
| `controllers/destinations.js` | The destinations list, for the admin's stay form |
| `controllers/id-document.js` | Scanning a document photo, and saving, showing and deleting the details |
| `controllers/inquiries.js` | Sending a message, "My messages", and the admin's inbox: list, open, reply, close or reopen, delete |
| `controllers/bookings.js` | Booking a stay with credit, "My bookings", cancelling, the nights already taken, and the admin's list, confirm and cancel |
| `controllers/accounts.js` | The admin changes an account's role, or deletes it (never their own) |
| `controllers/verifications.js` | The admin's list of identity documents, one document, its selfie, approve or reject |
| `controllers/tickets.js` | The fares, buying a ticket with credit, "My tickets", cancelling, and the admin's list, confirm and cancel |
| `controllers/credit.js` | "My credit" with its history, and the admin's list of accounts, one account's history, adding and removing credit |
| `controllers/error.js` | "Not found" answers and the error handler |
| `validators/auth.js` | The register and login checks |
| `validators/stays.js` | The checks on the stays list's values, and on the admin's stay form |
| `validators/id-document.js` | The document types, and the checks on the document details a user saves |
| `validators/inquiries.js` | The contact form, the inbox filters, a reply and a status change |
| `validators/bookings.js` | The booking form's dates and travelers, the admin's list filters and status change |
| `validators/admin.js` | The verification decision and list, a role change, and the destination form |
| `validators/tickets.js` | The ticket's route, dates, travelers and class, and the admin's list filters |
| `validators/credit.js` | The amount, the action and the note of a credit change, and the accounts list's filters |
| `validators/common.js` | Helpers that every validator uses |
| `models/user.js` | Every query on the `users` table, with the admin's list of accounts and their credit |
| `models/booking.js` | Every query on the `bookings` table. Booking and cancelling are transactions that also change the credit |
| `models/ticket.js` | Every query on the `tickets` table. Buying and cancelling are transactions that also change the credit |
| `models/credit.js` | The credit history (`credit_transactions`): the steps the bookings and tickets use inside their transactions (pay, add a row, refund), and the transaction that adds or removes credit |
| `models/accommodation.js` | Every query on the `accommodations` table: SELECT (with its destination), INSERT, UPDATE, DELETE |
| `models/destination.js` | Every query on the `destinations` table |
| `models/id-document.js` | Every query on the `id_documents` table |
| `models/inquiry.js` | Every query on the `inquiries` and `inquiry_replies` tables, with the reply transaction |
| `utils/file.js` | The uploads folder, deleting an uploaded image, and reading a file's real type |
| `utils/document-reader.js` | Reads a document photo with OCR (tesseract.js): its machine-readable code (fields and check digits with mrz), and its printed text |
| `utils/printed-text.js` | Turns printed text and typed details into words, numbers and dates that can be compared |
| `utils/money.js` | Writes an amount for a message: "$560" or "$1,000.50" |
| `utils/selfie.js` | Saves, finds and deletes the verification selfies, in `private/selfies/` (never in `public/`) |
| `utils/document-photo.js` | Keeps the photo of the scanned document for the admin, in `private/documents/` (never in `public/`) |
| `utils/fares.js` | The sample fares of the tickets, and the price of a whole ticket |
| `utils/mailer.js` | Sends the emails from the Gmail account in `.env` (nodemailer): the login code, and the notices in the background |
| `utils/notices.js` | Writes the emails about bookings, tickets and credit; writing and sending are separate, so the tests read them without sending |
| `utils/login-code.js` | Makes a 6-digit code, its fingerprint for the session, and the masked email |
| `utils/google.js` | Google's login address, and swapping Google's one-time code for the user's profile |
| `models/stats.js` | The totals and the charts' figures for the admin dashboard |
| `models/database-browser.js` | The database viewer's queries: the tables, their columns and keys, one page of rows (read only) |

### How a request goes through the layers

Logging in, for example:

1. `public/js/auth.js` checks the form, then sends `POST /api/auth/login` with `fetch`.
2. `routes/auth.js` sends it through `limitAttempts`, then to `authController.login`.
3. `controllers/auth.js` checks the data with `validators/auth.js`, asks `models/user.js` for the
   user, and compares the password with bcrypt.
4. `models/user.js` runs `SELECT ... FROM users WHERE email = ?` and returns the row.
5. The controller makes a 6-digit code, emails it (`utils/mailer.js`), keeps its fingerprint in
   the session, and answers that a code is needed. The user is not logged in yet.
6. `public/js/login-code.js` shows the code form and sends `POST /api/auth/verify-code`.
7. The controller compares the code. If it is right, it saves the user's id in a new session and
   answers with the user as JSON, and the browser opens the account or admin page.

## How to run it

You need Node.js 20.11 or newer and MySQL.

1. **Create the database**, if you haven't yet. The command is in the
   [database README](../database/README.md#how-to-run-it).
2. **Install the packages:**

   ```bash
   npm install
   ```

3. **Create your settings.** Copy `.env.example` to a new file named `.env`. Set `DB_PASSWORD` to your
   MySQL password, and set `SESSION_SECRET` to a long random text. This command creates one:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   The Gmail and Google settings in `.env` are optional. Without them the site still works: the
   login code is printed in the server's terminal, and the Google button says it isn't set up. See
   [Email codes](#email-codes-the-second-step-of-every-login) and [Google sign-in](#google-sign-in).

4. **Start the server:**

   ```bash
   npm start
   ```

   While you work on the code, `npm run dev` restarts the server each time you save a file.

5. Open <http://localhost:3000>.

If something is wrong with the settings, the server stops and says what to fix.

## Try it

The test accounts are listed in the [database README](../database/README.md#test-accounts).

1. Choose **Log in** in the menu, then **Create an account**, and register. You go back to the login
   page, as in the app flow diagram.
2. Log in. The page asks for the 6-digit code: it is in your email, and (on your own computer) also
   in the server's terminal. A customer then goes to **My account**, and the menu now shows "My account".
3. Try to open `admin.html`. A customer is sent back to their account.
4. Stop the server and start it again, then reload the page: you are still logged in, because the
   session is saved in MySQL.
5. Log out, then try to open `account.html`. You are sent to the login page.
6. Log in with the admin test account. Its address (`@example.com`) can't get email, so take the
   code from the server's terminal. An admin goes to the **Admin dashboard**, with totals and charts
   from the database.
7. Open **Database** in the side menu and choose a table. The `password_hash` column says "hidden".
8. Open **Hotels & chalets**, press **Add a stay**, choose "Chalet", fill in the form with a photo, and save.
   The new chalet appears in the table, the "Hotels & chalets" total goes up, and it is on
   `stays.html` at once. Edit it, then delete it. Try to delete "The Parisian Palace": it is
   refused, because it has bookings.

## The API

All data is sent as JSON.

| Method and route | Who can use it | What it does | Main answers |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Anyone | Creates a customer account | `201` created, `400` invalid data, `409` email already used |
| `POST /api/auth/login` | Anyone | Step 1: checks the email and password, and emails the login code | `200` a code was sent (`needsCode`), `400` missing data, `401` wrong email or password, `502` the email could not be sent |
| `POST /api/auth/verify-code` | Anyone | Step 2: checks the code, and starts the session | `200` logged in, `400` not 6 digits, `401` wrong or expired code, or no login waiting |
| `POST /api/auth/resend-code` | Anyone | Sends a new code for the same login | `200` sent, `401` no login waiting, `429` too soon or too many codes |
| `GET /api/auth/pending-code` | Anyone | Says if this browser has a login waiting for its code | `200` |
| `GET /api/auth/google` | Anyone | Sends the browser to Google's "choose an account" page | `302` |
| `GET /api/auth/google/callback` | Google sends the browser here | Reads the Google account, emails the login code, and goes back to the login page | `302` |
| `POST /api/auth/logout` | Anyone | Ends the session | `200` |
| `GET /api/auth/me` | Anyone | Returns the logged-in user, or `null` for a visitor | `200` |
| `GET /api/admin/stats` | Admin only | Returns the totals for the dashboard | `200`, `401` not logged in, `403` not an admin |
| `GET /api/admin/overview` | Admin only | The figures for the dashboard's charts and "latest" lists | `200`, `401`, `403` |
| `GET /api/admin/database` | Admin only | The tables of the database, with their number of rows and columns | `200`, `401`, `403` |
| `GET /api/admin/database/:table` | Admin only | One table's columns and one page of its rows (`?page=`, `limit=`, `order=oldest` or `newest`) | `200`, `400` a wrong value, `401`, `403`, `404` no such table |
| `GET /api/stays` | Anyone | Lists hotels and chalets, with search, filters, sorting and pages | `200`, `400` a wrong filter value |
| `GET /api/stays/:id` | Anyone | Returns one stay with its destination | `200`, `400` the id isn't a whole number, `404` no such stay |
| `POST /api/stays` | Admin only | Adds a stay, with its image (multipart form) | `201` added, `400` invalid data or image, `401`, `403` |
| `PUT /api/stays/:id` | Admin only | Changes a stay. A new image is optional | `200` saved, `400`, `401`, `403`, `404` |
| `DELETE /api/stays/:id` | Admin only | Deletes a stay and its uploaded image | `200` deleted, `401`, `403`, `404`, `409` the stay has bookings |
| `GET /api/stays/:id/booked-dates` | Anyone | The nights of a stay that are already booked (dates only) | `200`, `400` |
| `POST /api/bookings` | Logged in | Books a stay and pays with the user's credit (JSON: `accId`, `startDate`, `endDate`, `travelers`) | `201` booked, `400` wrong dates, `401`, `404` no such stay, `409` `dates-taken` or `no-credit` |
| `GET /api/bookings/mine` | Logged in | The user's bookings | `200`, `401` |
| `POST /api/bookings/:id/cancel` | Logged in | Cancels the user's own booking before it starts, and gives the credit back | `200`, `401`, `404`, `409` started or already cancelled |
| `POST /api/auth/forgot-password` | Anyone | Emails a code to choose a new password (the same answer whether the email has an account or not) | `200`, `400`, `429`, `502` |
| `GET /api/auth/forgot-password` | Anyone | Says if this browser has a reset waiting for its code | `200` |
| `POST /api/auth/forgot-password/resend` | Anyone | A new reset code | `200`, `401`, `429` |
| `POST /api/auth/reset-password` | Anyone | The code and the new password (JSON: `code`, `password`); logs in, and logs out every other browser | `200`, `400`, `401` |
| `POST /api/id-document/selfie` | Logged in | The selfie holding the saved document (multipart: `selfie`), and the camera check's photos (`straight`, `left`, `right`, `closer`: all four or none); the document waits for an admin | `200`, `400`, `401`, `409` already verified, `429` |
| `GET /api/admin/verifications` | Admin only | The saved documents, the waiting ones first (`?status=&q=&page=&limit=`) | `200`, `400`, `401`, `403` |
| `GET /api/admin/verifications/:userId` | Admin only | One document, with the whole number | `200`, `400`, `401`, `403`, `404` |
| `GET /api/admin/verifications/:userId/document` | Admin only | The photo of the document the customer scanned (deleted once the identity is verified); never cached | `200`, `400`, `401`, `403`, `404` |
| `GET /api/admin/verifications/:userId/selfie` | Admin only | The selfie itself, or with `?frame=straight` (`left`, `right`, `closer`) one movement photo; never cached | `200`, `400`, `401`, `403`, `404` |
| `POST /api/admin/verifications/:userId` | Admin only | Approve or reject (JSON: `decision`, `note`, needed to reject); the selfie is then deleted | `200`, `400`, `401`, `403`, `404`, `409` |
| `PATCH /api/admin/users/:id` | Admin only | Changes the role (JSON: `role`) | `200`, `400`, `401`, `403`, `404`, `409` your own account |
| `DELETE /api/admin/users/:id` | Admin only | Deletes an account, with its bookings, tickets, credit and document | `200`, `401`, `403`, `404`, `409` your own account |
| `GET /api/admin/destinations` | Admin only | Every destination, with its number of stays | `200`, `401`, `403` |
| `POST /api/admin/destinations` | Admin only | Adds one (JSON: `name`, `country`, `season`) | `201`, `400`, `401`, `403`, `409` already listed |
| `PUT /api/admin/destinations/:id` | Admin only | Changes one | `200`, `400`, `401`, `403`, `404`, `409` |
| `DELETE /api/admin/destinations/:id` | Admin only | Deletes one | `200`, `401`, `403`, `404`, `409` it still has stays |
| `GET /api/admin/discounts` | Admin only | Every discount, with the stays (to leave some out) and the customers the form offers | `200`, `401`, `403` |
| `POST /api/admin/discounts` | Admin only | Adds one (JSON: `name`, `percent`, `appliesTo`, `customerEmail`, `startDate`, `endDate`, `active`, `excluded`) | `201`, `400`, `401`, `403` |
| `PUT /api/admin/discounts/:id` | Admin only | Changes one (same JSON) | `200`, `400`, `401`, `403`, `404` |
| `DELETE /api/admin/discounts/:id` | Admin only | Deletes one; paid bookings and tickets keep their price | `200`, `401`, `403`, `404` |
| `GET /api/tickets/fares` | Anyone | The sample fares, per transport and class | `200` |
| `POST /api/tickets` | Logged in | Buys a ticket with the user's credit (JSON: `type`, `origin`, `destination`, `tripType`, `departDate`, `returnDate`, `travelers`, `seatClass`) | `201` bought, `400` wrong fields, `401`, `409` `no-credit` |
| `GET /api/tickets/mine` | Logged in | The user's tickets | `200`, `401` |
| `POST /api/tickets/:id/cancel` | Logged in | Cancels the user's own ticket before the departure day, and gives the credit back | `200`, `401`, `404`, `409` |
| `GET /api/credit/mine` | Logged in | The user's credit and its latest changes | `200`, `401` |
| `GET /api/admin/bookings` | Admin only | Every booking, with status filter, search and pages | `200`, `400`, `401`, `403` |
| `PATCH /api/admin/bookings/:id` | Admin only | Confirms a pending booking, or cancels one and refunds its credit (JSON: `status`) | `200`, `400`, `401`, `403`, `404`, `409` |
| `GET /api/admin/tickets` | Admin only | Every ticket, with status and transport filters, search and pages | `200`, `400`, `401`, `403` |
| `PATCH /api/admin/tickets/:id` | Admin only | Confirms a pending ticket, or cancels one and refunds its credit (JSON: `status`) | `200`, `400`, `401`, `403`, `404`, `409` |
| `GET /api/admin/users` | Admin only | Every account with its credit, with search and pages | `200`, `400`, `401`, `403` |
| `GET /api/admin/users/:id/credit` | Admin only | One account's credit and its latest changes | `200`, `400`, `401`, `403`, `404` |
| `POST /api/admin/users/:id/credit` | Admin only | Adds or removes credit (JSON: `action` = `add` or `remove`, `amount`, `note`) | `201`, `400` wrong amount, `401`, `403`, `404`, `409` the credit would go below 0 or above the limit |
| `GET /api/destinations` | Anyone | Lists the destinations, for the admin's stay form | `200` |
| `POST /api/id-document/scan` | Logged in | Reads a document photo (multipart: `documentType` and the file `document`) and returns what it read, or asks the user to type the details | `200` read or to type, `400` type or photo problem, `401`, `422` the photo can't be used, `429` too many scans |
| `PUT /api/id-document` | Logged in | Saves the checked or typed details (JSON) after a scan | `200` saved, `400` invalid details or no scan, `401` |
| `GET /api/id-document` | Logged in | The user's saved document (only the end of its number), or `null` | `200`, `401` |
| `DELETE /api/id-document` | Logged in | Deletes the user's saved document | `200`, `401`, `404` none saved |
| `POST /api/inquiries` | Anyone | Saves a contact message (linked to the account when logged in) | `201`, `400` invalid fields, `429` too many messages |
| `GET /api/inquiries/mine` | Logged in | The user's messages with the replies | `200`, `401` |
| `GET /api/admin/inquiries` | Admin only | The inbox, with status filter, search and pages | `200`, `400` a wrong filter, `401`, `403` |
| `GET /api/admin/inquiries/:id` | Admin only | One message with its replies | `200`, `400`, `401`, `403`, `404` |
| `PATCH /api/admin/inquiries/:id` | Admin only | Marks a message read, or closes or reopens it | `200`, `400`, `401`, `403`, `404` |
| `POST /api/admin/inquiries/:id/replies` | Admin only | Saves a reply and marks the message answered | `201`, `400` empty or too long, `401`, `403`, `404` |
| `DELETE /api/admin/inquiries/:id` | Admin only | Deletes a message and its replies | `200`, `401`, `403`, `404` |

Register, login and the code check also answer `429` after 20 failed attempts in 15 minutes.

Register expects `firstName`, `lastName`, `email` and `password`. Login expects `email` and `password`.
When a field is wrong, the answer has an `error` message and a `fields` object with one message per
field, which the page shows under each field.

## Search, filters, sorting and pages

Lists are filtered, sorted and cut into pages by the server, with values in the URL's query string.
The stays list is the first one, and the later lists (bookings, tickets, messages) follow the same rules.

```text
GET /api/stays?type=chalet&q=Lebanon&setting=mountain&maxPrice=300&sort=price-asc&page=2&limit=9
```

| Value | Meaning | Allowed | When missing |
| --- | --- | --- | --- |
| `type` | Hotels or chalets | `hotel`, `chalet` | Both |
| `season` | The destination's season | `winter`, `spring`, `summer`, `autumn` | Every season |
| `start`, `end` | Only the stays free on every night from `start` to `end` (a booking that isn't cancelled and shares a night hides the stay) | Two dates, `start` from today, 1 to 30 nights | No date filter |
| `q` | Search in the stay's name, the destination and the country (capitals and accents don't matter) | Up to 100 characters | No search |
| `setting` | The chalet's setting | `mountain`, `coastal`, `countryside`, `forest`, `desert`, `tropical` | All settings |
| `minPrice`, `maxPrice` | The price per night, in US dollars | A number with up to 2 decimals; `minPrice` can't be more than `maxPrice` | No limit |
| `sort` | The order | `recommended` (the site's order), `price-asc`, `price-desc`, `name-asc` | `recommended` |
| `page` | Which page | A whole number from 1 | `1` |
| `limit` | How many stays per page | A whole number from 1 to 50 | `12` |

The answer has the stays of that page and the numbers needed to show "Showing 9 of 27" and a
"Show more" button:

```json
{
  "stays": [
    {
      "id": 28,
      "name": "Mountain Top Cabin",
      "type": "chalet",
      "category": "Cabin",
      "setting": "mountain",
      "price": 280,
      "description": "A cabin among snowy pine trees, a cosy base for skiing and winter walks.",
      "image": "assets/images/chalets/chalet-1.webp",
      "imageAlt": "Wooden chalet surrounded by snow-covered pine trees",
      "location": "Faraya, Lebanon",
      "destination": { "id": 9, "name": "Faraya", "country": "Lebanon", "season": "winter" }
    }
  ],
  "pagination": { "page": 1, "limit": 9, "total": 27, "totalPages": 3 }
}
```

The rules:

- A wrong value is never guessed or ignored: the answer is `400` with one message per wrong value
  in `fields`, for example `{ "page": "page must be a whole number of 1 or more." }`.
- A page after the last one is not an error: it has an empty `stays` list.
- The filters are combined with AND: `type=chalet&q=Lebanon` means chalets in Lebanon.
- Every value goes into the SQL with a `?` placeholder. `sort` can't (it names columns), so the server
  picks the `ORDER BY` from a fixed list in `models/accommodation.js`, and anything else is refused.
- Each sort ends with the id, so stays with the same price always come in the same order and no stay
  appears on two pages.

The hotels and chalets pages use this API: `public/js/listings.js` sends the form values, shows the
cards it gets back, and asks for the next page when the visitor presses "Show more".

## Managing stays (admin) and image uploads

The admin page (`public/admin.html` and `public/js/admin-stays.js`) has a table of the stays, with
search, a type filter and pages (from `GET /api/stays`), and a form to add or edit a stay. This is
the CRUD of the course: Create = `POST`, Read = `GET`, Update = `PUT`, Delete = `DELETE`. The page
uses `fetch`, so it can use `PUT` and `DELETE` (an HTML form alone can only send `GET` and `POST`).

The form has a file, so it is sent as `multipart/form-data`. The JSON body parser can't read that
format, so the routes use multer, as in the course's upload lesson:

```text
POST /api/stays
  isAuth, isAdmin        only a logged-in admin goes on (before any file is saved)
  uploadImage            multer saves the image in public/assets/images/uploads/ and fills
                         req.file (the image) and req.body (the text fields)
  createStay             checks the fields, saves the image's PATH in the database, answers 201
```

- **The path, not the file.** The `image` column keeps a path like
  `assets/images/uploads/1794061234567-3fa2b1c4d5e6.jpg`. The file stays on the disk, and
  `express.static` serves it like the other images.
- **Fields to send:** `name`, `type` (`hotel` or `chalet`), `destId` (from `GET /api/destinations`),
  `price`, `description`, `imageAlt` and the file `image`. Chalets also need `category` (like
  "Cabin") and `setting`; for hotels both are saved as `NULL`.
- **Editing** without a new image keeps the old one. With a new image, the old uploaded file is
  deleted after the stay is saved.
- **Deleting** a stay also deletes its uploaded image. A stay that has bookings can't be deleted:
  MySQL refuses it because of the foreign key (`ON DELETE RESTRICT`), and the server answers `409`.
- **No leftover files:** when a request fails after the image was saved (a wrong field, an unknown
  destination), the image is deleted again.
- The site's own images (`assets/images/hotels/`, `assets/images/chalets/`) are never deleted, even
  when a stay gets a new image or is deleted: only files in `uploads/` are.
- Uploaded images are not committed to Git (`uploads/` is in `.gitignore`), like any user content.

## Identity documents

On "My account", a logged-in user can add one identity document: a **passport**, an **ID card** or
a **driving licence**. They choose the type, send a photo, check (or type) the details, and save
them. This is the first step towards hosts (users who offer stays), who will need checked details
later. A new document replaces the old one.

It uses two open-source packages:

- **[tesseract.js](https://github.com/naptha/tesseract.js)** (Apache-2.0) does the OCR. Its English
  and Arabic models are installed with npm (`@tesseract.js-data/eng` and `@tesseract.js-data/ara`),
  so the server never downloads anything while it reads a photo. It uses two OCR workers: one reads
  codes (English only), the other printed text (Arabic + English).
- **[mrz](https://www.npmjs.com/package/mrz)** (MIT) reads the fields of a machine-readable code and
  checks its check digits (ICAO 9303).

### Two ways to get the details

| Document | Has a machine-readable code? | How the details are found |
| --- | --- | --- |
| Passport | Always: 2 lines of 44 at the bottom of the photo page (TD3) | **Read from the code**; the user checks them |
| ID card | Usually: 3 lines of 30 (TD1) or 2 of 36 (TD2), mostly on the back | **Read from the code**. A card without a code (or whose code can't be read) is **typed** |
| Driving licence | Almost never (only French and Swiss licences, and their codes miss the date of birth or the expiry date) | **Typed by the user** |

Both ways also read the **printed text** of the photo (the words a person reads on it):

- **Read from the code:** the code's names have no check digit, and the OCR often reads the `<`
  between names as K or L ("TESTERK<KSAMPLE"). The server keeps the reading of each name that is also
  printed on the document, so "TESTER" and "SAMPLE ROSE" come out right. If the printed text
  doesn't confirm them, the page asks the user to check the names.
- **Typed:** when the user saves, the server checks which typed details appear in the printed text:
  the surname, the given names, the number (also when printed with spaces, like "DL 4829 1736") and
  the two dates (written 12.04.1995, 04/12/1995, 1995/04/12, 12 APR 1995, 12 avril 1995 or
  12 نيسان 1995). The result is saved in `found_on_photo`, for example "4 of 5 details (not found:
  expiry date)".

### Arabic and English

Documents often print the details in Arabic, or in Arabic and English. The printed text is read in
both, and the user types the names as they are printed, in Arabic or English letters.

- **Words are compared in one form** (`plain()` in `utils/printed-text.js`): Arabic without vowel
  marks, hamza or madda ("أيار" = "ايار"), "ى" = "ي", a final "ة" or "ه" left out (the OCR often reads
  it as "ه", as "3", or misses it, so "وردة" = "ورد"), and no hidden right-to-left marks.
- **Digits:** Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) are turned into 0 to 9, in the text read and in what
  the user types (a number typed "٥٨٢١٩٠٤٧٣" is saved as 582190473).
- **Dates** can use the Arabic month names (كانون الثاني ... كانون الأول, and يناير ... ديسمبر).
- **Possible dates only:** a verified account is for renting and booking, so the holder must be
  18 or older (and at most 120); a document expires between today and 30 years from now. The page
  sets these limits on the date fields, so the calendar opens on possible years, and the server
  refuses anything else ("You must be at least 18 years old to verify your account").
- **No expiry date:** some ID cards and driving licences never expire. The user chooses "No expiry
  date" and `expiry_date` is saved as `NULL`. A passport always needs one.
- **Is it a document?** The OCR "reads" a few words in any photo. So a photo is accepted only with a
  date, or with at least 2 of the labels documents print ("Surname", "Date of birth", "الاسم",
  "تاريخ الولادة", ...). A document whose dates use Arabic-Indic digits passes thanks to its labels.

```text
POST /api/id-document/scan    (documentType + the photo in "document")
  isAuth                      only a logged-in user
  limitDocumentScans          10 scans every 15 minutes per account (OCR takes the processor)
  uploadDocumentImage         multer keeps the photo IN MEMORY (5 MB at most, JPG/PNG/WebP,
                              first bytes checked)
  scanDocument                utils/document-reader.js reads it, then utils/document-photo.js keeps
                              it in private/documents/ for the admin ("scan-<random>" until saved)
                              passport / ID card -> the code: name, number, countries, dates,
                                                    check digits, expired or not, names checked
                              driving licence    -> the printed text (kept as fingerprints only)

PUT /api/id-document          the details the user checked, corrected or typed (JSON)
  isAuth, saveDocument        the type comes from the scan, not the form; validators/id-document.js
                              checks every field, then models/id-document.js saves the row
```

### What the result means, and what it doesn't

| The scan says | It means | It does NOT mean |
| --- | --- | --- |
| Check digits match | The code lines were read without a mistake in the protected fields | That the document is genuine |
| Names match the printed names | The code and the printed text say the same names | That the names are the user's |
| Country codes recognised | The codes are real ICAO country codes | That the country issued this document |
| Not expired | The expiry date read is today or later | Anything about the document's holder |
| Found on the photo: 5 of 5 | The typed details are printed on the photo | That the photo shows a real document |

So the saved details are always labelled **"not verified"**. The page and the API never call them
verified: that needs a person (an admin review, a later part) and, for the face, a selfie check.

### How it handles bad photos

| Problem | Answer |
| --- | --- |
| No photo, wrong type, too big, not a real image, no document type | `400`, with the message under that field |
| A passport photo that is blurry, too small, or has glare | `422` `no-code`: "We couldn't read the code... Take a new photo of the whole page, flat, in good light and in focus." |
| A visa (or another travel document) | `422` `unsupported`: "Only passports, ID cards and driving licences are accepted." |
| An ID card sent as a passport (or a passport as an ID card) | `422` `wrong-type`, with `detectedType`: the page switches the type, so the user can press "Read" again |
| A passport or ID card sent as a driving licence | `422` `has-code`: "choose the right type" |
| A photo with no document text (too few words, or neither a date nor 2 document labels) | `422` `no-text`: every identity document prints dates and labels |
| A character misread in a field with a check digit | `200`, with "the check digits don't match (date of birth)" so the user checks that field |
| The first code line moved by one character ("P<KUTO" for "P<UTO") | Repaired when the issuing country is found one character later |
| An ID card whose code can't be read | `200`, to type: "a sharper photo of the side with the code lets the server read the details for you" |
| An expired document | It is read and flagged, but it can't be saved |

### Privacy

- The photo is checked in the server's memory, then kept in `private/documents/` (never in `public/`, and
  never committed: `private/` is in .gitignore). Only an admin sees it, through
  `GET /api/admin/verifications/:userId/document`, to compare it with the details and the selfie. It is
  deleted once the identity is verified, when another document is scanned, and when the user deletes
  their document. A scan that is never saved is deleted after an hour. It is never logged.
- Document details are never written to the server's log: errors in this part are logged as
  "ID document scan failed (error code)" only.
- The session (saved in MySQL) never holds the details or the photo's words. For a code, it keeps a
  fingerprint (an HMAC with `SESSION_SECRET`) of what was read, so the server can tell later if the
  user saved exactly that (`same_as_read`). For a typed document, it keeps a short fingerprint of
  each word, number and date on the photo, so the typed details can be compared without keeping the
  text.
- A user can only reach their own document: the URLs have no id. Answers only show the last
  3 characters of the document number. The user can delete the details at any time.
- The tests use synthetic documents only (`test/fixtures/id-documents/`). Don't test with a real
  person's document.

### Testing it

`npm test` runs every file in `test/`. `test/liveness.test.js` checks the camera check's rules.
`test/admin.test.js` checks the admin tools, the
verification decision, the password rules and their emails. `test/credit.test.js` checks the fares, the checks on
bookings, tickets and credit changes, and the words of the emails (none is sent).
`test/id-document.test.js` runs on the synthetic documents (no server or database needed): the reader on each image, the printed-text helpers, and the checks on
the saved details. They show each step works. They don't measure how well real phone photos are
read: those are read less well than clean test images.

## Contact messages

The contact form (`contact.html`) saves its messages in MySQL, and the admin answers them from the
admin page. This uses the `inquiries` table and the `inquiry_replies` table (one message, many
replies). Anyone can send a message; a message sent while logged in is linked to the account, so the
reply appears on "My account", under "My messages".

```text
POST /api/inquiries                     the contact form (JSON: name, email, phone, topic, message)
  limitMessages                         5 messages every 15 minutes per visitor (a form with
                                        mistakes doesn't count)
  loadUser                              sets req.user if someone is logged in (not required)
  sendInquiry                           validators/inquiries.js checks every field (the same rules as
                                        public/js/contact.js), models/inquiry.js saves it as "new"

GET  /api/inquiries/mine                isAuth: the user's own messages and the replies

GET    /api/admin/inquiries             isAuth, isAdmin: the inbox (?status=&q=&page=&limit=)
GET    /api/admin/inquiries/:id         one message with its replies
PATCH  /api/admin/inquiries/:id         {"status": "read"} or {"status": "closed"}
POST   /api/admin/inquiries/:id/replies {"message": "..."}: the reply, in a transaction
DELETE /api/admin/inquiries/:id         the message and its replies
```

- **Statuses:** `new` (nobody opened it) -> `read` (the admin page marks it when the admin opens it)
  -> `answered` (set by a reply) -> `closed` (the admin chooses it). Reopening a closed message makes
  it `answered` again if it has a reply, or `read`. The admin can't choose `new` or `answered`.
- **A transaction:** saving a reply and setting `answered` are two SQL statements. `addReply` in
  `models/inquiry.js` runs them on one connection between `beginTransaction` and `commit`, and
  calls `rollback` after an error, so a message is never "answered" without its reply.
- **Who sees what:** the customer sees "EasyTrip team" as the author of a reply; the admin page shows
  the admin's first name. A customer only reads their own messages (the URL has no id).
- **Visitors** without an account can send messages, and the admin can answer them, but they can't
  see the answer on the site. Email replies will come with the email part (Google sign-in and codes).
- **Messages are only text:** the pages show them with `textContent`, so HTML or a script typed into
  a message is shown as it was typed and never runs.

## Identity verification

Only a customer whose identity an admin verified can book a stay or buy a ticket. The server
refuses it otherwise (`403`, code `not-verified`), and the pages say so before the form is sent.

```text
My account > Identity document     scan the document, check the details, save them   -> status unverified
My account > Identity verification the camera check, then a selfie holding the document -> status pending
  public/js/verification.js        the camera starts; face-api (open source) finds the face and its 68
                                   points in each frame, in the browser; the page asks to look straight,
                                   turn left, turn right and move closer, and keeps one photo of each
  POST /api/id-document/selfie     the selfie and the 4 movement photos; multer keeps them in memory,
                                   their first bytes are checked, then utils/selfie.js saves them in
                                   private/selfies/ under one random name
Admin page > Verifications         the admin sees the selfie next to the saved details, and compares the
                                   face, the document in the photo, and the name, number and dates
  approve                          -> status verified: the customer can book and buy
  reject (with a note)             -> status rejected: the customer is told why and can try again
                                   either way the selfie's file is deleted at once
```

- **The camera check (liveness).** A printed photo or a picture on a screen can't turn its head, so
  the four movement photos show the admin that a real person was in front of the camera. The rules
  are in `public/js/liveness-pose.mjs`: the head's turn is where the nose tip is between the two
  sides of the jaw (left or right by more than 13% of the face's width), "closer" is a face 30%
  wider than when looking straight, and each movement must be seen in 3 frames in a row.
  `test/liveness.test.js` checks these rules, including that a photo that never moves can't pass.
- **The library is on this server.** `public/vendor/face-api/` has face-api (`@vladmandic/face-api`,
  MIT licence, in `LICENSE.txt`) and two small models: the face finder (190 KB) and the 68 face
  points (350 KB). Nothing is downloaded from other websites, and the camera's picture never leaves
  the browser until the user presses "Send". It uses the graphics card (WebGL), or the processor
  when there is none. To update it: `npm install`, then copy `dist/face-api.esm.js` and the
  `tiny_face_detector_model*` and `face_landmark_68_model*` files from `node_modules/@vladmandic/face-api/`.
- **The document's photo with the camera.** On a phone or a tablet (a touch screen),
  `public/js/document-camera.js` adds "Take the photo with the camera" to the document step: the back
  camera shows a see-through outline of the chosen document (a passport's photo page with its two code
  lines, or an ID card or driving licence), the user lines their document up with it, and the photo is
  cropped to the outline and read like an uploaded one. On a computer the photo is uploaded.
- **Without a camera** the user can upload one photo instead. The admin then sees "Camera check:
  not done", because such a photo could be of another photo.
- **The browser can be fooled; the admin can't be skipped.** The browser decides when a movement is
  done, and someone could send any five photos. So the server only records which photos came, and
  the admin looks at them; the server accepts four movement photos or none, never some.
- **The decision is a person's.** The server doesn't compare faces: a free face-matching model good
  enough to trust isn't available, and a wrong "match" would be worse than none. What the server
  already checks (the machine code's check digits, or which typed details are printed on the photo)
  is shown to the admin next to the selfie.
- **The selfie is private.** It is in `private/selfies/`, which `express.static` never serves and
  Git never commits. Only an admin can see it, through an API route answered with `no-store`, and it
  is deleted as soon as the admin decides, when new details are saved, or when the account is
  deleted.
- **New details start again.** Saving another document makes the status `unverified` again.
- **An expired document can't be approved**, and a verified one stops counting on its expiry date.
- **Emails:** the team gets one when a selfie arrives, and the customer gets one with the decision.
- **To turn it off** (for example while testing), set `REQUIRE_VERIFIED_ID=false` in `.env`.

## Credit and bookings

A customer can't pay with a card on this site. Instead an **admin gives an account credit** (an
amount in US dollars), and the customer **books stays with that credit**. When the credit is used
up, the account can't book again until the admin adds more.

```text
Admin page > Customers > Change credit       POST /api/admin/users/:id/credit  { action, amount, note }
  models/credit.js, one transaction:         users.credit goes up (or down, never below 0)
                                             + one row in credit_transactions (type top_up or deduction)

Hotels or chalets page > View details        GET /api/auth/me (the credit), GET /api/stays/:id/booked-dates
  public/js/booking.js                       check-in, check-out, travelers; shows nights x price,
                                             "Your credit" and "Credit left after booking"
  Book with my credit                        POST /api/bookings  { accId, startDate, endDate, travelers }
  models/booking.js, one transaction:        1. lock the stay's row (FOR UPDATE) and work out the total
                                             2. refuse if another booking has some of these nights
                                             3. take the total from the credit, only if there is enough
                                             4. save the booking (status "pending")
                                             5. one row in credit_transactions (type booking, a minus amount)

Admin page > Bookings                        PATCH /api/admin/bookings/:id  { status }
  confirmed                                  only a pending booking
  cancelled                                  the booking's price goes back to the credit, with a row of
                                             type refund (also when the customer cancels on "My account")
```

- **The price is never read from the browser.** The request only has the stay's id and the dates.
  The server takes the price from the database and multiplies it by the nights, in SQL.
- **Money is DECIMAL, not a JavaScript number.** MySQL does every sum (`credit - CAST(? AS
  DECIMAL(10,2))`), because in JavaScript 0.1 + 0.2 is not exactly 0.3. The API turns an amount
  into a number only to send it.
- **The balance and its history always match.** `users.credit` is the balance, and every change is
  also a row in `credit_transactions` with the balance after it. Both are saved in one transaction.
- **Not enough credit:** the `UPDATE` that pays has `WHERE credit >= total`. If it changes no row,
  the transaction is rolled back and the answer is `409` with the code `no-credit` and how much is
  missing. The page also shows this before the form is sent, and offers "Ask for credit".
- **No double booking:** two stays overlap when each starts before the other ends
  (`start_date < newEnd AND end_date > newStart`). The check-out day is free for the next guest.
  The row lock makes two bookings of one stay wait for each other, so both can't find the same
  nights free. Cancelled bookings don't block dates.
- **The rules on dates:** check-in from today to one year ahead, 1 to 30 nights, 1 to 9 travelers.
- **Cancelling:** a customer can cancel their own booking until the day before it starts; the admin
  can cancel any booking. The refund is exactly what the booking's payment row says, and it is
  given once (the booking's row is locked, then seen as cancelled). The sample bookings in
  `seed.sql` were not paid with credit, so cancelling one refunds nothing.
- **Limits on credit:** one change is $10,000 at most, an account holds $100,000 at most, and the
  credit can't go below zero (also a `CHECK` rule in the database).

### Tickets

The flight planner and the bus & train planner check the form and show a summary, as before. The
summary now has the ticket's price and a **Buy with my credit** button (`public/js/ticket-buy.js`).

EasyTrip has no real schedules or fares, so every ticket has a **sample fare**: one price per
transport and class, for one traveler going one way (`utils/fares.js`).

| Transport | Fares (US dollars) |
| --- | --- |
| Flight | Economy 220, Premium Economy 340, Business 690, First 1150 |
| Bus | Standard 12, Premium 20 |
| Train | Standard 35, First 60, Sleeper 85 |

The price of a ticket is the fare × the travelers × 2 for a round trip. The pages read the fares
from `GET /api/tickets/fares`, so they show what the server will charge, and the server works the
price out again itself: it never reads one from the request.

```text
POST /api/tickets             { type, origin, destination, tripType, departDate, returnDate, travelers, seatClass }
  validators/tickets.js       the two places are different, the dates are possible, the class
                              is one this transport has (a bus has no "business")
  controllers/tickets.js      total = ticketPrice(...)
  models/ticket.js, one transaction:
                              1. take the total from the credit, only if there is enough
                              2. save the ticket (status "pending") with its total_price
                              3. one row in credit_transactions (type ticket, a minus amount)
```

A ticket then works like a booking: the admin confirms or cancels it under **Tickets**, the customer
can cancel it until the day before the departure, and a cancel gives the price back. The paying
and refunding steps are the same code for both (`pay`, `addRow` and `refund` in
`models/credit.js`). A ticket has no "dates already taken" check: there are no seats to count.
The sample tickets in `seed.sql` have no price, so cancelling one refunds nothing.

### Emails about bookings, tickets and credit

After a change is saved, the server emails the customer (`utils/notices.js`):

| When | Who gets an email |
| --- | --- |
| A booking or a ticket is saved | The customer, and the team (the site's own Gmail address), who must confirm it |
| The admin confirms it | The customer |
| It is cancelled, by the customer or by the admin | The customer, with what came back to their credit |
| The admin adds or removes credit | The customer, with the new credit and the admin's note |

- **In the background:** the answer to the browser doesn't wait for Gmail. If an email can't be
  sent, the booking is still saved, and the problem is one line in the server's log.
- **After the save, never before:** an email is only written once the transaction is committed.
- **No email to a test address:** the test accounts use `@example.com`, which can't get email.
  Sending to them would only fill the sender's inbox with "address not found" answers, so
  `utils/mailer.js` skips those addresses (and the login code for them is only in the terminal).
- **Nothing is sent while Gmail isn't set up** (see
  [Setting up the Gmail account](#setting-up-the-gmail-account)).
- **The links in the emails** use `SITE_URL` from `.env`, or `http://localhost:3000` without it.
- Names and notes come from forms, so they are escaped in the HTML version of the email.

## Forgot password

`forgot-password.html` (linked under the password field of the login page) works like the login
code: the user types their email, gets a 6-digit code by email, and types it with a new password.

- **The same answer for every email.** "If an account uses this email, we sent it a code" is shown
  whether the email has an account or not, so the form can't be used to find out who has one.
  Without an account the session still waits for a code, but none can match.
- **The same limits as the login code:** 10 minutes per code, 5 wrong tries, a new code after 60
  seconds, 5 codes at most, and 20 failed attempts per visitor every 15 minutes.
- **After the reset** the user is logged in (the code proved they own the email), and every other
  browser logged in to the account is logged out: `User.endSessions` deletes its other rows in the
  `sessions` table.
- **An account made with Google** can use it to get a password too.

## Email codes: the second step of every login

A password can be guessed or stolen. So after the password (or the Google account) is accepted, the
server emails a 6-digit code, and the user is only logged in after typing it. This also shows that
the email address really belongs to the user.

```text
POST /api/auth/login          email + password are right
  startCodeStep               a new session ID, a random 6-digit code (crypto.randomInt)
  utils/mailer.js             nodemailer sends it from the Gmail account in .env
  the session keeps           pendingLogin: the user's id, the code's FINGERPRINT (an HMAC with
                              SESSION_SECRET), when it expires, how many wrong tries
  answer                      { needsCode: true, email: "la*********@example.com" }

POST /api/auth/verify-code    { "code": "123456" }
  right                       a new session with userId: the user is logged in
  wrong                       one try less; after 5 wrong codes the login starts again
```

- **The rules:** a code works for 10 minutes and for one login. "Send a new code" works after 60
  seconds, at most 5 codes per login, and a new code cancels the old one.
- **Not logged in between the two steps:** the session has `pendingLogin` but no `userId`, so
  `isAuth` still answers `401` on every private route.
- **The code is never stored:** the session (a row in MySQL) only has its fingerprint.

### Setting up the Gmail account

The emails are sent from your own Gmail account, with an **app password** (a 16-letter password
that Google makes for one program; it is not your normal password, and you can delete it any time).

1. Turn on 2-Step Verification for the Google account: <https://myaccount.google.com/security>.
2. Open <https://myaccount.google.com/apppasswords>, type a name like "EasyTrip" and press Create.
3. In `.env`, set `GMAIL_USER` to the Gmail address and `GMAIL_APP_PASSWORD` to the 16 letters.
4. Restart the server.

**While they are empty**, no email is sent: the code is printed in the server's terminal
(`Login code for lara.haddad@example.com: 123456`) and the login page says so. On your own computer
(`NODE_ENV` isn't `production`) the code is printed there even when email works, because the test
accounts use `@example.com` addresses, which can't get email. On a real server nothing is printed.

## Google sign-in

"Continue with Google" on the login and register pages is the OAuth 2.0 authorization code flow.
The user types their Google password on Google's page, never on ours.

```text
GET /api/auth/google            the server makes a random "state", keeps it in the session, and
                                sends the browser to accounts.google.com
(the user chooses an account)
GET /api/auth/google/callback   Google sends the browser back with ?code=...&state=...
  the state must match          so the answer belongs to the login this browser started
  utils/google.js               swaps the code for the profile (email, name), server to server,
                                with GOOGLE_CLIENT_SECRET
  the email must be verified    by Google
  models/user.js                the account with this email, or a new customer account without a
                                password (password_hash is NULL)
  startCodeStep                 the same emailed code as a password login, then /login.html?step=code
```

- **One account per email:** signing in with Google using the email of an account made with a
  password opens that same account.
- **An account made with Google has no password**, so it can only log in through Google.

### Setting up the Google client

1. Open <https://console.cloud.google.com/apis/credentials> (create a project if it asks).
2. The first time, fill in the "OAuth consent screen": the app name, your email, and add your own
   Gmail address as a test user.
3. Create credentials > **OAuth client ID** > type **Web application**. Under "Authorized redirect
   URIs" add exactly `http://localhost:3000/api/auth/google/callback`.
4. Copy the client ID and the client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in
   `.env`, and restart the server.

If the site runs on another address or port, set `GOOGLE_REDIRECT_URI` in `.env` to that address
followed by `/api/auth/google/callback`, and add the same address in the console.

## The admin dashboard and the database viewer

`admin.html` has its own layout: a side menu instead of the site's header and footer, and nine
sections. `js/admin-nav.js` shows one section at a time, named in the address (`admin.html#messages`).

| Section | What it shows | Script and API |
| --- | --- | --- |
| Overview | The totals, two bar charts (stays by country, messages by status), the newest accounts and the latest messages | `js/account.js` (`GET /api/admin/stats`) and `js/admin-overview.js` (`GET /api/admin/overview`) |
| Hotels & chalets | The stays table, with add, edit and delete | `js/admin-stays.js` |
| Messages | The inbox | `js/admin-messages.js` |
| Bookings | Every booking, with confirm and cancel (a cancel refunds the credit) | `js/admin-bookings.js` (`/api/admin/bookings`) |
| Tickets | Every ticket, with confirm and cancel (a cancel refunds the credit) | `js/admin-tickets.js` (`/api/admin/tickets`) |
| Verifications | The identity documents, the waiting ones first; open one to see the selfie and approve or reject | `js/admin-verifications.js` (`/api/admin/verifications`) |
| Destinations | Every destination with its number of stays; add, edit, and delete one that has no stays | `js/admin-destinations.js` (`/api/admin/destinations`) |
| Discounts | A percentage off for every customer or one customer, on everything, the stays, hotels, chalets or tickets, with stays left out and optional dates. `GET /api/stays` and `GET /api/tickets/fares` add the discount the visitor or customer gets; the booking and the ticket are charged with it | `js/admin-discounts.js` (`/api/admin/discounts`) |
| Customers | Every account with its identity check and its credit; change the role or delete the account (not your own); "Change credit" adds or removes an amount and shows the account's credit history | `js/admin-users.js` (`/api/admin/users`) |
| Database | Every table of the database: its columns (type, primary key, foreign keys) and its rows, 25 per page | `js/admin-database.js` (`GET /api/admin/database` and `/:table`) |

The database viewer **only reads**. `models/database-browser.js` asks MySQL's own
`information_schema` for the tables, the columns and the foreign keys, so a table added later
appears by itself.

- **The table name is checked, not trusted.** A table name can't be a `?` value in SQL. The
  controller only accepts a name that is in the list of the database's own tables, and the model
  writes it with `??`, which the driver turns into a quoted name. Anything else answers `404`.
- **Some values are never sent, even to an admin:** `users.password_hash`, `sessions.session_id`
  and `sessions.data` are replaced by "hidden" (a session ID is enough to act as that user), and
  `id_documents.document_number` only shows its last 3 characters, like the account page.
- A foreign key column has a link to the table it points to (`→ users.user_id`).
- The charts are plain HTML and CSS (a bar is a `<span>` with a width), so the page needs no chart
  library and the Content-Security-Policy stays strict.

## How login works

This follows the authentication flow in [docs/app-flow](../docs/app-flow/README.md). It uses
`express-session` with the sessions saved in MySQL (`express-mysql-session`), as in the course's
cookies and sessions lesson.

1. The browser checks the form first. The server checks everything again, because the browser
   checks can be skipped.
2. **Register:** the password is hashed with bcrypt, and the user is saved in the `users` table with the
   role `customer`. The user then goes to the login page.
3. **Login:** the server finds the user by email and compares the password with the hash. If they don't
   match, the answer is "Wrong email or password." for both a wrong email and a wrong password.
4. If they match, the server emails a 6-digit code and waits for it (see
   [Email codes](#email-codes-the-second-step-of-every-login)). When the code is right, the server
   starts a new session and saves only the user's id in it. The session is a
   row in the `sessions` table. The browser gets a cookie named `connect.sid` that holds only the
   session ID, signed with `SESSION_SECRET`. The session lasts 2 hours.
5. **On each private request**, `isAuth` reads the user's id from the session and reads the user from
   the database. If the account was deleted, the session ends. If the role changed, the new role
   counts at once.
6. **The role** decides the page: admins go to `admin.html` and customers to `account.html`. The admin
   data is protected on the server by `isAdmin`, so hiding the page isn't what keeps it safe.
7. **Logout** deletes the session row in MySQL and the cookie, so the old session ID stops working
   everywhere.

## Security

| Risk | How it is handled |
| --- | --- |
| Stolen passwords | Only a bcrypt hash is stored (12 rounds), and it is never sent to the browser |
| SQL injection | Every query uses `?` placeholders, so user input is never part of the SQL text, and the driver refuses several statements in one query. The stays sort comes from a fixed list, and `%` and `_` in a search are treated as normal text |
| Asking for too much data | A list page has at most 50 stays |
| Uploads from non-admins | `isAuth` and `isAdmin` run before multer, so nobody else can even send a file |
| A dangerous file sent as an image | Only JPG, PNG and WebP are accepted (no SVG, which can hold a script). The type the browser sends must match the file's first bytes, so a script renamed to `.jpg` is refused |
| A file name like `../../server.js` | The server makes every file name itself (time + random text + extension) and never uses the visitor's name |
| Very big files | 2 MB at most, and one file per request |
| Losing customers' bookings | A stay with bookings can't be deleted (foreign key with `RESTRICT`) |
| Leaking document photos | Kept in private/documents/ (not served by express.static, not committed); only an admin can see them; deleted once the identity is verified; never logged |
| Leaking document details | Not in the log; the session only holds fingerprints (HMAC), never the details or the photo's words; only the owner can read them, with the number masked |
| Overloading the server with scans | 10 scans every 15 minutes per account, 5 MB per photo, one photo and one text field per request |
| A scan presented as proof of identity | Every answer says it is not proof, and saved details are "not verified" |
| Saving details that don't match the scan | The document type comes from the scan in the session, not from the form; a code that was corrected is saved with `same_as_read = 0`, and typed details record what was found on the photo |
| Wrong or strange input | Every field is checked on the server too, and anything that isn't text counts as empty |
| Someone making themselves an admin | The role isn't read from the request, so new accounts are always customers |
| A fake or changed session ID | The cookie is signed with `SESSION_SECRET`, and the session must exist in MySQL |
| Session fixation (a session ID planted before login) | Login always creates a new session ID |
| Using a session after logout | Logout deletes the session in MySQL, not only the cookie |
| Scripts reading the cookie | The cookie is `HttpOnly`, so JavaScript in the page can't read it |
| Requests from other websites | The cookie is `SameSite=Lax`, so other sites can't send POST requests with it |
| Password guessing | 20 failed attempts per visitor every 15 minutes |
| A stolen or guessed password | It isn't enough: the login also needs the code sent to the user's email |
| Guessing the login code | 5 tries per login, 10 minutes per code, and a random code from `crypto.randomInt` |
| Reading the code from the database | The session only keeps the code's fingerprint (HMAC), compared in constant time |
| Flooding someone's inbox with codes | A new code needs a 60-second wait, and a login gets 5 codes at most |
| A fake answer from "Google" | The `state` must match the one in the session, the code is swapped server to server with the client secret, and the email must be verified by Google |
| Booking without a checked identity | The server refuses a booking or a ticket until an admin verified the user's identity |
| A printed photo used as a selfie | The camera check asks for four head movements, and the admin sees a photo of each |
| Seeing someone's selfie | Selfies are outside `public/`, only an admin's request gets one, never cached, and deleted after the decision |
| A selfie that is really a script | The photo's first bytes must be JPG, PNG or WebP, and the server makes its file name |
| An admin locking everyone out | An admin can't change their own role or delete their own account, so one admin always remains |
| Finding accounts with "Forgot password?" | The answer is the same whether the email has an account or not |
| A password changed by someone else | The reset needs the code sent to the email, and logs out every other browser |
| Booking or buying with a made-up price | The price never comes from the browser: the server reads a stay's price from the database and works a ticket's price out from its own fares |
| Emails sent to made-up addresses | No email goes to the reserved test domains, and an email is only written after the change is saved |
| HTML typed into a name or a note reaching an email | Text from forms is escaped in the email's HTML version |
| Spending the same credit twice | The payment is one `UPDATE ... WHERE credit >= total` inside a transaction, so two bookings at the same moment can't both pass |
| Two bookings for the same nights | The stay's row is locked while the dates are checked and the booking is saved |
| A refund given twice | The booking's row is locked, and an already cancelled booking is refused |
| A customer giving themselves credit | Only the admin routes change credit (`isAuth` and `isAdmin`); the amount must be digits with at most 2 decimals |
| Cancelling someone else's booking | A booking that isn't the user's answers `404`, like one that doesn't exist |
| The database viewer used to run SQL | It has no SQL box: it only reads, and the table name must be one of the database's own tables |
| The database viewer leaking secrets | Password hashes, session IDs and session data are never sent, and document numbers are masked |
| Filling the inbox with spam | 5 messages every 15 minutes per visitor; the admin can delete messages |
| Scripts inside a message | Messages and replies are shown with `textContent`, never as HTML |
| A message "answered" with no reply | The reply and the status change are one transaction |
| Scripts inside a name | The pages show names with `textContent`, so they appear as plain text |
| A script that still reaches a page | The `Content-Security-Policy` header only lets the browser run scripts from the site's own files, and only lets `fetch` talk to this server |
| The site shown inside another website (clickjacking) | `frame-ancestors 'none'` and `X-Frame-Options: DENY` forbid showing it in a frame |
| A file read as another type | `X-Content-Type-Options: nosniff` makes the browser trust the type the server sends |
| Downloading private files | Only the `public/` folder is served, not `server/`, `database/` or `.env` |
| Showing technical errors | Details stay in the server's log, and the visitor sees a general message |

## Limits so far

- **Anyone can register with an email they don't own**, but they can't log in with it, because the
  login code goes to that address.
- **The login code needs email.** If Gmail refuses the email (a wrong app password, or the daily
  sending limit of the account), nobody can log in until it works again. On your own computer the
  code is also in the server's terminal.
- **The Google client is in "testing" mode** until Google reviews it: only the test users added
  in the Google Cloud Console can use "Continue with Google".
- **There is no HTTPS on a local computer.** On a real server, set `NODE_ENV=production` so the cookie is
  only sent over HTTPS, and use a MySQL user with fewer rights than `root`.
- **The attempt limit is kept in memory**, so it starts again when the server restarts.
- **The database viewer** shows every table but can't change anything, and has no search.
- **The identity check is done by a person.** The server reads the document, but nothing compares
  the face in the selfie with the document's photo automatically.
- **Credit is not real money.** The admin types the amount: there is no card payment behind it.
  A booking or a ticket can't be changed, only cancelled.
- **Tickets are sample tickets.** There are no schedules, seats or operators, so every route of
  the same transport and class has the same fare, and any two places can be typed.
- **Emails are not retried.** If Gmail refuses one (for example its daily sending limit), it is
  lost; the page still shows the booking, the ticket or the credit. The database viewer
  shows every table but can't change anything, and has no search.
- **Uploaded images live only on the computer that runs the server.** Running `database/seed.sql`
  again removes the stays that use them, but the files stay in `public/assets/images/uploads/`.
- **Document reading has limits.** The Arabic OCR model reads Arabic letters and Western digits well
  on clear photos, but **not Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩)**: dates and numbers printed with them
  are usually "not found on the photo", and an admin checks them. The larger "best" Arabic models
  can't run in tesseract.js (its WebAssembly build has no float support), and the int model used is
  that same model, converted. Names are only confirmed when the printed text is on the same photo (the
  back of an ID card often has no names). Driving licences' codes (French, Swiss) are not read. An OCR
  model trained on the OCR-B font would read codes better; the ones found so far don't have a clear
  licence, so they aren't used. Document details are stored as normal text in MySQL; a real service
  would also encrypt them.
- **Nothing checks that a document is genuine or belongs to the user** (no admin review and no
  selfie comparison yet).
- **Replies are emailed** to the address in the message (not to test addresses), and a customer
  also reads them on "My account". The message limit is kept in memory like the login limit.

## Next part

Every planned part is done. Possible next steps: real payments, real schedules and fares, and
putting the site on a real server with HTTPS.
