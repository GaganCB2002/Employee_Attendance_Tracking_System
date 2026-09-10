'use strict';
// Generates icons/icon-192.png and icons/icon-512.png (PNG, pure Node via zlib).
// Renders the same design as icons/icon.svg: blue gradient rounded square + white check.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public', 'icons');

function crc32(buf) {
  let table = crc32._t;
  if (!table) {
    table = crc32._t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function renderPng(size) {
  const S = size / 512;
  const rx = 96 * S, stroke = 48 * S;
  const segs = [
    [150 * S, 268 * S, 226 * S, 344 * S],
    [226 * S, 344 * S, 372 * S, 190 * S],
  ];
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const distToSeg = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const cx = x1 + t * dx, cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
  };
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const off = y * (size * 4 + 1) + 1 + x * 4;
      // Rounded-rect membership
      const cxr = Math.max(rx, Math.min(size - rx, x));
      const cyr = Math.max(rx, Math.min(size - rx, y));
      const inside = Math.hypot(x - cxr, y - cyr) <= rx;
      if (!inside) continue;
      // Gradient #1e3a8a -> #2563eb
      const t = (x + y) / (2 * size);
      let r = Math.round(0x1e + (0x25 - 0x1e) * t);
      let g = Math.round(0x3a + (0x63 - 0x3a) * t);
      let b = Math.round(0x8a + (0xeb - 0x8a) * t);
      // Checkmark
      for (const [x1, y1, x2, y2] of segs) {
        if (distToSeg(x + 0.5, y + 0.5, x1, y1, x2, y2) <= stroke / 2) {
          r = g = b = 255;
          break;
        }
      }
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), renderPng(size));
  console.log(`[icons] icon-${size}.png written`);
}
