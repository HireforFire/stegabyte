import type { DecodeResult } from "@/types/stego";
import { bytesToHex } from "@/lib/utils";

const MAGIC = new TextEncoder().encode("CRYX");
const HEADER_VERSION = 1;
/**
 * Header layout (14 bytes):
 *   [0..3]   Magic "CRYX"
 *   [4..5]   Version (uint16 LE)
 *   [6..9]   Payload length (uint32 LE)
 *   [10..13] Original plaintext byte length (uint32 LE) — informational only.
 */
export const HEADER_BYTES = 14;

/** Maximum allowed dimension per side for any decoded image. */
export const MAX_DIMENSION = 16384;

/**
 * Maximum allowed payloadLength in the header, derived from image capacity.
 * Used to prevent OOM when an attacker sets a huge payloadLength.
 */
export const MAX_PAYLOAD_LENGTH_BYTES = MAX_DIMENSION * MAX_DIMENSION * 3; // upper bound

/** Number of histogram buckets (one per byte value). */
const HISTOGRAM_BUCKETS = 256;

/** Log2 of HISTOGRAM_BUCKETS — the upper bound for normalized Shannon entropy. */
const LOG2_BUCKETS = 8;

/** Number of color channels we encode per pixel (R, G, B — alpha is preserved untouched). */
const LSB_CHANNELS_PER_PIXEL = 3;

/** Number of LSB bits written per channel. */
const LSB_BITS_PER_CHANNEL = 1;

/** Expected LSB ratio for a randomly textured image: half of LSBs are 1. */
const EXPECTED_LSB_RATIO = 0.5;

/** Gain factor converting LSB deviation to the 0..1 suspicion score. */
const SUSPICION_GAIN = 3;

/**
 * Compute the byte capacity of an RGBA pixel buffer for LSB encoding.
 * Capacity in bytes = floor(numPixels * 3 / 8).
 */
export function lsbCapacity(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0;
  return Math.floor((width * height * 3) / 8);
}

/**
 * Pure LSB encode. Returns the modified pixel buffer; does not touch the DOM.
 *
 * Encoding format:
 *   [0..3]   Magic "CRYX"
 *   [4..5]   Version (uint16 LE)
 *   [6..9]   Payload length (uint32 LE)
 *   [10..13] Original plaintext byte length (uint32 LE)
 *   [14..]   Payload bytes
 */
export function encodePngLsb(
  pixels: Uint8Array,
  payload: ArrayBuffer,
  width: number,
  height: number,
  originalLength: number,
): { outPixels: Uint8Array; capacityUsed: number; capacityTotal: number } {
  const numPixels = width * height;
  const capacityBytes = lsbCapacity(width, height);

  const payloadBytes = new Uint8Array(payload);

  const header = new ArrayBuffer(HEADER_BYTES);
  const hv = new DataView(header);
  new Uint8Array(header).set(MAGIC, 0);
  hv.setUint16(4, HEADER_VERSION, true);
  hv.setUint32(6, payloadBytes.length, true);
  hv.setUint32(10, originalLength >>> 0, true);

  const totalPayload = new Uint8Array(HEADER_BYTES + payloadBytes.length);
  totalPayload.set(new Uint8Array(header), 0);
  totalPayload.set(payloadBytes, HEADER_BYTES);

  const bytesToEmbed = totalPayload.length;
  if (bytesToEmbed > capacityBytes) {
    throw new Error(
      `Payload too large: ${bytesToEmbed} bytes needed, only ${capacityBytes} available.`,
    );
  }

  const out = new Uint8Array(pixels);
  let bitIdx = 0;
  const totalBits = totalPayload.length * 8;
  for (let p = 0; p < numPixels && bitIdx < totalBits; p++) {
    const offset = p * 4;
    for (let ch = 0; ch < LSB_CHANNELS_PER_PIXEL && bitIdx < totalBits; ch++) {
      const channelOffset = offset + ch;
      const byteIdx = bitIdx >> 3;
      const bitInByte = bitIdx & 7;
      const bit = (totalPayload[byteIdx]! >> bitInByte) & LSB_BITS_PER_CHANNEL;
      out[channelOffset] = (out[channelOffset]! & 0xfe) | bit;
      bitIdx++;
    }
  }

  return {
    outPixels: out,
    capacityUsed: bytesToEmbed,
    capacityTotal: capacityBytes,
  };
}

/**
 * Decode LSB payload from RGBA pixel data. Pure — no DOM access.
 */
export function decodePngLsb(
  pixels: Uint8Array,
  width: number,
  height: number,
): DecodeResult {
  const numPixels = width * height;
  const totalBits = numPixels * 3;

  if (totalBits < HEADER_BYTES * 8) {
    throw new Error("Image too small to contain a payload.");
  }

  const headerBytes = new Uint8Array(HEADER_BYTES);
  for (let i = 0; i < HEADER_BYTES; i++) {
    let b = 0;
    const base = i * 8;
    for (let bi = 0; bi < 8; bi++) {
      const bitIdx = base + bi;
      const p = (bitIdx / 3) | 0;
      const ch = bitIdx % 3;
      const lsb = pixels[p * 4 + ch]! & 1;
      b |= lsb << bi;
    }
    headerBytes[i] = b;
  }

  const magic = String.fromCharCode(...headerBytes.slice(0, 4));
  if (magic !== "CRYX") {
    throw new Error("No Stegabyte payload found in this image.");
  }

  const hv = new DataView(headerBytes.buffer);
  const version = hv.getUint16(4, true);
  const payloadLength = hv.getUint32(6, true);
  const originalLength = hv.getUint32(10, true);

  // DoS guard: reject payloadLength values above the maximum a valid
  // image of MAX_DIMENSION x MAX_DIMENSION could carry. Rejecting the
  // legal maximum itself was the inverted-clamp bug from v1.0; we now
  // reject strictly-greater values.
  if (payloadLength > MAX_PAYLOAD_LENGTH_BYTES) {
    throw new Error("Corrupt header: payload length exceeds reasonable bounds.");
  }

  const neededBits = (HEADER_BYTES + payloadLength) * 8;
  if (neededBits > totalBits) {
    throw new Error("Corrupt header: payload length exceeds available pixel data.");
  }

  const payload = new Uint8Array(payloadLength);
  for (let i = 0; i < payloadLength; i++) {
    let b = 0;
    for (let bi = 0; bi < 8; bi++) {
      const bitIdx = (HEADER_BYTES + i) * 8 + bi;
      const p = (bitIdx / 3) | 0;
      const ch = bitIdx % 3;
      const lsb = pixels[p * 4 + ch]! & 1;
      b |= lsb << bi;
    }
    payload[i] = b;
  }

  return {
    payload: bytesToHex(payload as Uint8Array<ArrayBuffer>),
    header: { magic: "CRYX", version, payloadLength, originalLength },
  };
}

/**
 * Estimate normalized Shannon entropy (0..1) over R,G,B channels only
 * (skipping alpha, which we don't embed into).
 */
export function estimatePngEntropy(pixels: Uint8Array): number {
  const buckets = new Array<number>(HISTOGRAM_BUCKETS).fill(0);
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    for (let ch = 0; ch < LSB_CHANNELS_PER_PIXEL; ch++) {
      buckets[pixels[i + ch]!]!++;
      count++;
    }
  }
  if (count === 0) return 0;
  let entropy = 0;
  for (let i = 0; i < HISTOGRAM_BUCKETS; i++) {
    const p = buckets[i]! / count;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy / LOG2_BUCKETS;
}

/**
 * LSB suspicion metric: how far the R/G/B LSB ratio deviates from 50/50.
 * Returns 0..1 — higher means more anomalous.
 */
export function lsbSuspicion(pixels: Uint8Array): number {
  let lsbOnes = 0;
  let checked = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    for (let ch = 0; ch < LSB_CHANNELS_PER_PIXEL; ch++) {
      lsbOnes += pixels[i + ch]! & LSB_BITS_PER_CHANNEL;
      checked++;
    }
  }
  const ratio = checked > 0 ? lsbOnes / checked : 0;
  const deviation = Math.abs(ratio - EXPECTED_LSB_RATIO);
  return Math.min(1, deviation * SUSPICION_GAIN);
}

/**
 * Build a 256-bin histogram of R,G,B channel byte values (skipping alpha).
 */
export function histogram(pixels: Uint8Array): number[] {
  const buckets = new Array<number>(HISTOGRAM_BUCKETS).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    for (let ch = 0; ch < LSB_CHANNELS_PER_PIXEL; ch++) {
      buckets[pixels[i + ch]!]!++;
    }
  }
  return buckets;
}

/** Magic bytes prefix for PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A. */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Returns true if the buffer begins with the PNG signature. */
export function isPngBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < PNG_MAGIC.length) return false;
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) return false;
  }
  return true;
}
