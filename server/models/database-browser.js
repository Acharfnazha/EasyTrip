// MODEL for the admin's database viewer. It only READS: the tables of this database, their
// columns, and one page of a table's rows. Nothing here can change the data.
//
// A table name can't be a ? value in SQL (a ? is always a value, never a name). So the
// controller first checks the name against listTableNames(), and the queries below write it
// with ??, which the driver turns into a quoted name like `users`.
import db from "../utils/database.js";

// The tables of the database the server is connected to. MySQL keeps this list in its own
// "information_schema" database.
export async function listTableNames() {
  const [rows] = await db.query(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`
  );
  return rows.map((row) => row.name);
}

// The name of the database, like "easytrip_db".
export async function getDatabaseName() {
  const [rows] = await db.query("SELECT DATABASE() AS name");
  return rows[0].name;
}

// How many rows a table has. COUNT(*) is exact (the number in information_schema is an estimate).
export async function countRows(table) {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM ??", [table]);
  return rows[0].total;
}

// The columns of a table, in their order: name, type, key and so on.
export async function findColumns(table) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable,
            COLUMN_KEY AS columnKey, COLUMN_DEFAULT AS defaultValue, EXTRA AS extra
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [table]
  );
  return rows;
}

// The foreign keys of a table: which column points to which table and column.
export async function findForeignKeys(table) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME AS columnName, REFERENCED_TABLE_NAME AS refTable,
            REFERENCED_COLUMN_NAME AS refColumn
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [table]
  );
  return rows;
}

// One page of a table's rows, ordered by the primary key (so the pages never mix), oldest or
// newest first. dateStrings gives the dates as MySQL writes them ("2026-10-11 11:05:00"),
// which is what a database viewer should show.
export async function findRows(table, keyColumns, newestFirst, limit, offset) {
  const direction = newestFirst ? "DESC" : "ASC"; // One of two fixed words, never the user's text.
  const orderBy = keyColumns.length > 0
    ? "ORDER BY " + keyColumns.map(() => "?? " + direction).join(", ")
    : "";
  const [rows] = await db.query(
    { sql: `SELECT * FROM ?? ${orderBy} LIMIT ? OFFSET ?`, dateStrings: true },
    [table, ...keyColumns, limit, offset]
  );
  return rows;
}
