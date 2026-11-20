// CONTROLLER for the destinations. Anyone can read the list (the admin's stay form uses it to
// choose where a hotel or chalet is). Only an admin can add, edit and delete them: those routes
// are in routes/admin.js, behind isAuth and isAdmin.
import * as Destination from "../models/destination.js";
import { checkDestination } from "../validators/admin.js";
import { hasErrors, readPositiveInt } from "../validators/common.js";

// Written like on the stay cards: "Faraya, Lebanon", or "Maldives".
function destinationJson(row) {
  const destination = {
    id: row.dest_id,
    name: row.name,
    country: row.country,
    season: row.season,
    location: row.name === row.country ? row.country : row.name + ", " + row.country,
  };
  if (row.stays !== undefined) destination.stays = row.stays;
  return destination;
}

// GET /api/destinations
export async function listDestinations(req, res) {
  const rows = await Destination.findAll();
  res.json({ destinations: rows.map(destinationJson) });
}

// ---------- For the admin ----------

const TAKEN = {
  error: "Please correct the highlighted fields.",
  fields: { name: "This place is already listed for this season." },
};

function readId(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) res.status(400).json({ error: "The destination id must be a whole number of 1 or more." });
  return id;
}

// GET /api/admin/destinations: every destination, with how many stays it has.
export async function listForAdmin(req, res) {
  const rows = await Destination.findAllWithStays();
  res.json({ destinations: rows.map(destinationJson) });
}

// POST /api/admin/destinations  (JSON: name, country, season)
export async function createDestination(req, res) {
  const { data, errors } = checkDestination(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }
  let id;
  try {
    id = await Destination.create(data);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json(TAKEN);
    throw error;
  }
  const row = await Destination.findById(id);
  res.status(201).json({ message: `${destinationJson(row).location} (${row.season}) was added.`, destination: destinationJson(row) });
}

// PUT /api/admin/destinations/:id  (JSON: name, country, season)
export async function updateDestination(req, res) {
  const id = readId(req, res);
  if (!id) return;
  const { data, errors } = checkDestination(req.body || {});
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
  }
  try {
    if (!(await Destination.update(id, data))) {
      return res.status(404).json({ error: "This destination does not exist." });
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json(TAKEN);
    throw error;
  }
  const row = await Destination.findById(id);
  res.json({ message: "The destination was saved. Its stays show the new name at once.", destination: destinationJson(row) });
}

// DELETE /api/admin/destinations/:id
export async function deleteDestination(req, res) {
  const id = readId(req, res);
  if (!id) return;
  try {
    if (!(await Destination.deleteById(id))) {
      return res.status(404).json({ error: "This destination does not exist." });
    }
  } catch (error) {
    // The foreign key (ON DELETE RESTRICT) keeps a destination that still has stays.
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ error: "This destination still has hotels or chalets. Move or delete them first." });
    }
    throw error;
  }
  res.json({ message: "The destination was deleted." });
}
