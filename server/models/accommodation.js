// MODEL: the only file that talks to the "accommodations" table (the hotels and chalets).
// Each stay is read with its destination (a JOIN on dest_id), because the pages show the place,
// like "Faraya, Lebanon".
import db, { escapeLike } from "../utils/database.js";

// ORDER BY can't use a ? placeholder, because it takes a column name, not a value. So the sort
// comes from this fixed list, and the user's text never reaches the SQL. acc_id is added last so
// stays with the same price always come in the same order (the pages need that for "Show more").
const SORT_ORDERS = {
  "recommended": "a.acc_id",
  "price-asc": "a.price ASC, a.acc_id",
  "price-desc": "a.price DESC, a.acc_id",
  "name-asc": "a.name ASC, a.acc_id",
};

// Builds the WHERE part from the filters. Every value goes into the values array and the SQL
// only gets a ? for it.
function buildWhere(filters) {
  const conditions = [];
  const values = [];

  if (filters.type) {
    conditions.push("a.type = ?");
    values.push(filters.type);
  }
  if (filters.season) {
    conditions.push("d.season = ?");
    values.push(filters.season);
  }
  // Free on those dates: no booking (except a cancelled one) shares a night with them. A stay
  // that ends on the check-in day doesn't: its guests leave that morning.
  if (filters.start && filters.end) {
    conditions.push(
      `NOT EXISTS (SELECT 1 FROM bookings b
        WHERE b.acc_id = a.acc_id AND b.status <> 'cancelled' AND b.start_date < ? AND b.end_date > ?)`
    );
    values.push(filters.end, filters.start);
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

// Every stay, short (id, name, type, place), by type then name. The admin's discount form lists
// them, to choose the stays a discount leaves out.
export async function findAllShort() {
  const [rows] = await db.execute(
    `SELECT a.acc_id, a.name, a.type, d.name AS dest_name, d.country
     FROM accommodations a
     JOIN destinations d ON d.dest_id = a.dest_id
     ORDER BY a.type, a.name`
  );
  return rows;
}

// CREATE: adds a stay and returns its new id. category and setting are null for hotels.
export async function create(stay) {
  const [result] = await db.execute(
    `INSERT INTO accommodations
       (dest_id, name, type, category, setting, price, description, image, image_alt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [stay.destId, stay.name, stay.type, stay.category, stay.setting, stay.price,
     stay.description, stay.image, stay.imageAlt]
  );
  return result.insertId;
}

// UPDATE: changes every field of one stay. The WHERE makes sure only this stay changes.
export async function update(accId, stay) {
  await db.execute(
    `UPDATE accommodations
     SET dest_id = ?, name = ?, type = ?, category = ?, setting = ?, price = ?,
         description = ?, image = ?, image_alt = ?
     WHERE acc_id = ?`,
    [stay.destId, stay.name, stay.type, stay.category, stay.setting, stay.price,
     stay.description, stay.image, stay.imageAlt, accId]
  );
}

// DELETE: removes one stay. MySQL refuses it (ER_ROW_IS_REFERENCED_2) when the stay has
// bookings, because of the foreign key's ON DELETE RESTRICT in schema.sql.
export async function deleteById(accId) {
  await db.execute("DELETE FROM accommodations WHERE acc_id = ?", [accId]);
}
