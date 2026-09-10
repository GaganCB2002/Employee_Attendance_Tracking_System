'use strict';
// AttendX server entry: Express app, static PWA hosting, API mounting,
// optional TLS, media retention purge, health check.
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const { PORT, DATA_DIR, TLS_CERT, TLS_KEY } = require('./env');
const { db, getSetting, audit } = require('./db');
const { deleteMediaFile } = require('./crypto');

const auth = require('./routes-auth');
const org = require('./routes-org');
const geo = require('./routes-geo');
const employees = require('./routes-employees');
const employee = require('./routes-employee');
const checkpoint = require('./routes-checkpoint');
const admin = require('./routes-admin');
const report = require('./routes-report');
const sysadmin = require('./routes-sysadmin');

const app = express();
app.use(express.json({ limit: '35mb' })); // base64 photo/video payloads

// Basic security headers (TLS handled below; HSTS when https).
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Data-retention purge (default 180 days, configurable).
function purgeRetention() {
  const days = parseInt(getSetting('data_retention_days') || '180', 10);
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const old = db.prepare('SELECT id, media_uuid FROM attendance_records WHERE work_date < ?').all(cutoff);
  for (const rec of old) deleteMediaFile(rec.media_uuid);
  if (old.length) {
    db.prepare('DELETE FROM attendance_records WHERE work_date < ?').run(cutoff);
    audit('RETENTION_PURGE', 'system', null, { purged: old.length, cutoff });
    console.log(`[retention] Purged ${old.length} records older than ${days} days`);
  }
}

app.use('/api/auth', auth.router);
app.use('/api/admin/org', org.router);
app.use('/api/admin/geo', geo.router);
// Also expose checkpoint routes under /org (frontend calls /org/shifts/:id/checkpoints).
app.use('/api/admin/org', geo.router);
app.use('/api/admin/employees', employees.router);
app.use('/api/employee', employee.router);
app.use('/api/employee/cp', checkpoint.router);
app.use('/api/admin', admin.router);
app.use('/api/admin', report.router);
app.use('/api/admin', sysadmin.router);

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'AttendX', time: new Date().toISOString() }));

// Static PWA assets.
const PUBLIC = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC, { maxAge: '1h', setHeaders: (res, p) => {
  if (p.endsWith('sw.js') || p.endsWith('.webmanifest') || p.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache');
  }
} }));

// SPA fallback (but never for API).
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

// Error handler (incl. multer/body errors).
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

function start() {
  purgeRetention();
  setInterval(purgeRetention, 6 * 3600 * 1000).unref();
  const useTls = TLS_CERT && TLS_KEY && fs.existsSync(TLS_CERT) && fs.existsSync(TLS_KEY);
  if (useTls) {
    const opts = { cert: fs.readFileSync(TLS_CERT), key: fs.readFileSync(TLS_KEY) };
    https.createServer(opts, app).listen(PORT, () =>
      console.log(`[AttendX] HTTPS (TLS) ready on https://localhost:${PORT}`));
  } else {
    http.createServer(app).listen(PORT, () => {
      console.log(`[AttendX] HTTP ready on http://localhost:${PORT}`);
      console.log('[AttendX] Tip: enable TLS via .env (TLS_CERT/TLS_KEY) in production.');
    });
  }
}

if (require.main === module) start();
module.exports = { app, start };
