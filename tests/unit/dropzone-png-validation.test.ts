// @vitest-environment node
/**
 * Pure unit tests for the PNG magic-byte sniffer.
 *
 * Uses Node's Blob / Uint8Array — no DOM, no browser API mocking. These
 * tests verify the bytes-in / object-out contract of `readPngHeader`.
 */
import { describe, it, expect } from "vitest";
import { readPngHeader, isPng, PNG_MAGIC, PNG_HEADER_BYTES } from "@/lib/files/png-sniffer";

function bytesToBlob(bytes: number[]): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

/**
 * Builds a synthetic valid PNG with a 32×32 IHDR so we can verify that the
 * dimension extraction actually works. The body after the IHDR is dummy
 * bytes — `readPngHeader` doesn't decode further than IHDR.
 */
function syntheticPng(width = 32, height = 32, bitDepth = 8, colorType = 6): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdrLen = [0x00, 0x00, 0x00, 0x0d]; // 13 bytes (IHDR payload length)
  const ihdrTag = [0x49, 0x48, 0x44, 0x52]; // "IHDR"
  // Width (big-endian u32)
  const w = [(width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff];
  // Height
  const h = [(height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff];
  const rest = [bitDepth, colorType, 0x00, 0x00, 0x00]; // bit depth, color type, compression, filter, interlace
  return new Uint8Array([...sig, ...ihdrLen, ...ihdrTag, ...w, ...h, ...rest]);
}

describe("PNG_MAGIC constant", () => {
  it("is exactly the 8-byte PNG signature", () => {
    expect(PNG_MAGIC).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(PNG_MAGIC.length).toBe(8);
  });
});

describe("PNG_HEADER_BYTES constant", () => {
  it("is 26 — enough to cover magic + chunk preamble + width + height + bitDepth + colorType", () => {
    expect(PNG_HEADER_BYTES).toBe(26);
  });
});

describe("readPngHeader", () => {
  it("rejects an empty file with reason='empty'", async () => {
    const blob = bytesToBlob([]);
    const header = await readPngHeader(blob);
    expect(header.isPng).toBe(false);
    expect(header.reason).toBe("empty");
  });

  it("rejects a file shorter than the magic with reason='truncated'", async () => {
    const blob = bytesToBlob([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]); // 6 bytes
    const header = await readPngHeader(blob);
    expect(header.isPng).toBe(false);
    expect(header.reason).toBe("truncated");
  });

  it("rejects a JPEG with reason='wrong-magic'", async () => {
    // JPEG starts with FF D8 FF E0.
    const jpeg = bytesToBlob([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const header = await readPngHeader(jpeg);
    expect(header.isPng).toBe(false);
    expect(header.reason).toBe("wrong-magic");
  });

  it("rejects a WebP file with reason='wrong-magic'", async () => {
    // "RIFF????WEBP" — the magic fails on byte 0.
    const webp = bytesToBlob([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const header = await readPngHeader(webp);
    expect(header.isPng).toBe(false);
    expect(header.reason).toBe("wrong-magic");
  });

  it("rejects a HEIC file with reason='wrong-magic'", async () => {
    // ftyp box with heic brand.
    const heic = bytesToBlob([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
    const header = await readPngHeader(heic);
    expect(header.isPng).toBe(false);
    expect(header.reason).toBe("wrong-magic");
  });

  it("accepts a synthetic PNG and parses dimensions correctly", async () => {
    const png = syntheticPng(64, 48, 8, 6);
    const blob = new Blob([png]);
    const header = await readPngHeader(blob);
    expect(header.isPng).toBe(true);
    expect(header.width).toBe(64);
    expect(header.height).toBe(48);
    expect(header.bitDepth).toBe(8);
    expect(header.colorType).toBe(6); // RGBA
  });

  it("returns isPng=true with no dims for a PNG magic but truncated IHDR", async () => {
    // Valid magic (8 bytes) + just the 4-byte chunk length — IHDR is incomplete.
    const partial = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const header = await readPngHeader(new Blob([partial]));
    expect(header.isPng).toBe(true);
    expect(header.width).toBeUndefined();
    expect(header.height).toBeUndefined();
  });
});

describe("isPng", () => {
  it("returns true for a synthetic PNG", async () => {
    const png = syntheticPng(16, 16);
    expect(await isPng(new Blob([png]))).toBe(true);
  });

  it("returns false for a JPEG", async () => {
    const jpeg = bytesToBlob([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    expect(await isPng(jpeg)).toBe(false);
  });

  it("returns false for empty input", async () => {
    expect(await isPng(bytesToBlob([]))).toBe(false);
  });
});
