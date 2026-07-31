import { describe, expect, it } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto/encrypt";
import {
  encodePngLsb,
  decodePngLsb,
  isPngBuffer,
  MAX_PAYLOAD_LENGTH_BYTES,
} from "@/lib/stego/png-lsb-core";

/** Build a synthetic RGBA pixel buffer. */
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

describe("regression: CRIT-1 unicode plaintext", () => {
  it("round-trips a Chinese plaintext (UTF-8 vs UTF-16 mismatch)", async () => {
    const plaintext = "中文加密测试 🔒 — Stegabyte";
    const password = "test-password-1";
    const encrypted = await encrypt({ plaintext, password });
    const decrypted = await decrypt({ ciphertext: encrypted.ciphertext, password });
    expect(decrypted.plaintext).toBe(plaintext);
  });

  it("round-trips an emoji-heavy plaintext (4-byte UTF-8 chars)", async () => {
    const plaintext = "🎉🚀💎🔥🌟 secret message 🎉🚀💎🔥🌟";
    const password = "test-password-2";
    const encrypted = await encrypt({ plaintext, password });
    const decrypted = await decrypt({ ciphertext: encrypted.ciphertext, password });
    expect(decrypted.plaintext).toBe(plaintext);
  });

  it("round-trips a 100 000-character ASCII message", async () => {
    const plaintext = "A".repeat(100_000);
    const password = "test-password-3";
    const encrypted = await encrypt({ plaintext, password });
    const decrypted = await decrypt({ ciphertext: encrypted.ciphertext, password });
    expect(decrypted.plaintext).toBe(plaintext);
  });

  it("encrypts the same message multiple times — all ciphertexts are unique (no salt/IV reuse)", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const { ciphertext } = await encrypt({
        plaintext: "same message",
        password: "samepw",
      });
      seen.add(ciphertext);
    }
    expect(seen.size).toBe(10);
  });

  it("decrypts a corrupted ciphertext (truncated by 5 bytes) — throws", async () => {
    const encrypted = await encrypt({ plaintext: "hello", password: "pw-1" });
    const truncated = encrypted.ciphertext.slice(0, -10);
    await expect(decrypt({ ciphertext: truncated, password: "pw-1" })).rejects.toThrow();
  });

  it("decrypts with empty ciphertext — throws", async () => {
    await expect(decrypt({ ciphertext: "", password: "pw-1" })).rejects.toThrow(
      /too short/,
    );
  });

  it("decrypts with ciphertext too short to be valid — throws", async () => {
    await expect(decrypt({ ciphertext: "deadbeef", password: "pw-1" })).rejects.toThrow(
      /too short/,
    );
  });

  it("EncryptedPayload no longer exposes originalLength", async () => {
    const encrypted = await encrypt({ plaintext: "x", password: "pw" });
    expect((encrypted as Record<string, unknown>).originalLength).toBeUndefined();
  });
});

describe("regression: M-5 DoS hardening on decodePngLsb", () => {
  it("rejects payloadLength greater than MAX_PAYLOAD_LENGTH_BYTES", () => {
    // Build a fake RGBA buffer large enough to read the header but with a huge payloadLength.
    const width = 64;
    const height = 64;
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 254;
      pixels[i + 1] = 254;
      pixels[i + 2] = 254;
      pixels[i + 3] = 255;
    }
    // Embed a payload with an over-large payloadLength claim.
    const huge = new Uint8Array(28); // 14-byte header + 14-byte payload
    huge.set(new TextEncoder().encode("CRYX"), 0);
    const hv = new DataView(huge.buffer);
    hv.setUint16(4, 1, true);
    hv.setUint32(6, MAX_PAYLOAD_LENGTH_BYTES + 1, true);
    hv.setUint32(10, 0, true);
    // LSB-write the header to the pixels.
    let bitIdx = 0;
    const totalBits = huge.length * 8;
    for (let p = 0; p < width * height && bitIdx < totalBits; p++) {
      const offset = p * 4;
      for (let ch = 0; ch < 3 && bitIdx < totalBits; ch++) {
        const byteIdx = bitIdx >> 3;
        const bitInByte = bitIdx & 7;
        const bit = (huge[byteIdx]! >> bitInByte) & 1;
        pixels[offset + ch] = (pixels[offset + ch]! & 0xfe) | bit;
        bitIdx++;
      }
    }
    expect(() => decodePngLsb(pixels, width, height)).toThrow(
      /Corrupt header|exceeds available pixel data|reasonable bounds/,
    );
  });
});

describe("regression: M-6 PNG magic byte validation", () => {
  it("isPngBuffer returns true for a valid PNG signature", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(isPngBuffer(png)).toBe(true);
  });

  it("isPngBuffer returns false for a JPEG signature", () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(isPngBuffer(jpg)).toBe(false);
  });

  it("isPngBuffer returns false for a PDF signature", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(isPngBuffer(pdf)).toBe(false);
  });

  it("isPngBuffer returns false for too-short buffers", () => {
    expect(isPngBuffer(new Uint8Array([]))).toBe(false);
    expect(isPngBuffer(new Uint8Array([0x89, 0x50, 0x4e]))).toBe(false);
  });
});

describe("regression: stego round-trip with realistic sizes", () => {
  it("encode+decode round-trip preserves arbitrary bytes", () => {
    const width = 128;
    const height = 128;
    const pixels = makePixels(width, height, [200, 100, 50, 255]);
    const payload = new Uint8Array(500);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;

    const { outPixels } = encodePngLsb(
      pixels,
      payload.buffer,
      width,
      height,
      payload.length,
    );
    const decoded = decodePngLsb(outPixels, width, height);

    expect(decoded.header.magic).toBe("CRYX");
    expect(decoded.header.payloadLength).toBe(payload.length);

    const bytes = new Uint8Array(decoded.payload.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(decoded.payload.slice(i * 2, i * 2 + 2), 16);
    }
    expect(Array.from(bytes)).toEqual(Array.from(payload));
  });
});
