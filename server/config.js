// The server's settings. They are read from the .env file, so the MySQL password and the
// session secret are never written in the code (and never committed to Git).
import path from "path";
import dotenv from "dotenv";
import rootDir from "./utils/path.js";

dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

const config = {
  port: Number(process.env.PORT) || 3000,

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
};

export default config;
