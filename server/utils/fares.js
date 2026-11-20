// The sample fares of the tickets, in US dollars: the price of ONE traveler going ONE way, for
// each transport and class. EasyTrip has no real schedules or fares, so every route of the same
// transport and class costs the same. The pages read this list from GET /api/tickets/fares, so
// they always show what the server will charge.
export const FARES = {
  flight: { economy: 220, premium: 340, business: 690, first: 1150 },
  bus: { standard: 12, premium: 20 },
  train: { standard: 35, first: 60, sleeper: 85 },
};

// The price of a whole ticket: every traveler, and both ways for a round trip. The fares are
// whole dollars, so this is an exact whole number. Returns null for a class that the transport
// doesn't have (a bus has no "business").
export function ticketPrice(type, seatClass, travelers, roundTrip) {
  const fare = FARES[type] ? FARES[type][seatClass] : undefined;
  if (!fare) return null;
  return fare * travelers * (roundTrip ? 2 : 1);
}
