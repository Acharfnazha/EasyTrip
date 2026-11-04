// EasyTrip server: it serves the website and the API, and connects to MySQL.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and fill it in (see server/README.md).');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const siteFolder = path.join(__dirname, '..');

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(cookieParser());

// API
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store'); // Browsers must always ask for fresh account data.
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'This API route does not exist.' });
});

// Website. Only these folders and the .html pages are public. The server code, the
// database files and .env are in the same project, so they must never be served.
['css', 'js', 'assets'].forEach((folder) => {
  app.use(`/${folder}`, express.static(path.join(siteFolder, folder)));
});
app.get(/^\/([a-z0-9-]+\.html)?$/, (req, res, next) => {
  res.sendFile(req.params[0] || 'index.html', { root: siteFolder }, (err) => {
    if (err && !res.headersSent) next();
  });
});
app.use((req, res) => {
  res.status(404).send('<h1>Page not found</h1><p><a href="/">Back to EasyTrip</a></p>');
});

// Errors. The details stay in the server's log and are never sent to the visitor.
app.use((err, req, res, next) => {
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: 'The request could not be read.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

// A clear message for the usual setup problems.
function databaseHelp(err) {
  if (err.code === 'ECONNREFUSED') return 'MySQL is not running, or DB_HOST and DB_PORT in .env are wrong.';
  if (err.code === 'ER_ACCESS_DENIED_ERROR') return 'MySQL refused the login. Check DB_USER and DB_PASSWORD in .env.';
  if (err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
    return 'The database is not set up yet. Run the command in database/README.md.';
  }
  return err.message;
}

async function start() {
  try {
    await db.query('SELECT 1 FROM users LIMIT 1');
  } catch (err) {
    console.error(`Could not connect to the database. ${databaseHelp(err)}`);
    process.exit(1);
  }

  app.listen(PORT, (err) => {
    if (err) {
      console.error(`Could not start on port ${PORT}: ${err.message}`);
      process.exit(1);
    }
    console.log(`EasyTrip is running at http://localhost:${PORT}`);
  });
}

start();
