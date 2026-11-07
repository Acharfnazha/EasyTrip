# EasyTrip Server

This is the backend of EasyTrip, the Web Programming I project. It uses Node.js and Express, and it
connects the website to the [MySQL database](../database/README.md).

- **Part 2** added accounts: register, log in, log out, and different access for customers and admins.
- **Part 3** reorganised the code into the 3-tier architecture with MVC, and moved login to
  sessions saved in MySQL, as in the course. The pages and the API work the same as before.

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
| `routes/auth.js` | The account URLs: register, log in, log out, "who is logged in" |
| `routes/admin.js` | The admin URLs, all protected by `isAuth` and `isAdmin` |
| `middleware/is-auth.js` | `isAuth` (logged in) and `isAdmin` (admin role) |
| `middleware/limit-attempts.js` | The limit on failed register and login attempts |
| `controllers/auth.js` | Register, log in, log out, "who is logged in" |
| `controllers/admin.js` | The admin dashboard totals |
| `controllers/error.js` | "Not found" answers and the error handler |
| `validators/auth.js` | The register and login checks |
| `validators/common.js` | Helpers that every validator uses |
| `models/user.js` | Every query on the `users` table |
| `models/stats.js` | The totals for the admin dashboard |

### How a request goes through the layers

Logging in, for example:

1. `public/js/auth.js` checks the form, then sends `POST /api/auth/login` with `fetch`.
2. `routes/auth.js` sends it through `limitAttempts`, then to `authController.login`.
3. `controllers/auth.js` checks the data with `validators/auth.js`, asks `models/user.js` for the
   user, and compares the password with bcrypt.
4. `models/user.js` runs `SELECT ... FROM users WHERE email = ?` and returns the row.
5. The controller saves the user's id in the session and answers with the user as JSON.
6. `auth.js` in the browser reads the answer and opens the account or admin page.

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
2. Log in. A customer goes to **My account**, and the menu now shows "My account".
3. Try to open `admin.html`. A customer is sent back to their account.
4. Stop the server and start it again, then reload the page: you are still logged in, because the
   session is saved in MySQL.
5. Log out, then try to open `account.html`. You are sent to the login page.
6. Log in with the admin test account. An admin goes to the **Admin dashboard**, with totals from the
   database.

## The API

All data is sent as JSON.

| Method and route | Who can use it | What it does | Main answers |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Anyone | Creates a customer account | `201` created, `400` invalid data, `409` email already used |
| `POST /api/auth/login` | Anyone | Checks the email and password, and starts the session | `200` logged in, `400` missing data, `401` wrong email or password |
| `POST /api/auth/logout` | Anyone | Ends the session | `200` |
| `GET /api/auth/me` | Anyone | Returns the logged-in user, or `null` for a visitor | `200` |
| `GET /api/admin/stats` | Admin only | Returns the totals for the dashboard | `200`, `401` not logged in, `403` not an admin |

Register and login also answer `429` after 20 failed attempts in 15 minutes.

Register expects `firstName`, `lastName`, `email` and `password`. Login expects `email` and `password`.
When a field is wrong, the answer has an `error` message and a `fields` object with one message per
field, which the page shows under each field.

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
4. If they match, the server starts a new session and saves only the user's id in it. The session is a
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
| SQL injection | Every query uses `?` placeholders, so user input is never part of the SQL text, and the driver refuses several statements in one query |
| Wrong or strange input | Every field is checked on the server too, and anything that isn't text counts as empty |
| Someone making themselves an admin | The role isn't read from the request, so new accounts are always customers |
| A fake or changed session ID | The cookie is signed with `SESSION_SECRET`, and the session must exist in MySQL |
| Session fixation (a session ID planted before login) | Login always creates a new session ID |
| Using a session after logout | Logout deletes the session in MySQL, not only the cookie |
| Scripts reading the cookie | The cookie is `HttpOnly`, so JavaScript in the page can't read it |
| Requests from other websites | The cookie is `SameSite=Lax`, so other sites can't send POST requests with it |
| Password guessing | 20 failed attempts per visitor every 15 minutes |
| Scripts inside a name | The pages show names with `textContent`, so they appear as plain text |
| Downloading private files | Only the `public/` folder is served, not `server/`, `database/` or `.env` |
| Showing technical errors | Details stay in the server's log, and the visitor sees a general message |

## Limits so far

- **There is no password reset or email check.** Anyone can register with an email they don't own.
- **There is no HTTPS on a local computer.** On a real server, set `NODE_ENV=production` so the cookie is
  only sent over HTTPS, and use a MySQL user with fewer rights than `root`.
- **The attempt limit is kept in memory**, so it starts again when the server restarts.
- **The admin dashboard only shows totals.** The tools to manage the site aren't built yet.

## Next part

Part 4: the hotels, chalets and destinations come from the database, with search, filters, sorting
and pages.
