// EasyTrip server: it serves the website (public/) and the API (/api), and connects to MySQL.
//
// The project follows the 3-tier architecture:
//   presentation layer  -> public/            pages, styles, browser scripts and images
//   business layer      -> server/controllers  the rules: check the request, decide the answer
//                          server/routes, middleware, validators help the controllers
//   data access layer   -> server/models       the only files that run SQL
//   database            -> MySQL (database/schema.sql)
import path from "path";
import express from "express";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";

import config from "./config.js";
import rootDir from "./utils/path.js";
import db, { explainDatabaseError } from "./utils/database.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import * as errorController from "./controllers/error.js";

if (!config.sessionSecret) {
  console.error("SESSION_SECRET is missing. Copy .env.example to .env and fill it in (see server/README.md).");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by"); // Don't tell visitors which server software we use.

// The sessions are saved in MySQL, in the "sessions" table, using the same pool as the models.
// They survive a server restart, and logout deletes them for real.
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({}, db);

// 1. The website: every file in public/ (pages, css, js, images). Nothing outside public/
//    (the server code, the database files, .env) can be downloaded.
app.use(express.static(path.join(rootDir, "public")));

// 2. Read the JSON that the pages send with fetch (the built-in body parser).
app.use(express.json());

// 3. Sessions. The browser only keeps a cookie with the signed session ID.
app.use(
  session({
    secret: config.sessionSecret,
    resave: false, // Don't save a session that didn't change.
    saveUninitialized: false, // Don't create a session before login.
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
      httpOnly: true, // JavaScript in the page can't read the cookie.
      sameSite: "lax", // Other websites can't send POST requests with this cookie.
      secure: config.isProduction, // Only over HTTPS on a real server.
    },
  })
);

// 4. The API
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store"); // Browsers must always ask for fresh account data.
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// 5. Not found and errors
app.use("/api", errorController.apiNotFound);
app.use(errorController.pageNotFound);
app.use(errorController.handleError);

// Start only if MySQL answers and the tables exist, with a clear message if not.
async function start() {
  try {
    await db.query("SELECT 1 FROM users LIMIT 1");
    await sessionStore.onReady();
  } catch (error) {
    console.error(`Could not connect to the database. ${explainDatabaseError(error)}`);
    process.exit(1);
  }

  app.listen(config.port, (error) => {
    if (error) {
      console.error(`Could not start on port ${config.port}: ${error.message}`);
      process.exit(1);
    }
    console.log(`EasyTrip is running at http://localhost:${config.port}`);
  });
}

start();
