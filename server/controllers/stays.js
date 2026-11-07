// CONTROLLER for the stays (hotels and chalets): the list with search, filters, sorting and
// pages, and one stay by its id. Anyone can use these routes, no login needed.
import * as Accommodation from "../models/accommodation.js";
import { checkStayFilters } from "../validators/stays.js";
import { hasErrors, readPositiveInt } from "../validators/common.js";

// A stay as the pages receive it: names in camelCase, the price as a number, and the place
// written like on the cards.
function stayJson(row) {
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
  };
}

// GET /api/stays?type=&q=&setting=&minPrice=&maxPrice=&sort=&page=&limit=
export async function listStays(req, res) {
  const { data, errors } = checkStayFilters(req.query);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: "Some filters are not valid.", fields: errors });
  }

  const result = await Accommodation.findAll(data);

  res.json({
    stays: result.rows.map(stayJson),
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

  res.json({ stay: stayJson(row) });
}
