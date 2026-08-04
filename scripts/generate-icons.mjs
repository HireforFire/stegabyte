/**
 * Generates icon-192.png and icon-512.png for the PWA manifest.
 *
 * Pure-JS PNG encoder (no native deps). The icon is a flat black
 * square with a centered "S" mark in cyan, matching the app theme.
 *
 * Run with: `node scripts/generate-icons.mjs`
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, crc32 } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public");

// Stegabyte brand palette (matches tailwind config)
const BG = [0x00, 0x00, 0x00, 0xff]; // black
const FG = [0x67, 0xe8, 0xf4, 0xff]; // cyan
const FG_DIM = [0x22, 0x55, 0x66, 0xff]; // dimmer cyan for outer ring

/**
 * Render a minimal "S" glyph on a canvas-sized pixel buffer.
 * Uses a block-letter raster pattern so we don't need a font file.
 */
function renderGlyph(size) {
  const px = new Uint8ClampedArray(size * size * 4);
  // Fill background black
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = BG[0];
    px[i * 4 + 1] = BG[1];
    px[i * 4 + 2] = BG[2];
    px[i * 4 + 3] = BG[3];
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;

  // Outer ring (subtle)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(d - radius) < size * 0.012) {
        const idx = (y * size + x) * 4;
        px[idx] = FG_DIM[0];
        px[idx + 1] = FG_DIM[1];
        px[idx + 2] = FG_DIM[2];
        px[idx + 3] = FG_DIM[3];
      }
    }
  }

  // Block "S" glyph — derived from a 7x9 stencil scaled to fit
  const stencil = [
    "..XXXXX",
    ".XX...X",
    "XX.....",
    "XX.....",
    ".XXXXX.",
    ".....XX",
    ".....XX",
    "X...XX.",
    "XXXXX..",
  ];
  const scale = Math.floor(size * 0.62 / 7);
  const sx = Math.floor(cx - (stencil[0].length * scale) / 2);
  const sy = Math.floor(cy - (stencil.length * scale) / 2);
  for (let row = 0; row < stencil.length; row++) {
    for (let col = 0; col < stencil[row].length; col++) {
      if (stencil[row][col] !== "X") continue;
      const x0 = sx + col * scale;
      const y0 = sy + row * scale;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = x0 + dx;
          const y = y0 + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const idx = (y * size + x) * 4;
          px[idx] = FG[0];
          px[idx + 1] = FG[1];
          px[idx + 2] = FG[2];
          px[idx + 3] = FG[3];
        }
      }
    }
  }
  return px;
}

/** Encode RGBA Uint8ClampedArray as PNG. */
function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    for (let x = 0; x < stride; x++) {
      raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x];
    }
  }

  const compressed = deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const rgba = renderGlyph(size);
  const png = encodePng(size, size, rgba);
  const outPath = resolve(OUT_DIR, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}
