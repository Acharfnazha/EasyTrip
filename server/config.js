// The server's settings. They are read from the .env file, so the MySQL password and the
// session secret are never written in the code (and never committed to Git).
import path from "path";
import dotenv from "dotenv";
import rootDir from "./utils/path.js";

dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

const port = Number(process.env.PORT) || 3000;

const config = {
  port: port,

  // The site's address, written in the emails ("see it on your account page: ..."). On a real
  // server, set SITE_URL in .env to its address, like https://easytrip.example.
  siteUrl: (process.env.SITE_URL || "").trim().replace(/\/+$/, "") || `http://localhost:${port}`,

  // On a real server, NODE_ENV=production makes the session cookie HTTPS-only.
  isProduction: process.env.NODE_ENV === "production",

  // The secret used to sign the session cookie, so nobody can fake a session ID.
  sessionSecret: process.env.SESSION_SECRET,

  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "easytrip_db",
  },

  // true (the default): only a user whose identity an admin verified can book a stay or buy a
  // ticket. Set REQUIRE_VERIFIED_ID=false in .env to let every logged-in user book.
  requireVerifiedId: (process.env.REQUIRE_VERIFIED_ID || "true").trim().toLowerCase() !== "false",

  // The Gmail account that sends the login codes. The password is a Google "app password", not
  // the account's real password. Google shows it in four groups; the spaces are not part of it.
  mail: {
    user: (process.env.GMAIL_USER || "").trim(),
    password: (process.env.GMAIL_APP_PASSWORD || "").replace(/\s/g, ""),
  },

  // "Continue with Google": the OAuth client made in the Google Cloud Console. The redirect
  // address must be the same one that is written in the console.
  google: {
    clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    redirectUri: (process.env.GOOGLE_REDIRECT_URI || "").trim() || `http://localhost:${port}/api/auth/google/callback`,
  },
};

export default config;
