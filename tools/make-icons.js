// Erzeugt die PNG-Icons (Kettlebell-Motiv) ohne externe Abhängigkeiten.
// Aufruf: node tools/make-icons.js
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const cd = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cd), 0);
  return Buffer.concat([len, cd, crc]);
}
function png(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const BG = [21, 25, 28], ACCENT = [255, 122, 69], DARK = [196, 65, 15];

// Kettlebell in Koordinaten 0..1; scale < 1 verkleinert zur Mitte (für "maskable")
function shade(x, y, scale) {
  x = 0.5 + (x - 0.5) / scale; y = 0.5 + (y - 0.5) / scale;
  const d = (cx, cy) => Math.hypot(x - cx, y - cy);
  // Körper: Kreis, unten abgeflacht
  if (d(0.5, 0.6) < 0.25 && y < 0.81) {
    // Streifen als Akzent
    if (y > 0.6 && y < 0.66) return DARK;
    return ACCENT;
  }
  // Griff: Ring über dem Körper
  const r = d(0.5, 0.37);
  if (r < 0.18 && r > 0.105 && y < 0.5) return ACCENT;
  return null;
}

function draw(size, scale, rounded) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4; // Supersampling für glatte Kanten
  const rad = rounded ? 0.18 : 0;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const x = (px + (sx + 0.5) / SS) / size, y = (py + (sy + 0.5) / SS) / size;
      // abgerundete Ecken nur bei "any"-Icons
      if (rad) {
        const qx = Math.max(rad - x, 0, x - (1 - rad)), qy = Math.max(rad - y, 0, y - (1 - rad));
        if (Math.hypot(qx, qy) > rad) continue;
      }
      const c = shade(x, y, scale) || BG;
      r += c[0]; g += c[1]; b += c[2]; a += 255;
    }
    const n = SS * SS, i = (py * size + px) * 4;
    if (a) { const k = a / 255; buf[i] = r / k; buf[i + 1] = g / k; buf[i + 2] = b / k; }
    buf[i + 3] = a / n;
  }
  return buf;
}

const dir = path.join(__dirname, "..", "icons");
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
const out = [
  ["icon-192.png", 192, 1, true],
  ["icon-512.png", 512, 1, true],
  ["icon-maskable-512.png", 512, 0.8, false], // Motiv in der sicheren Zone, Fläche randlos
  ["apple-touch-icon.png", 180, 0.9, false]   // iOS rundet selbst ab, keine Transparenz
];
for (const [name, size, scale, rounded] of out) {
  fs.writeFileSync(path.join(dir, name), png(size, draw(size, scale, rounded)));
  console.log(name);
}
console.log("Icons erzeugt.");
