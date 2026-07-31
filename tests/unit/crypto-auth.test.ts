import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto/encrypt";
import { hexToBytes, bytesToHex } from "@/lib/utils";

describe("crypto: AES-GCM authentication", () => {
  it("rejects when a ciphertext byte is tampered", async () => {
    const { ciphertext } = await encrypt({
      plaintext: "auth-tamper-ct-test",
      password: "longpassword-123",
    });
    const bytes = hexToBytes(ciphertext);
    // Flip a byte deep in the ciphertext body (after IV + salt + tag).
    bytes[60] = (bytes[60]! ^ 0x01) & 0xff;
    await expect(
      decrypt({ ciphertext: bytesToHex(bytes), password: "longpassword-123" }),
    ).rejects.toThrow();
  });

  it("rejects when the salt is tampered", async () => {
    const { ciphertext } = await encrypt({
      plaintext: "salt-tamper-test",
      password: "longpassword-456",
    });
    const bytes = hexToBytes(ciphertext);
    // Salt occupies bytes [12..43]; flip a byte inside that range.
    bytes[20] = (bytes[20]! ^ 0x80) & 0xff;
    await expect(
      decrypt({ ciphertext: bytesToHex(bytes), password: "longpassword-456" }),
    ).rejects.toThrow();
  });

  it("rejects when the IV is tampered", async () => {
    const { ciphertext } = await encrypt({
      plaintext: "iv-tamper-test",
      password: "longpassword-789",
    });
    const bytes = hexToBytes(ciphertext);
    bytes[3] = (bytes[3]! ^ 0x55) & 0xff;
    await expect(
      decrypt({ ciphertext: bytesToHex(bytes), password: "longpassword-789" }),
    ).rejects.toThrow();
  });

  it("uses 600 000 PBKDF2 iterations and SHA-512 hash", async () => {
    const calls: unknown[] = [];
    const orig = crypto.subtle.deriveKey.bind(crypto.subtle);
    crypto.subtle.deriveKey = ((
      algorithm: Pbkdf2Params,
      baseKey: CryptoKey,
      derivedKeyAlgorithm: AlgorithmIdentifier | AesDerivedKeyParams,
      extractable: boolean,
      keyUsages: ReadonlyArray<KeyUsage>,
    ) => {
      calls.push({ algorithm, keyUsages });
      return orig(algorithm, baseKey, derivedKeyAlgorithm, extractable, keyUsages);
    }) as typeof crypto.subtle.deriveKey;

    try {
      await encrypt({ plaintext: "x", password: "y" });
      expect(calls.length).toBeGreaterThan(0);
      const params = (calls[0] as { algorithm: Pbkdf2Params }).algorithm;
      expect(params.iterations).toBe(600_000);
      expect(params.hash).toBe("SHA-512");
    } finally {
      crypto.subtle.deriveKey = orig;
    }
  });

  it("round-trips with a caller-supplied salt", async () => {
    const saltBytes = crypto.getRandomValues(new Uint8Array(32));
    const saltHex = bytesToHex(saltBytes);
    const enc = await encrypt({
      plaintext: "supplied-salt",
      password: "longpassword-aaa",
      salt: saltHex,
    });
    const dec = await decrypt({
      ciphertext: enc.ciphertext,
      password: "longpassword-aaa",
    });
    expect(dec.plaintext).toBe("supplied-salt");
  });

  it("encrypts and decrypts empty plaintext", async () => {
    const enc = await encrypt({ plaintext: "", password: "longpassword-bbb" });
    const dec = await decrypt({
      ciphertext: enc.ciphertext,
      password: "longpassword-bbb",
    });
    expect(dec.plaintext).toBe("");
  });

  it("produces identical ciphertext structure regardless of caller-supplied salt", async () => {
    const saltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    const a = await encrypt({
      plaintext: "same-message",
      password: "longpassword-ccc",
      salt: saltHex,
    });
    const b = await encrypt({
      plaintext: "same-message",
      password: "longpassword-ccc",
      salt: saltHex,
    });
    // Same salt → different IVs → different ciphertexts (still both decryptable).
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(
      (await decrypt({ ciphertext: a.ciphertext, password: "longpassword-ccc" }))
        .plaintext,
    ).toBe("same-message");
    expect(
      (await decrypt({ ciphertext: b.ciphertext, password: "longpassword-ccc" }))
        .plaintext,
    ).toBe("same-message");
  });
});
