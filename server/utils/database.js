// The connection to MySQL. A pool keeps a few connections open and reuses them for every query.
// Only the models (server/models) use it: they are the only files that run SQL.
import mysql from "mysql2/promise";
import config from "../config.js";

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  charset: "utf8mb4",
  connectionLimit: 10,
});

// A clear message for the usual setup problems, shown when the server can't start.
export function explainDatabaseError(error) {
  if (error.code === "ECONNREFUSED") {
    return "MySQL is not running, or DB_HOST and DB_PORT in .env are wrong.";
  }
  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return "MySQL refused the login. Check DB_USER and DB_PASSWORD in .env.";
  }
  if (error.code === "ER_BAD_DB_ERROR" || error.code === "ER_NO_SUCH_TABLE") {
    return "The database is not set up yet. Run the command in database/README.md.";
  }
  return error.message;
}

export default pool;
