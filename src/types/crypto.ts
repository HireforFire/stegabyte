export type BufferEncoding = "utf-8" | "utf-16" | "utf-16le" | "utf-16be" | "ascii";

export interface EncryptedPayload {
  /** Hex-encoded ciphertext bundle (iv [12] + salt [32] + ciphertext). */
  ciphertext: string;
  /** Algorithm used - informational metadata. */
  algorithm: string;
  /** Approximate timestamp of encryption. */
  timestamp: number;
}

export interface DecryptedPayload {
  plaintext: string;
  algorithm: string;
}

export interface EncryptOptions {
  plaintext: string;
  password: string;
  /** Optional salt string. When omitted, a 32-byte random salt is generated. */
  salt?: string;
  encoding?: BufferEncoding;
}

export interface DecryptOptions {
  /** Hex-encoded ciphertext bundle: iv (12) + salt (32) + ciphertext. */
  ciphertext: string;
  /** Exact password used during encryption. */
  password: string;
  /** Encoding of plaintext. Defaults to utf-8. */
  encoding?: BufferEncoding;
}

export interface HashResult {
  hash: string;
  algorithm: "SHA-256";
}
