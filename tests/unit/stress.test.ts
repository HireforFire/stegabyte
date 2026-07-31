import { describe, expect, it } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto/encrypt";
import {
  encodePngLsb,
  decodePngLsb,
  estimatePngEntropy,
  histogram,
  lsbCapacity,
} from "@/lib/stego/png-lsb-core";

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

describe("stress: crypto edge cases", () => {
  it("encrypts and decrypts a 1-character message", async () => {
    const enc = await encrypt({ plaintext: "x", password: "pw12345678" });
    const dec = await decrypt({ ciphertext: enc.ciphertext, password: "pw12345678" });
    expect(dec.plaintext).toBe("x");
  });

  it("encrypts and decrypts a large 10 000-character ASCII message", async () => {
    const plaintext = "A".repeat(10_000);
    const enc = await encrypt({ plaintext, password: "pw12345678" });
    const dec = await decrypt({ ciphertext: enc.ciphertext, password: "pw12345678" });
    expect(dec.plaintext).toBe(plaintext);
  });

  it("encrypts and decrypts with a non-ASCII password (emoji)", async () => {
    const enc = await encrypt({ plaintext: "secret", password: "🔐-password-🚀" });
    const dec = await decrypt({ ciphertext: enc.ciphertext, password: "🔐-password-🚀" });
    expect(dec.plaintext).toBe("secret");
  });

  it("encrypts and decrypts with a Japanese password", async () => {
    const enc = await encrypt({ plaintext: "secret", password: "パスワード" });
    const dec = await decrypt({ ciphertext: enc.ciphertext, password: "パスワード" });
    expect(dec.plaintext).toBe("secret");
  });

  it("rejects corrupted ciphertext (truncated)", async () => {
    const enc = await encrypt({ plaintext: "hello", password: "right-pw-1" });
    const truncated = enc.ciphertext.slice(0, -20);
    await expect(
      decrypt({ ciphertext: truncated, password: "right-pw-1" }),
    ).rejects.toThrow();
  });

  it("rejects when the IV is tampered (1-byte flip)", async () => {
    const enc = await encrypt({ plaintext: "hello", password: "right-pw-1" });
    // Flip the first byte of the IV (first 2 hex chars).
    const tampered = "00" + enc.ciphertext.slice(2);
    await expect(
      decrypt({ ciphertext: tampered, password: "right-pw-1" }),
    ).rejects.toThrow();
  });

  it("rejects empty ciphertext", async () => {
    await expect(decrypt({ ciphertext: "", password: "pw" })).rejects.toThrow(
      /too short/,
    );
  });

  it("rejects valid hex that is too short", async () => {
    await expect(decrypt({ ciphertext: "aabb", password: "pw" })).rejects.toThrow(
      /too short/,
    );
  });

  it("bundle format: hex length = (12 + 32 + ct_len) * 2", async () => {
    const plaintext = "this is the message";
    const enc = await encrypt({ plaintext, password: "pw12345678" });
    // ct = plaintext bytes + 16-byte GCM tag
    const expectedBytes = 12 + 32 + new TextEncoder().encode(plaintext).length + 16;
    expect(enc.ciphertext.length / 2).toBe(expectedBytes);
  });

  it("encrypted plaintext is not visible in the ciphertext (random-looking bytes)", async () => {
    const enc = await encrypt({ plaintext: "this is the message", password: "pw" });
    expect(enc.ciphertext.toLowerCase()).not.toContain("746869"); // hex of "thi"
    expect(enc.ciphertext.toLowerCase()).not.toContain("74686973206973");
  });
});

describe("stress: stego edge cases", () => {
  it("encodePngLsb handles a 1-byte payload", () => {
    const width = 64;
    const height = 64;
    const pixels = makePixels(width, height);
    const payload = new Uint8Array([0x42]);
    const { outPixels } = encodePngLsb(pixels, payload.buffer, width, height, 1);
    const decoded = decodePngLsb(outPixels, width, height);
    expect(decoded.header.payloadLength).toBe(1);
  });

  it("encodePngLsb handles capacity exactly equal to header (14 bytes)", () => {
    // 3 channels * 1 byte = 3 bits per pixel. Need ceil(14*8/3) = 38 pixels.
    // 8*5 = 40 pixels = 120 bits = 15 bytes capacity.
    const width = 40;
    const height = 1;
    const pixels = makePixels(width, height);
    const payload = new Uint8Array(1);
    expect(() => encodePngLsb(pixels, payload.buffer, width, height, 1)).not.toThrow();
  });

  it("encodePngLsb throws when payload exceeds capacity", () => {
    const width = 8;
    const height = 8;
    const pixels = makePixels(width, height);
    const cap = lsbCapacity(width, height);
    const payload = new Uint8Array(cap + 1);
    expect(() =>
      encodePngLsb(pixels, payload.buffer, width, height, payload.length),
    ).toThrow(/Payload too large/);
  });

  it("decodePngLsb throws on uniform color image (no payload)", () => {
    const width = 32;
    const height = 32;
    const pixels = makePixels(width, height, [42, 42, 42, 42]);
    expect(() => decodePngLsb(pixels, width, height)).toThrow(/No Stegabyte payload/);
  });

  it("decodePngLsb throws on too-small image", () => {
    const pixels = new Uint8Array(2);
    expect(() => decodePngLsb(pixels, 1, 1)).toThrow(/Image too small/);
  });

  it("histogram returns 256 buckets summing to total RGB byte count", () => {
    const pixels = makePixels(10, 10, [10, 20, 30, 255]);
    const h = histogram(pixels);
    expect(h).toHaveLength(256);
    expect(h.reduce((a, b) => a + b, 0)).toBe(10 * 10 * 3);
  });

  it("estimatePngEntropy of all-zeros = 0", () => {
    const pixels = new Uint8Array(1024); // all 0
    expect(estimatePngEntropy(pixels)).toBe(0);
  });

  it("estimatePngEntropy of random data close to 1", () => {
    const pixels = new Uint8Array(8192);
    for (let i = 0; i < pixels.length; i++) pixels[i] = Math.floor(Math.random() * 256);
    const e = estimatePngEntropy(pixels);
    expect(e).toBeGreaterThan(0.95);
    expect(e).toBeLessThanOrEqual(1);
  });
});

describe("stress: end-to-end encrypt + stego + decrypt pipeline", () => {
  it("round-trips through the full pipeline with a synthetic RGBA buffer", async () => {
    const width = 128;
    const height = 128;
    const pixels = makePixels(width, height, [200, 100, 50, 255]);
    const plaintext = "Stegabyte end-to-end pipeline stress test 🚀";
    const password = "stress-test-password-1";

    // Step 1: encrypt.
    const encrypted = await encrypt({ plaintext, password });
    // Step 2: hex-decode the bundle into a Uint8Array.
    const hex = encrypted.ciphertext;
    const payloadBytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < payloadBytes.length; i++) {
      payloadBytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    // Step 3: embed into pixels.
    const { outPixels } = encodePngLsb(
      pixels,
      payloadBytes.buffer,
      width,
      height,
      new TextEncoder().encode(plaintext).length,
    );
    // Step 4: decode from the modified pixels.
    const decoded = decodePngLsb(outPixels, width, height);
    // Step 5: decrypt.
    const decrypted = await decrypt({ ciphertext: decoded.payload, password });
    expect(decrypted.plaintext).toBe(plaintext);
  });
});
