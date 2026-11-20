// Adds security headers to every answer (pages, files and the API). They tell the browser what
// this site is allowed to do, so a mistake somewhere else in the code does less harm.

// The Content-Security-Policy: where the pages may load things from.
// - Scripts only from our own files: a script typed into a form field could never run.
// - Styles from our files and Google Fonts. 'unsafe-inline' allows style="" attributes, which
//   index.html uses for the plane animation.
// - Images from our files, plus data: (the empty placeholders) and blob: (the preview of a photo
//   chosen in a form, before it is sent).
// - fetch() only to our own server.
// - The site can't be shown inside a frame on another website (clickjacking).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export function securityHeaders(req, res, next) {
  res.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  // The browser must trust the Content-Type we send and never guess another type for a file.
  res.set("X-Content-Type-Options", "nosniff");
  // The same as frame-ancestors, for older browsers.
  res.set("X-Frame-Options", "DENY");
  // Links to other websites only tell them our address, not which page the visitor was on.
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}
