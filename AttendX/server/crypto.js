'use strict';
// Crypto helpers: password hashing (scrypt), session tokens, and
// AES-256-GCM at-rest encryption for photo/video media files.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { APP_SECRET, DATA_DIR } = require('./env');

const MEDIA_DIR = path.join(DATA_DIR, 'media');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `s1$${salt}$${hash}`;
}

function verifyPassword(pw, stored) {
  try {
    const [, salt, hash] = String(stored).split('$');
    const test = crypto.scryptSync(String(pw), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch (e) {
    return false;
  }
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Human-friendly auto-generated password (no ambiguous chars)
function genPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = 'Ax';
  for (let i = 0; i < 8; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out + '#1';
}

// ---- Media at-rest encryption (AES-256-GCM) ----
const MEDIA_KEY = crypto.scryptSync(APP_SECRET, 'attendx-media-v1', 32);

function encryptBuffer(buf) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', MEDIA_KEY, iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]);
}

function decryptBuffer(box) {
  const iv = box.subarray(0, 12);
  const tag = box.subarray(12, 28);
  const data = box.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', MEDIA_KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]);
}

function writeEncrypted(uuid, buf) {
  fs.writeFileSync(path.join(MEDIA_DIR, uuid + '.bin'), encryptBuffer(buf));
}

function readEncrypted(uuid) {
  return decryptBuffer(fs.readFileSync(path.join(MEDIA_DIR, uuid + '.bin')));
}

function deleteMediaFile(uuid) {
  try { fs.unlinkSync(path.join(MEDIA_DIR, uuid + '.bin')); } catch (e) { /* ignore */ }
}

module.exports = {
  hashPassword, verifyPassword, newToken, genPassword,
  encryptBuffer, decryptBuffer, writeEncrypted, readEncrypted, deleteMediaFile, MEDIA_DIR,
};
