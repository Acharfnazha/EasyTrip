// Middlewares that protect the private routes. Like isAuth in the course, they only call next()
// when the visitor is allowed in. Our pages use fetch, so they answer in JSON instead of redirecting.
import * as User from "../models/user.js";

// Only a logged-in user can go on. The user is read again from the database on every request,
// so a deleted account or a changed role takes effect at once.
export async function isAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please log in first." });
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    // The account was deleted while the user was logged in: end the session.
    return req.session.destroy(() => {
      res.status(401).json({ error: "Please log in first." });
    });
  }

  req.user = user;
  next();
}

// Only an admin can go on. Use it after isAuth, which sets req.user.
export function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can do this." });
  }
  next();
}
