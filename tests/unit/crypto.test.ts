import { describe, expect, it } from "vitest";
import { encrypt, decrypt, sha256 } from "@/lib/crypto/encrypt";
import { hexToBytes, bytesToHex } from "@/lib/utils";

describe("crypto.encrypt / crypto.decrypt", () => {
  it("round-trips a plaintext message", async () => {
    const plaintext = "Hello, world! This is a secret message. ";
    const password = "correct horse battery staple";

    const encrypted = await encrypt({ plaintext, password });
    expect(encrypted.ciphertext).toBeTypeOf("string");
    expect(encrypted.ciphertext.length).toBeGreaterThan(0);
    expect(encrypted.algorithm).toBe("AES-256-GCM");

    const decrypted = await decrypt({
      ciphertext: encrypted.ciphertext,
      password,
    });
    expect(decrypted.plaintext).toBe(plaintext);
  });

  it("produces different ciphertext for identical inputs (random salt and IV)", async () => {
    const a = await encrypt({ plaintext: "same", password: "samepassword" });
    const b = await encrypt({ plaintext: "same", password: "samepassword" });
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("decrypts without any extra options", async () => {
    const encrypted = await encrypt({
      plaintext: "anon length check",
      password: "pw12345678",
    });
    const decrypted = await decrypt({
      ciphertext: encrypted.ciphertext,
      password: "pw12345678",
    });
    expect(decrypted.plaintext).toBe("anon length check");
  });

  it("rejects with a clear error when the password is wrong", async () => {
    const encrypted = await encrypt({ plaintext: "private", password: "rightpw1234" });
    await expect(
      decrypt({ ciphertext: encrypted.ciphertext, password: "wrongpw1234" }),
    ).rejects.toThrowError(/Decryption failed/);
  });

  it("rejects when the ciphertext is too short to be valid", async () => {
    await expect(
      decrypt({ ciphertext: "deadbeef", password: "irrelevant12345" }),
    ).rejects.toThrowError(/Ciphertext bundle is too short/);
  });

  it("decrypts long unicode messages correctly", async () => {
    const plaintext = "日本語🚀 ".repeat(40);
    const encrypted = await encrypt({ plaintext, password: "unicode-pw-1234" });
    const decrypted = await decrypt({
      ciphertext: encrypted.ciphertext,
      password: "unicode-pw-1234",
    });
    expect(decrypted.plaintext).toBe(plaintext);
  });

  it("bundle format is iv (12) + salt (32) + ciphertext", async () => {
    const encrypted = await encrypt({ plaintext: "x", password: "y" });
    const bytes = hexToBytes(encrypted.ciphertext);
    expect(bytes.length).toBeGreaterThan(12 + 32 + 16);
    expect(bytes.length).toBe(12 + 32 + (bytes.length - 44));
  });
});

describe("crypto.sha256", () => {
  it("returns a 64-character hex string", async () => {
    const h = await sha256("Stegabyte");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches known SHA-256 test vector", async () => {
    // sha256("abc") === ba7816bf...
    const h = await sha256("abc");
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("utils.hexToBytes / bytesToHex", () => {
  it("round-trips", () => {
    const original = new Uint8Array([0, 1, 2, 254, 255, 128]);
    const hex = bytesToHex(original as Uint8Array<ArrayBuffer>);
    expect(hex).toBe("000102feff80");
    const back = hexToBytes(hex);
    expect(Array.from(back)).toEqual([0, 1, 2, 254, 255, 128]);
  });

  it("throws on odd-length hex", () => {
    expect(() => hexToBytes("abc")).toThrowError(/odd length/);
  });
});
