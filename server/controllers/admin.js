// CONTROLLER for the admin dashboard. The admin routes are protected by isAuth and isAdmin
// (server/routes/admin.js), so every function here already has a logged-in admin.
import * as Stats from "../models/stats.js";
import * as Browser from "../models/database-browser.js";
import { readPositiveInt } from "../validators/common.js";

// GET /api/admin/stats: the main totals for the dashboard.
export async function getStats(req, res) {
  const totals = await Stats.getDashboardTotals();
  res.json(totals);
}

// GET /api/admin/overview: the figures behind the dashboard's charts and "latest" lists.
export async function getOverview(req, res) {
  const [staysByType, staysByCountry, inquiriesByStatus, bookingsByStatus, latestUsers, latestInquiries] =
    await Promise.all([
      Stats.countStaysByType(),
      Stats.countStaysByCountry(6),
      Stats.countInquiriesByStatus(),
      Stats.countBookingsByStatus(),
      Stats.findLatestUsers(5),
      Stats.findLatestInquiries(5),
    ]);

  res.json({
    staysByType: staysByType,
    staysByCountry: staysByCountry,
    inquiriesByStatus: inquiriesByStatus,
    bookingsByStatus: bookingsByStatus,
    latestUsers: latestUsers.map((user) => ({
      id: user.user_id,
      name: (user.first_name + " " + user.last_name).trim(),
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    })),
    latestInquiries: latestInquiries.map((inquiry) => ({
      id: inquiry.inquiry_id,
      name: inquiry.name,
      topic: inquiry.topic,
      status: inquiry.status,
      createdAt: inquiry.created_at,
    })),
  });
}

// ---------- The database viewer (read only) ----------

const ROWS_PER_PAGE = 25;
const MAX_ROWS_PER_PAGE = 100;

// Values the viewer never sends to the browser, even to an admin:
//   "hidden": nothing is shown. A password hash can be attacked offline, and a session ID is
//             enough to act as that logged-in user.
//   "end":    only the last 3 characters, like the account page does for a document number.
const PROTECTED_COLUMNS = {
  users: { password_hash: "hidden" },
  sessions: { session_id: "hidden", data: "hidden" },
  id_documents: { document_number: "end" },
};

function protectValue(value, rule) {
  if (value === null) return null;
  if (rule === "end") return "•••" + String(value).slice(-3);
  return "•••••• hidden";
}

// GET /api/admin/database: the tables, with how many rows and columns each one has.
export async function listTables(req, res) {
  const [name, tableNames] = await Promise.all([Browser.getDatabaseName(), Browser.listTableNames()]);
  const tables = await Promise.all(
    tableNames.map(async (table) => {
      const [rows, columns] = await Promise.all([Browser.countRows(table), Browser.findColumns(table)]);
      return { name: table, rows: rows, columns: columns.length };
    })
  );
  res.json({ database: name, tables: tables });
}

// GET /api/admin/database/:table?page=1&limit=25&order=oldest
// The columns of one table and one page of its rows.
export async function getTable(req, res) {
  // The name must be one of the database's own tables. Anything else is refused here, so no
  // text from the URL ever becomes part of the SQL.
  const tableNames = await Browser.listTableNames();
  const table = req.params.table;
  if (!tableNames.includes(table)) {
    return res.status(404).json({ error: "This table does not exist." });
  }

  const fields = {};
  const page = req.query.page === undefined ? 1 : readPositiveInt(req.query.page);
  const limit = req.query.limit === undefined ? ROWS_PER_PAGE : readPositiveInt(req.query.limit);
  const order = req.query.order === undefined ? "oldest" : req.query.order;
  if (page === null) fields.page = "page must be a whole number of 1 or more.";
  if (limit === null || limit > MAX_ROWS_PER_PAGE) {
    fields.limit = `limit must be a whole number from 1 to ${MAX_ROWS_PER_PAGE}.`;
  }
  if (order !== "oldest" && order !== "newest") fields.order = "order must be oldest or newest.";
  if (Object.keys(fields).length > 0) {
    return res.status(400).json({ error: "Some values are not valid.", fields: fields });
  }

  const [columns, foreignKeys, total] = await Promise.all([
    Browser.findColumns(table),
    Browser.findForeignKeys(table),
    Browser.countRows(table),
  ]);
  const keyColumns = columns.filter((column) => column.columnKey === "PRI").map((column) => column.name);
  const rows = await Browser.findRows(table, keyColumns, order === "newest", limit, (page - 1) * limit);

  const rules = PROTECTED_COLUMNS[table] || {};
  const references = {};
  foreignKeys.forEach((key) => {
    references[key.columnName] = { table: key.refTable, column: key.refColumn };
  });

  res.json({
    table: table,
    columns: columns.map((column) => ({
      name: column.name,
      type: column.type,
      nullable: column.nullable === "YES",
      primaryKey: column.columnKey === "PRI",
      unique: column.columnKey === "UNI",
      references: references[column.name] || null,
      protected: Boolean(rules[column.name]),
    })),
    // Each row is a list of values, in the order of the columns.
    rows: rows.map((row) =>
      columns.map((column) => {
        const rule = rules[column.name];
        return rule ? protectValue(row[column.name], rule) : row[column.name];
      })
    ),
    pagination: { page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) },
  });
}
