// CONTROLLER for the stays (hotels and chalets).
// Anyone can read them: the list with search, filters, sorting and pages, and one stay.
// Only an admin can add, edit and delete them (server/routes/stays.js protects those routes).
import * as Accommodation from "../models/accommodation.js";
import * as Destination from "../models/destination.js";
import * as Discount from "../models/discount.js";
import { checkStayFilters, checkStayForm } from "../validators/stays.js";
import { hasErrors, readPositiveInt, today } from "../validators/common.js";
import { applyPercent, bestDiscount } from "../utils/discounts.js";
import { deleteUploadedImage, UPLOADS_URL } from "../utils/file.js";

// A stay as the pages receive it: names in camelCase, the price as a number, and the place
// written like on the cards. With discounts (the ones this visitor or customer gets today), the
// stay also has its discount: { name, percent, price } (price: per night after the discount), or null.
function stayJson(row, discounts) {
  const best = discounts ? bestDiscount(discounts, { kind: "stay", type: row.type, id: row.acc_id }) : null;
  return {
    id: row.acc_id,
    name: row.name,
    type: row.type,
    category: row.category,
    setting: row.setting,
    price: Number(row.price), // MySQL sends DECIMAL as text ("350.00") so it keeps every digit.
    description: row.description,
    image: row.image,
    imageAlt: row.image_alt,
    // "Faraya, Lebanon", or only "Maldives" when the destination is a whole country.
    location: row.dest_name === row.country ? row.country : row.dest_name + ", " + row.country,
    destination: {
      id: row.dest_id,
      name: row.dest_name,
      country: row.country,
      season: row.season,
    },
    discount: best && { name: best.name, percent: best.percent, price: Number(applyPercent(row.price, best.percent)) },
  };
}

// The discounts this visitor (req.user null) or customer gets today.
function currentDiscounts(req) {
  return Discount.findCurrentFor(req.user ? req.user.user_id : null, today());
}

// GET /api/stays?type=&q=&setting=&minPrice=&maxPrice=&sort=&page=&limit=
export async function listStays(req, res) {
  const { data, errors } = checkStayFilters(req.query);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Some filters are not valid.", fields: errors });
  }

  const [result, discounts] = await Promise.all([Accommodation.findAll(data), currentDiscounts(req)]);

  res.json({
    stays: result.rows.map((row) => stayJson(row, discounts)),
    pagination: {
      page: data.page,
      limit: data.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / data.limit),
    },
  });
}

// GET /api/stays/:id
export async function getStay(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "The stay id must be a whole number of 1 or more." });
  }

  const row = await Accommodation.findById(id);
  if (!row) {
    return res.status(404).json({ error: "This stay does not exist." });
  }

  res.json({ stay: stayJson(row, await currentDiscounts(req)) });
}

// When a request fails after multer saved its image, the image is deleted again,
// so no unused files stay in the uploads folder.
function discardUpload(req) {
  if (req.file) deleteUploadedImage(UPLOADS_URL + req.file.filename);
}

// Checks the form, and that the chosen destination exists. Returns the clean data and the errors.
async function checkForm(req, imageRequired) {
  const { data, errors } = checkStayForm(req.body || {}, req.file, imageRequired);
  if (data.destId && !errors.destId && !(await Destination.findById(data.destId))) {
    errors.destId = "This destination doesn't exist. Choose one from the list.";
  }
  return { data, errors };
}

function formErrors(res, errors) {
  res.status(400).json({ error: "Please correct the highlighted fields.", fields: errors });
}

// POST /api/stays (admin): adds a stay. The form is multipart/form-data, with the image.
export async function createStay(req, res) {
  try {
    const { data, errors } = await checkForm(req, true);
    if (hasErrors(errors)) {
      discardUpload(req);
      return formErrors(res, errors);
    }

    // The database keeps the image's path, not the image (like in the course).
    data.image = UPLOADS_URL + req.file.filename;
    const newId = await Accommodation.create(data);
    const row = await Accommodation.findById(newId);
    res.status(201).json({ message: `"${row.name}" was added.`, stay: stayJson(row) });
  } catch (error) {
    discardUpload(req);
    throw error;
  }
}

// PUT /api/stays/:id (admin): changes a stay. Without a new image, the old image stays.
export async function updateStay(req, res) {
  try {
    const id = readPositiveInt(req.params.id);
    if (!id) {
      discardUpload(req);
      return res.status(400).json({ error: "The stay id must be a whole number of 1 or more." });
    }
    const oldRow = await Accommodation.findById(id);
    if (!oldRow) {
      discardUpload(req);
      return res.status(404).json({ error: "This stay does not exist. It may have been deleted." });
    }

    const { data, errors } = await checkForm(req, false);
    if (hasErrors(errors)) {
      discardUpload(req);
      return formErrors(res, errors);
    }

    data.image = req.file ? UPLOADS_URL + req.file.filename : oldRow.image;
    await Accommodation.update(id, data);

    // The new image is saved, so the old one can go (only if it was uploaded, not a site image).
    if (req.file) deleteUploadedImage(oldRow.image);

    const row = await Accommodation.findById(id);
    res.json({ message: `"${row.name}" was saved.`, stay: stayJson(row) });
  } catch (error) {
    discardUpload(req);
    throw error;
  }
}

// DELETE /api/stays/:id (admin): deletes a stay that has no bookings.
export async function deleteStay(req, res) {
  const id = readPositiveInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "The stay id must be a whole number of 1 or more." });
  }
  const row = await Accommodation.findById(id);
  if (!row) {
    return res.status(404).json({ error: "This stay does not exist. It may have been deleted already." });
  }

  try {
    await Accommodation.deleteById(id);
  } catch (error) {
    // The foreign key in the bookings table protects the customers' bookings.
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: `"${row.name}" has bookings, so it can't be deleted. Its bookings must stay linked to it.`,
      });
    }
    throw error;
  }

  deleteUploadedImage(row.image);
  res.json({ message: `"${row.name}" was deleted.` });
}
