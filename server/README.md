# EasyTrip Server (Part 2)

This is the backend of EasyTrip, the Web Programming I project. It uses Node.js and Express, and it
connects the website to the [MySQL database](../database/README.md). This part adds accounts:
register, log in, log out, and different access for customers and admins.

| File | What it does |
| --- | --- |
| `index.js` | Starts the server, serves the website and the API, and handles errors |
| `db.js` | The connection to MySQL |
| `routes/auth.js` | Register, log in, log out and "who is logged in" |
| `routes/admin.js` | Data for the admin dashboard |
| `middleware/auth.js` | Checks the login token and protects private routes |

## How to run it

You need Node.js 20 or newer and MySQL.

1. **Create the database**, if you haven't yet. The command is in the
   [database README](../database/README.md#how-to-run-it).
2. **Install the packages:**

   ```bash
   npm install
   ```

3. **Create your settings.** Copy `.env.example` to a new file named `.env`. Set `DB_PASSWORD` to your
   MySQL password, and set `JWT_SECRET` to a long random text. This command creates one:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

5. Open <http://localhost:3000>.

If something is wrong with the settings, the server stops and says what to fix.

## Try it

The test accounts are listed in the [database README](../database/README.md#test-accounts).

1. Choose **Log in** in the menu, then **Create an account**, and register. You go back to the login
   page, as in the app flow diagram.
2. Log in. A customer goes to **My account**, and the menu now shows "My account".
3. Try to open `admin.html`. A customer is sent back to their account.
4. Log out, then try to open `account.html`. You are sent to the login page.
5. Log in with the admin test account. An admin goes to the **Admin dashboard**, with totals from the
   database.

## The API

All data is sent as JSON.

| Method and route | Who can use it | What it does | Main answers |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Anyone | Creates a customer account | `201` created, `400` invalid data, `409` email already used |
| `POST /api/auth/login` | Anyone | Checks the email and password, and creates the login cookie | `200` logged in, `400` missing data, `401` wrong email or password |
| `POST /api/auth/logout` | Anyone | Deletes the login cookie | `200` |
| `GET /api/auth/me` | Anyone | Returns the logged-in user, or `null` for a visitor | `200` |
| `GET /api/admin/stats` | Admin only | Returns the totals for the dashboard | `200`, `401` not logged in, `403` not an admin |

Register and login also answer `429` after 20 failed attempts in 15 minutes.

Register expects `firstName`, `lastName`, `email` and `password`. Login expects `email` and `password`.

## How login works

This follows the authentication flow in [docs/app-flow](../docs/app-flow/README.md):

1. The browser checks the form first. The server checks everything again, because the browser
   checks can be skipped.
2. **Register:** the password is hashed with bcrypt, and the user is saved in the `users` table with the
   role `customer`. The user then goes to the login page.
3. **Login:** the server finds the user by email and compares the password with the hash. If they don't
   match, the answer is "Wrong email or password." for both a wrong email and a wrong password.
4. If they match, the server creates a token (a JWT) with the user's id and role. It is signed with
   `JWT_SECRET` and lasts 2 hours, and it is sent to the browser in a cookie.
5. **On each private request**, the server checks the token's signature and date, then reads the user
   from the database. If the account was deleted or its role changed, the token stops working.
6. **The role** decides the page: admins go to `admin.html` and customers to `account.html`. The admin
   data is protected on the server, so hiding the page isn't what keeps it safe.
7. **Logout** deletes the cookie.

## Security

| Risk | How it is handled |
| --- | --- |
| Stolen passwords | Only a bcrypt hash is stored, and it is never sent to the browser |
| SQL injection | Every query uses `?` parameters, so user input is never part of the SQL text |
| Someone making themselves an admin | The role isn't read from the request, so new accounts are always customers |
| Changed or fake tokens | The token's signature is checked with the secret, and only the `HS256` method is accepted |
| Scripts reading the token | The cookie is `HttpOnly`, so JavaScript in the page can't read it |
| Requests from other websites | The cookie is `SameSite=Lax`, so other sites can't send POST requests with it |
| Password guessing | 20 failed attempts per visitor every 15 minutes |
| Scripts inside a name | The pages show names with `textContent`, so they appear as plain text |
| Downloading private files | Only `css/`, `js/`, `assets/` and the `.html` pages are public, not this folder, `.env` or `database/` |
| Showing technical errors | Details stay in the server's log, and the visitor sees a general message |

## Limits of this part

- **Logout only removes the cookie from that browser.** A copy of the token would work until it expires
  after 2 hours, because the tokens aren't stored in the database.
- **There is no password reset or email check.** Anyone can register with an email they don't own.
- **There is no HTTPS on a local computer.** On a real server, set `NODE_ENV=production` so the cookie is
  only sent over HTTPS, and use a MySQL user with fewer rights than `root`.
- **The attempt limit is kept in memory**, so it starts again when the server restarts.
- **The admin dashboard only shows totals.** The tools to manage the site aren't built yet.

## Next part

Connect the hotels, chalets, bookings, tickets and contact form to the database.
