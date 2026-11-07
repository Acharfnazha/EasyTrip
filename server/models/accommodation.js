// MODEL: the only file that talks to the "accommodations" table (the hotels and chalets).
// Each stay is read with its destination (a JOIN on dest_id), because the pages show the place,
// like "Faraya, Lebanon".
import db from "../utils/database.js";

// ORDER BY can't use a ? placeholder, because it takes a column name, not a value. So the sort
// comes from this fixed list, and the user's text never reaches the SQL. acc_id is added last so
// stays with the same price always come in the same order (the pages need that for "Show more").
const SORT_ORDERS = {
  "recommended": "a.acc_id",
  "price-asc": "a.price ASC, a.acc_id",
  "price-desc": "a.price DESC, a.acc_id",
  "name-asc": "a.name ASC, a.acc_id",
};

// In LIKE, % and _ are wildcards. A backslash in front makes them normal characters, so a
// search for "50%" looks for the text "50%".
function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&");
}

// Builds the WHERE part from the filters. Every value goes into the values array and the SQL
// only gets a ? for it.
function buildWhere(filters) {
  const conditions = [];
  const values = [];

  if (filters.type) {
    conditions.push("a.type = ?");
    values.push(filters.type);
  }
  if (filters.setting) {
    conditions.push("a.setting = ?");
    values.push(filters.setting);
  }
  if (filters.minPrice !== null) {
    conditions.push("a.price >= ?");
    values.push(filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    conditions.push("a.price <= ?");
    values.push(filters.maxPrice);
  }
  if (filters.search) {
    // The search looks in the stay's name, the destination and the country. The column collation
    // ignores capitals and accents, so "goreme" finds "Göreme".
    const pattern = "%" + escapeLike(filters.search) + "%";
    conditions.push("(a.name LIKE ? OR d.name LIKE ? OR d.country LIKE ?)");
    values.push(pattern, pattern, pattern);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  return { where, values };
}

// One page of stays that match the filters, and how many match in total (for the page count).
export async function findAll(filters) {
  const { where, values } = buildWhere(filters);
  const orderBy = SORT_ORDERS[filters.sort] || SORT_ORDERS.recommended;
  const offset = (filters.page - 1) * filters.limit;

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM accommodations a
     JOIN destinations d ON d.dest_id = a.dest_id
     ${where}`,
    values
  );

  const [rows] = await db.execute(
    `SELECT a.acc_id, a.name, a.type, a.category, a.setting, a.price, a.description,
            a.image, a.image_alt, d.dest_id, d.name AS dest_name, d.country, d.season
     FROM accommodations a
     JOIN destinations d ON d.dest_id = a.dest_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...values, filters.limit, offset]
  );

  return { rows: rows, total: countRows[0].total };
}

// One stay with its destination, or undefined if there is no stay with this id.
export async function findById(accId) {
  const [rows] = await db.execute(
    `SELECT a.acc_id, a.name, a.type, a.category, a.setting, a.price, a.description,
            a.image, a.image_alt, d.dest_id, d.name AS dest_name, d.country, d.season
     FROM accommodations a
     JOIN destinations d ON d.dest_id = a.dest_id
     WHERE a.acc_id = ?`,
    [accId]
  );
  return rows[0];
}
