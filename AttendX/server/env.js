'use strict';
// Loads .env (if present) and exports runtime configuration.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const DATA_DIR = path.isAbsolute(process.env.DATA_DIR || '')
  ? process.env.DATA_DIR
  : path.join(ROOT, process.env.DATA_DIR || 'data');

module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  APP_SECRET: process.env.APP_SECRET || 'attendx-dev-secret-CHANGE-ME',
  DATA_DIR,
  TLS_CERT: process.env.TLS_CERT || '',
  TLS_KEY: process.env.TLS_KEY || '',
};
