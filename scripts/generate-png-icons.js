import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + projection * dx), py - (y1 + projection * dy));
}

function writePNG(width, height, isMaskable) {
  // 8-byte PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Generate pixels
  const rawBytesPerRow = width * 4 + 1;
  const rawData = Buffer.alloc(rawBytesPerRow * height);

  const cx = width / 2;
  const cy = height / 2;
  const cornerRadius = isMaskable ? 0 : width * 0.22;
  const segments = [
    [0.33, 0.68, 0.5, 0.305],
    [0.5, 0.305, 0.67, 0.68],
    [0.42, 0.535, 0.58, 0.535],
  ].map(([x1, y1, x2, y2]) => [
    x1 * width,
    y1 * height,
    x2 * width,
    y2 * height,
  ]);
  const lineWidth = width * 0.053;
  const accentStart = [30, 215, 96];
  const accentEnd = [131, 216, 255];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rawBytesPerRow;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pOffset = rowOffset + 1 + x * 4;

      let r = 9;
      let g = 13;
      let b = 19;
      let a = 255;

      // Check if inside squircle/circle (for non-maskable icons)
      if (!isMaskable) {
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        const maxDist = width / 2;
        // Rounded rect check
        const qx = Math.max(0, dx - (maxDist - cornerRadius));
        const qy = Math.max(0, dy - (maxDist - cornerRadius));
        if (Math.hypot(qx, qy) > cornerRadius) {
          a = 0; // transparent outside rounded corner
        }
      }

      if (a > 0) {
        const centerDistance = Math.hypot(x - cx, y - cy) / width;
        const halo = Math.max(0, 1 - centerDistance / 0.53) * 0.16;
        r = Math.round(r + 18 * halo);
        g = Math.round(g + 54 * halo);
        b = Math.round(b + 46 * halo);

        const ringDistance = width * Math.min(
          Math.abs(centerDistance - 0.36),
          Math.abs(centerDistance - 0.295)
        );
        const lineDistance = Math.min(
          ...segments.map((segment) => distanceToSegment(x, y, ...segment))
        );
        const markDistance = Math.min(ringDistance, lineDistance);
        const gradientT = Math.max(0, Math.min(1, x / width));
        const accent = accentStart.map((channel, index) =>
          Math.round(channel + (accentEnd[index] - channel) * gradientT)
        );

        if (markDistance < lineWidth * 1.8) {
          const glowStrength = Math.max(0, 1 - markDistance / (lineWidth * 1.8)) * 0.45;
          r = Math.round(r + (accent[0] - r) * glowStrength);
          g = Math.round(g + (accent[1] - g) * glowStrength);
          b = Math.round(b + (accent[2] - b) * glowStrength);
        }
        if (lineDistance <= lineWidth / 2 || ringDistance <= width * 0.004) {
          [r, g, b] = accent;
          a = 255;
        }

        if (Math.hypot(x - cx, y - height * 0.535) <= width * 0.018) {
          r = 237;
          g = 255;
          b = 248;
          a = 255;
        }
      }

      rawData[pOffset] = r;
      rawData[pOffset + 1] = g;
      rawData[pOffset + 2] = b;
      rawData[pOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, len + 8);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, len + 8);
  return chunk;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), writePNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), writePNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), writePNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), writePNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), writePNG(192, 192, false));
console.log('Successfully generated all PWA & Android app icons in /public!');
