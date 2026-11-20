// MODEL: the only file that talks to the "destinations" table.
import db from "../utils/database.js";

// Every destination, by country, then name, then season in the year's order.
export async function findAll() {
  const [rows] = await db.execute(
    `SELECT dest_id, name, country, season
     FROM destinations
     ORDER BY country, name, FIELD(season, 'winter', 'spring', 'summer', 'autumn')`
  );
  return rows;
}

// One destination, or undefined if there is none with this id.
export async function findById(destId) {
  const [rows] = await db.execute(
    "SELECT dest_id, name, country, season FROM destinations WHERE dest_id = ?",
    [destId]
  );
  return rows[0];
}

// Every destination with how many stays it has, for the admin's list.
export async function findAllWithStays() {
  const [rows] = await db.execute(
    `SELECT d.dest_id, d.name, d.country, d.season, COUNT(a.acc_id) AS stays
     FROM destinations d
     LEFT JOIN accommodations a ON a.dest_id = d.dest_id
     GROUP BY d.dest_id, d.name, d.country, d.season
     ORDER BY d.country, d.name, FIELD(d.season, 'winter', 'spring', 'summer', 'autumn')`
  );
  return rows;
}

// CREATE. MySQL refuses the same place twice in one season (ER_DUP_ENTRY, the UNIQUE key).
export async function create(destination) {
  const [result] = await db.execute(
    "INSERT INTO destinations (name, country, season) VALUES (?, ?, ?)",
    [destination.name, destination.country, destination.season]
  );
  return result.insertId;
}

// UPDATE. Returns true when the destination exists.
export async function update(destId, destination) {
  const [result] = await db.execute(
    "UPDATE destinations SET name = ?, country = ?, season = ? WHERE dest_id = ?",
    [destination.name, destination.country, destination.season, destId]
  );
  return result.affectedRows > 0;
}

// DELETE. MySQL refuses it (ER_ROW_IS_REFERENCED_2) while stays are in this destination,
// because of the foreign key's ON DELETE RESTRICT. Returns true when there was one.
export async function deleteById(destId) {
  const [result] = await db.execute("DELETE FROM destinations WHERE dest_id = ?", [destId]);
  return result.affectedRows > 0;
}
