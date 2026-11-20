// MODEL: the only file that talks to the "discounts" and "discount_exclusions" tables.
// A discount and its excluded stays are saved together, in one TRANSACTION.
// DATE_FORMAT keeps the dates as YYYY-MM-DD text, so no time zone can move them by a day.
import db from "../utils/database.js";

const DISCOUNT_COLUMNS = `
  d.discount_id, d.name, d.percent, d.applies_to, d.user_id, d.is_active, d.created_at,
  DATE_FORMAT(d.start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(d.end_date, '%Y-%m-%d') AS end_date`;

// The excluded stays of these discounts: { discount_id: [acc_id, ...] }.
async function exclusionsOf(ids, executor = db) {
  const byDiscount = {};
  ids.forEach((id) => { byDiscount[id] = []; });
  if (ids.length === 0) return byDiscount;
  const [rows] = await executor.query(
    "SELECT discount_id, acc_id FROM discount_exclusions WHERE discount_id IN (?) ORDER BY acc_id",
    [ids]
  );
  rows.forEach((row) => byDiscount[row.discount_id].push(row.acc_id));
  return byDiscount;
}

// The discounts that work on this day for this customer (userId null: a visitor, who only gets
// the discounts for everyone), in the form utils/discounts.js uses.
export async function findCurrentFor(userId, day, executor = db) {
  const [rows] = await executor.execute(
    `SELECT discount_id, name, percent, applies_to
     FROM discounts
     WHERE is_active = 1
       AND (user_id IS NULL OR user_id = ?)
       AND (start_date IS NULL OR start_date <= ?)
       AND (end_date IS NULL OR end_date >= ?)`,
    [userId || 0, day, day] // No account has the id 0, so a visitor matches only user_id IS NULL.
  );
  const excluded = await exclusionsOf(rows.map((row) => row.discount_id), executor);
  return rows.map((row) => ({
    id: row.discount_id,
    name: row.name,
    percent: row.percent,
    appliesTo: row.applies_to,
    excluded: excluded[row.discount_id],
  }));
}

// Every discount for the admin, newest first, with its customer and its excluded stays.
export async function findAll() {
  const [rows] = await db.execute(
    `SELECT ${DISCOUNT_COLUMNS}, u.first_name, u.last_name, u.email
     FROM discounts d
     LEFT JOIN users u ON u.user_id = d.user_id
     ORDER BY d.created_at DESC, d.discount_id DESC`
  );
  const excluded = await exclusionsOf(rows.map((row) => row.discount_id));
  rows.forEach((row) => { row.excluded = excluded[row.discount_id]; });
  return rows;
}

// One discount like in findAll, or undefined.
export async function findById(discountId) {
  const [rows] = await db.execute(
    `SELECT ${DISCOUNT_COLUMNS}, u.first_name, u.last_name, u.email
     FROM discounts d
     LEFT JOIN users u ON u.user_id = d.user_id
     WHERE d.discount_id = ?`,
    [discountId]
  );
  if (!rows[0]) return undefined;
  rows[0].excluded = (await exclusionsOf([discountId]))[discountId];
  return rows[0];
}

async function saveExclusions(connection, discountId, accIds) {
  await connection.execute("DELETE FROM discount_exclusions WHERE discount_id = ?", [discountId]);
  if (accIds.length === 0) return;
  await connection.query(
    "INSERT INTO discount_exclusions (discount_id, acc_id) VALUES ?",
    [accIds.map((accId) => [discountId, accId])]
  );
}

// Runs work(connection) in one transaction.
async function inTransaction(work) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// CREATE: the discount and its excluded stays. A stay id that doesn't exist makes MySQL refuse it
// (ER_NO_REFERENCED_ROW_2, the foreign key), and nothing is saved. Returns the new id.
export async function create(discount) {
  return inTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO discounts (name, percent, applies_to, user_id, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [discount.name, discount.percent, discount.appliesTo, discount.userId, discount.startDate,
        discount.endDate, discount.active ? 1 : 0]
    );
    await saveExclusions(connection, result.insertId, discount.excluded);
    return result.insertId;
  });
}

// UPDATE: the discount, and its excluded stays replaced by the new list. Returns true when it exists.
export async function update(discountId, discount) {
  return inTransaction(async (connection) => {
    const [result] = await connection.execute(
      `UPDATE discounts
       SET name = ?, percent = ?, applies_to = ?, user_id = ?, start_date = ?, end_date = ?, is_active = ?
       WHERE discount_id = ?`,
      [discount.name, discount.percent, discount.appliesTo, discount.userId, discount.startDate,
        discount.endDate, discount.active ? 1 : 0, discountId]
    );
    if (result.affectedRows === 0) return false;
    await saveExclusions(connection, discountId, discount.excluded);
    return true;
  });
}

// DELETE: its excluded stays go with it (ON DELETE CASCADE). Returns true when there was one.
// Bookings and tickets keep the percent they got (their own discount_percent column).
export async function deleteById(discountId) {
  const [result] = await db.execute("DELETE FROM discounts WHERE discount_id = ?", [discountId]);
  return result.affectedRows > 0;
}
