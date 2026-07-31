import { describe, expect, it } from "vitest";
import {
  encodePngLsb,
  decodePngLsb,
  estimatePngEntropy,
  lsbSuspicion,
  histogram,
  lsbCapacity,
} from "@/lib/stego/png-lsb";
import { hexToBytes, bytesToHex } from "@/lib/utils";

function makePixels(
  width: number,
  height: number,
  fill: number[] = [128, 128, 128, 255],
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = fill[0] ?? 0;
    out[i + 1] = fill[1] ?? 0;
    out[i + 2] = fill[2] ?? 0;
    out[i + 3] = fill[3] ?? 0;
  }
  return out;
}

describe("lsbCapacity", () => {
  it("computes floor(numPixels * 3 / 8)", () => {
    expect(lsbCapacity(32, 32)).toBe(Math.floor((32 * 32 * 3) / 8));
    expect(lsbCapacity(8, 8)).toBe(24);
  });
});

describe("encodePngLsb", () => {
  it("encodes a payload and returns capacity info", () => {
    const width = 32;
    const height = 32;
    const pixels = makePixels(width, height, [200, 100, 50, 255]);
    const payload = new TextEncoder().encode("hello world");
    const result = encodePngLsb(pixels, payload.buffer, width, height, payload.length);
    expect(result.capacityTotal).toBe(lsbCapacity(width, height));
    expect(result.capacityUsed).toBe(14 + payload.length);
    expect(result.outPixels.length).toBe(pixels.length);
  });

  it("throws when the payload exceeds capacity", () => {
    const width = 4;
    const height = 4;
    const pixels = makePixels(width, height);
    const payload = new Uint8Array(100);
    expect(() =>
      encodePngLsb(pixels, payload.buffer, width, height, payload.length),
    ).toThrowError(/Payload too large/);
  });

  it("encodes all bits sequentially into R/G/B channels", () => {
    const width = 64;
    const height = 1;
    const pixels = new Uint8Array(width * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 254;
      pixels[i + 1] = 254;
      pixels[i + 2] = 254;
      pixels[i + 3] = 255;
    }
    const payload = new Uint8Array([0xa5, 0x3c, 0xff, 0x12, 0x34, 0x56]); // small payload
    const { outPixels } = encodePngLsb(
      pixels,
      payload.buffer,
      width,
      height,
      payload.length,
    );

    // The encoder writes (14-byte header) + (payload bytes) sequentially.
    // Skip the header bytes when reconstructing.
    const bits: number[] = [];
    for (let p = 0; p < width; p++) {
      for (let ch = 0; ch < 3; ch++) bits.push(outPixels[p * 4 + ch]! & 1);
    }
    const reconstructed: number[] = [];
    for (let i = 0; i < payload.length; i++) {
      let b = 0;
      const base = (14 + i) * 8;
      for (let bi = 0; bi < 8; bi++) b |= bits[base + bi]! << bi;
      reconstructed.push(b);
    }
    expect(reconstructed).toEqual([0xa5, 0x3c, 0xff, 0x12, 0x34, 0x56]);
  });

  it("is reversible: encode + decode recovers the payload bytes", () => {
    const width = 64;
    const height = 64;
    const pixels = makePixels(width, height, [10, 20, 30, 255]);
    const payload = new TextEncoder().encode(
      "the quick brown fox jumps over the lazy dog",
    );
    const { outPixels } = encodePngLsb(
      pixels,
      payload.buffer,
      width,
      height,
      payload.length,
    );
    const decoded = decodePngLsb(outPixels, width, height);
    expect(decoded.header.magic).toBe("CRYX");
    expect(decoded.header.version).toBe(1);
    expect(decoded.header.payloadLength).toBe(payload.length);
    expect(decoded.header.originalLength).toBe(payload.length);
    const bytes = hexToBytes(decoded.payload);
    expect(new TextDecoder().decode(bytes)).toBe(
      "the quick brown fox jumps over the lazy dog",
    );
  });
});

describe("decodePngLsb", () => {
  it("throws when there is no payload (wrong magic)", () => {
    const pixels = makePixels(8, 8);
    expect(() => decodePngLsb(pixels, 8, 8)).toThrowError(/No Stegabyte payload/);
  });

  it("throws on too-small images", () => {
    const pixels = new Uint8Array(2);
    expect(() => decodePngLsb(pixels, 1, 1)).toThrowError(/Image too small/);
  });
});

describe("estimatePngEntropy", () => {
  it("returns 0 for a single repeated value", () => {
    const pixels = makePixels(8, 8, [42, 42, 42, 42]);
    expect(estimatePngEntropy(pixels)).toBe(0);
  });

  it("returns high entropy for random-looking data", () => {
    const pixels = new Uint8Array(4096);
    for (let i = 0; i < pixels.length; i++) pixels[i] = Math.floor(Math.random() * 256);
    const e = estimatePngEntropy(pixels);
    expect(e).toBeGreaterThan(0.9);
  });
});

describe("lsbSuspicion", () => {
  it("is low when half the LSBs are set and half are not", () => {
    const pixels = new Uint8Array(64 * 4);
    let toggle = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = toggle;
      pixels[i + 1] = toggle;
      pixels[i + 2] = toggle;
      pixels[i + 3] = 255;
      toggle = 1 - toggle;
    }
    const s = lsbSuspicion(pixels);
    expect(s).toBeLessThan(0.5);
  });

  it("is high when all LSBs are 0", () => {
    const pixels = new Uint8Array(64 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 254;
      pixels[i + 1] = 254;
      pixels[i + 2] = 254;
      pixels[i + 3] = 255;
    }
    const s = lsbSuspicion(pixels);
    expect(s).toBeGreaterThan(0.5);
  });
});

describe("histogram", () => {
  it("returns 256 buckets", () => {
    expect(histogram(new Uint8Array(1024))).toHaveLength(256);
  });

  it("counts RGB channels but skips alpha", () => {
    const pixels = makePixels(8, 8, [42, 42, 42, 255]);
    const h = histogram(pixels);
    expect(h[42]).toBe(8 * 8 * 3);
    expect(h[255]).toBe(0); // alpha is intentionally not counted
  });
});

describe("hex utilities for stego", () => {
  it("round-trips payload bytes", () => {
    const bytes = new Uint8Array([10, 20, 30, 40]);
    const hex = bytesToHex(bytes as Uint8Array<ArrayBuffer>);
    expect(hex).toBe("0a141e28");
    const back = hexToBytes(hex);
    expect(Array.from(back)).toEqual([10, 20, 30, 40]);
  });
});
