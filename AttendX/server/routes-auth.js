'use strict';
// Login / logout / session re-lock / password routes + shared middleware.
const express = require('express');
const { db, audit } = require('./db');
const {
  verifyLogin, createSession, destroySession, getSession, touchSession,
  lockSession, isLocked, unlockSession,
} = require('./auth');
const { verifyPassword, hashPassword, genPassword } = require('./crypto');

const r = express.Router();

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
}

function requireSession(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const s = getSession(token);
  if (!s) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  req.session = s;
  req.token = token;
  touchSession(token);
  next();
}

function requireUnlocked(req, res, next) {
  if (isLocked(req.token)) return res.status(423).json({ error: 'Session re-locked. Enter your password to resume.' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user_type !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
  next();
}

r.post('/login', (req, res) => {
  const { identity, password } = req.body || {};
  const reslt = verifyLogin(identity, password, clientIp(req));
  if (!reslt.ok) {
    return res.status(reslt.locked ? 423 : 401).json({
      error: reslt.locked
        ? 'Account locked after 3 wrong password attempts. Contact an admin to unlock.'
        : (reslt.error || 'Invalid ID or password.'),
      locked: !!reslt.locked,
      remaining_attempts: reslt.remaining,
    });
  }
  const token = createSession(reslt);
  audit('LOGIN', reslt.displayId, reslt.role, 'Login success');
  res.json({ token, role: reslt.role, name: reslt.name, id: reslt.displayId });
});

r.post('/logout', requireSession, (req, res) => {
  destroySession(req.token);
  audit('LOGOUT', req.session.display_id, req.session.role, 'Logout');
  res.json({ ok: true });
});

r.get('/session/state', requireSession, (req, res) => {
  res.json({ locked: isLocked(req.token), display_id: req.session.display_id, role: req.session.role, name: req.session.name });
});

// Back-button interception: any back navigation re-locks the session.
r.post('/session/lock', requireSession, (req, res) => {
  lockSession(req.token);
  audit('SESSION_LOCK', req.session.display_id, req.session.role, 'Back-navigation re-lock');
  res.json({ ok: true });
});

r.post('/session/unlock', requireSession, (req, res) => {
  const { password } = req.body || {};
  const store = req.session.user_type === 'EMPLOYEE'
    ? db.prepare('SELECT password_hash, active FROM employees WHERE id=?').get(req.session.ref_id)
    : db.prepare('SELECT password_hash, active FROM admins WHERE id=?').get(req.session.ref_id);
  if (!store || !store.active) return res.status(401).json({ error: 'Account unavailable.' });
  if (!verifyPassword(password, store.password_hash)) {
    return res.status(401).json({ error: 'Wrong password. Re-enter to resume.' });
  }
  unlockSession(req.token);
  audit('SESSION_UNLOCK', req.session.display_id, req.session.role, 'Session resumed');
  res.json({ ok: true });
});

r.post('/account/password', requireSession, requireUnlocked, (req, res) => {
  const { current, next: nextPw } = req.body || {};
  const table = req.session.user_type === 'EMPLOYEE' ? 'employees' : 'admins';
  const store = db.prepare(`SELECT password_hash FROM ${table} WHERE id=?`).get(req.session.ref_id);
  if (!verifyPassword(current, store.password_hash)) return res.status(401).json({ error: 'Current password is wrong.' });
  if (!nextPw || String(nextPw).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  db.prepare(`UPDATE ${table} SET password_hash=? WHERE id=?`).run(hashPassword(nextPw), req.session.ref_id);
  audit('PASSWORD_CHANGE', req.session.display_id, req.session.role, null);
  res.json({ ok: true });
});

r.get('/gen-password', requireSession, requireUnlocked, (req, res) => {
  res.json({ password: genPassword() });
});

module.exports = { router: r, requireSession, requireUnlocked, requireAdmin, clientIp };
