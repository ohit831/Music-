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

  // Soundwave bars spec
  const bars = [
    { xOff: -0.28, hFactor: 0.35 },
    { xOff: -0.17, hFactor: 0.65 },
    { xOff: -0.06, hFactor: 0.95 },
    { xOff: 0.05, hFactor: 0.8 },
    { xOff: 0.16, hFactor: 0.5 },
    { xOff: 0.27, hFactor: 0.25 },
  ];
  const barWidth = width * 0.06;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rawBytesPerRow;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pOffset = rowOffset + 1 + x * 4;

      // Base background: Dark luxury indie theme #0f0f14
      let r = 15;
      let g = 15;
      let b = 20;
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
        // Subtle radial vignette
        const distFromCenter = Math.hypot(x - cx, y - cy) / (width * 0.5);
        if (distFromCenter < 1.0) {
          r = Math.min(25, Math.round(r + (1 - distFromCenter) * 8));
          g = Math.min(30, Math.round(g + (1 - distFromCenter) * 12));
          b = Math.min(35, Math.round(b + (1 - distFromCenter) * 12));
        }

        // Draw soundwave bars with #1ed760 Spotify Emerald gradient
        for (const bar of bars) {
          const bx = cx + bar.xOff * width;
          const bh = bar.hFactor * (height * 0.55);
          const by1 = cy - bh / 2;
          const by2 = cy + bh / 2;

          if (x >= bx - barWidth / 2 && x <= bx + barWidth / 2 && y >= by1 && y <= by2) {
            // Gradient: emerald to bright neon green
            const gradT = (y - by1) / bh;
            r = Math.round(5 + gradT * 25);
            g = Math.round(180 + (1 - gradT) * 35);
            b = Math.round(100 - gradT * 40);
            a = 255;
          }
        }

        // Center radio pulse indicator
        const dotDist = Math.hypot(x - (cx - barWidth * 0.5), y - cy);
        if (dotDist <= width * 0.02) {
          r = 255;
          g = 255;
          b = 255;
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
console.log('Successfully generated all PWA & Android app icons in /public!');
