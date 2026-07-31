import type {
  EncryptOptions,
  DecryptOptions,
  EncryptedPayload,
  DecryptedPayload,
} from "@/types/crypto";
import { bytesToHex, hexToBytes } from "@/lib/utils";

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-512";
const AES_KEY_LENGTH = 256;
const AES_TAG_LENGTH = 128;
const SALT_BYTES = 32;
const IV_BYTES = 12;
const MIN_BUNDLE_BYTES = IV_BYTES + SALT_BYTES + 16; // IV + salt + minimum GCM tag

/**
 * Encrypt plaintext with a user password using AES-256-GCM.
 * Returns a single bundled hex string: [iv | salt | ciphertext].
 */
export async function encrypt(options: EncryptOptions): Promise<EncryptedPayload> {
  const { plaintext, password, salt: saltHex } = options;
  const enc = new TextEncoder();
  const plaintextBuffer = enc.encode(plaintext);

  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: AES_TAG_LENGTH },
    derivedKey,
    plaintextBuffer,
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const bundle = new Uint8Array(IV_BYTES + SALT_BYTES + encryptedBytes.length);
  bundle.set(iv, 0);
  bundle.set(salt, IV_BYTES);
  bundle.set(encryptedBytes, IV_BYTES + SALT_BYTES);

  return {
    ciphertext: bytesToHex(bundle as Uint8Array<ArrayBuffer>),
    algorithm: "AES-256-GCM",
    timestamp: Date.now(),
  };
}

/**
 * Decrypt a previously encrypted ciphertext bundle.
 *
 * Bundle format: iv [0..11], salt [12..43], ciphertext [44..].
 *
 * Integrity is provided exclusively by the AES-GCM 128-bit authentication
 * tag — no separate length check is performed against a stored plaintext
 * length, because storing that length in plaintext would leak metadata and
 * comparing JS string length (UTF-16 code units) to UTF-8 byte length is
 * incorrect for non-ASCII content.
 */
export async function decrypt(options: DecryptOptions): Promise<DecryptedPayload> {
  const { ciphertext, password } = options;
  const enc = new TextEncoder();

  const bundle = hexToBytes(ciphertext);
  if (bundle.length < MIN_BUNDLE_BYTES) {
    throw new Error("Ciphertext bundle is too short to be valid.");
  }

  const iv = bundle.slice(0, IV_BYTES);
  const salt = bundle.slice(IV_BYTES, IV_BYTES + SALT_BYTES);
  const ct = bundle.slice(IV_BYTES + SALT_BYTES);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["decrypt"],
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: AES_TAG_LENGTH },
      derivedKey,
      ct,
    );
    const plaintext = new TextDecoder().decode(decrypted);
    return { plaintext, algorithm: "AES-256-GCM" };
  } catch {
    // Do not include `cause` here: any inner DOMException stays in this scope.
    throw new Error("Decryption failed - incorrect password or corrupted data.");
  }
}

/**
 * Compute a SHA-256 hash of a string. Returns hex digest.
 */
export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = enc.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(hash) as Uint8Array<ArrayBuffer>);
}
