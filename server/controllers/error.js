// CONTROLLER for the answers when something is missing or goes wrong.

// An /api address that doesn't exist.
export function apiNotFound(req, res) {
  res.status(404).json({ error: "This API route does not exist." });
}

// A page that doesn't exist in public/.
export function pageNotFound(req, res) {
  res.status(404).send('<h1>Page not found</h1><p><a href="/">Back to EasyTrip</a></p>');
}

// Every error ends here (Express 5 also sends here the errors of async functions).
// The details stay in the server's log and are never sent to the visitor.
export function handleError(error, req, res, next) {
  if (error.status >= 400 && error.status < 500) {
    // For example a JSON body that can't be read, or one that is too big.
    return res.status(error.status).json({ error: "The request could not be read." });
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
}
