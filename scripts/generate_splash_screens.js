const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0;
    rgbaBuffer.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  const idatChunks = [];
  let width, height;

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const rawRgba = Buffer.alloc(width * height * 4);

  let srcOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcOffset++];
    for (let x = 0; x < width * 4; x++) {
      const b = decompressed[srcOffset++];
      let left = (x >= 4) ? rawRgba[y * width * 4 + x - 4] : 0;
      let up = (y > 0) ? rawRgba[(y - 1) * width * 4 + x] : 0;
      let upLeft = (y > 0 && x >= 4) ? rawRgba[(y - 1) * width * 4 + x - 4] : 0;

      let val = b;
      if (filter === 1) val = (b + left) & 0xff;
      else if (filter === 2) val = (b + up) & 0xff;
      else if (filter === 3) val = (b + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr = upLeft;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = up;
        val = (b + pr) & 0xff;
      }
      rawRgba[y * width * 4 + x] = val;
    }
  }

  return { width, height, data: rawRgba };
}

// Bilinear scale sample
function sampleBilinear(src, srcW, srcH, u, v) {
  const x = u * (srcW - 1);
  const y = v * (srcH - 1);
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = Math.min(x1 + 1, srcW - 1);
  const y2 = Math.min(y1 + 1, srcH - 1);

  const fx = x - x1;
  const fy = y - y1;

  const idx11 = (y1 * srcW + x1) * 4;
  const idx21 = (y1 * srcW + x2) * 4;
  const idx12 = (y2 * srcW + x1) * 4;
  const idx22 = (y2 * srcW + x2) * 4;

  const res = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = src[idx11 + c] * (1 - fx) + src[idx21 + c] * fx;
    const bot = src[idx12 + c] * (1 - fx) + src[idx22 + c] * fx;
    res[c] = Math.round(top * (1 - fy) + bot * fy);
  }
  return res;
}

function createSplash(targetW, targetH, logo, logoScale = 0.35) {
  const canvas = Buffer.alloc(targetW * targetH * 4);
  // Background: #0f131c (15, 19, 28, 255)
  for (let i = 0; i < targetW * targetH; i++) {
    canvas[i * 4] = 15;
    canvas[i * 4 + 1] = 19;
    canvas[i * 4 + 2] = 28;
    canvas[i * 4 + 3] = 255;
  }

  const minDim = Math.min(targetW, targetH);
  const logoTargetSize = Math.max(96, Math.min(512, Math.round(minDim * logoScale)));
  const offsetX = Math.round((targetW - logoTargetSize) / 2);
  const offsetY = Math.round((targetH - logoTargetSize) / 2);

  for (let ly = 0; ly < logoTargetSize; ly++) {
    const cy = offsetY + ly;
    if (cy < 0 || cy >= targetH) continue;
    const v = ly / (logoTargetSize - 1);

    for (let lx = 0; lx < logoTargetSize; lx++) {
      const cx = offsetX + lx;
      if (cx < 0 || cx >= targetW) continue;
      const u = lx / (logoTargetSize - 1);

      const [r, g, b, a] = sampleBilinear(logo.data, logo.width, logo.height, u, v);
      if (a === 0) continue;

      const alpha = a / 255;
      const targetIdx = (cy * targetW + cx) * 4;
      const bgR = canvas[targetIdx];
      const bgG = canvas[targetIdx + 1];
      const bgB = canvas[targetIdx + 2];

      canvas[targetIdx] = Math.round(r * alpha + bgR * (1 - alpha));
      canvas[targetIdx + 1] = Math.round(g * alpha + bgG * (1 - alpha));
      canvas[targetIdx + 2] = Math.round(b * alpha + bgB * (1 - alpha));
      canvas[targetIdx + 3] = 255;
    }
  }

  return encodePng(targetW, targetH, canvas);
}

// Run generation
const rootDir = path.resolve(__dirname, '..');
const iconPath = path.join(rootDir, 'icons', 'icon-512.png');
const logo = decodePng(iconPath);
console.log('Decoded source icon:', logo.width, 'x', logo.height);

const targets = [
  { file: 'android/app/src/main/res/drawable/splash.png', w: 512, h: 512, scale: 0.9 },
  { file: 'android/app/src/main/res/drawable/ic_splash_logo.png', w: 512, h: 512, scale: 0.95 },
  { file: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960, scale: 0.45 },
  { file: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280, scale: 0.45 }
];

targets.forEach(t => {
  const destPath = path.join(rootDir, t.file);
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const png = createSplash(t.w, t.h, logo, t.scale);
  fs.writeFileSync(destPath, png);
  console.log('Generated:', t.file, `(${t.w}x${t.h})`);
});

console.log('All splash screens generated successfully with LedgerFlow branding!');
