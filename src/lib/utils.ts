import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts intelligently.
 * @example cn("px-2 py-2", isActive && "bg-primary")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a byte count as a human-readable string.
 * @param bytes byte count to format
 * @param decimals number of decimal places (default 1)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals)} ${sizes[i]}`;
}

/**
 * Format a number of bits as a human-readable string.
 * @param bits bit count to format
 */
export function formatBits(bits: number): string {
  if (!Number.isFinite(bits) || bits <= 0) return "0 bits";
  if (bits < 1024) return `${bits} bits`;
  return `${(bits / (8 * 1024)).toFixed(2)} KB`;
}

/**
 * Maximum number of bytes `hexToBytes` will decode in a single call.
 * Bounds the work per call to prevent tab freezes from multi-MB hex
 * strings (an attacker can otherwise pin the tab allocating GBs of memory).
 */
export const MAX_HEX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Convert a hexadecimal string to a Uint8Array.
 * @param hex lowercase or uppercase hex string
 */
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/^0x/i, "");
  // DoS guard: cap the input size before allocating the output buffer.
  // 10 MB is generous — Stegabyte's encrypt flow produces ~tens of KB.
  if (clean.length > MAX_HEX_INPUT_BYTES * 2) {
    throw new Error(
      `Hex input too large: ${clean.length} chars (max ${MAX_HEX_INPUT_BYTES * 2}).`,
    );
  }
  if (clean.length % 2 !== 0) throw new Error("Invalid hex string: odd length");
  const out = new Uint8Array(clean.length / 2) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`Invalid hex digit at index ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

/**
 * Convert a Uint8Array to a lowercase hexadecimal string.
 * @param bytes array to encode
 */
export function bytesToHex(bytes: Uint8Array<ArrayBuffer>): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Type guard for a value that is not null/undefined.
 * @param value possibly-null value
 */
export function nonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Run a callback on the next animation frame when supported, else synchronously. */
export function rafSafe(cb: () => void): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => cb());
  } else {
    cb();
  }
}

/** Safely clamp a number within an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
