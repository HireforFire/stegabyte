/**
 * PNG file detection via 8-byte magic number.
 *
 * The browser's reported MIME type (`file.type === "image/png"`) is unreliable
 * because:
 * - iOS sometimes reports the wrong MIME for HEIC files renamed to .png.
 * - Some browsers report `application/octet-stream` for unknown extensions.
 * - Users can manually rename any file.
 *
 * The PNG signature is fixed at 8 bytes: `89 50 4E 47 0D 0A 1A 0A`.
 * A file with this signature is overwhelmingly likely to be a real PNG.
 * We read raw bytes — platform-independent, no OS heuristics.
 *
 * Beyond the magic, the first PNG chunk is always IHDR, which exposes the
 * image dimensions (bytes 16-23) and pixel format (bytes 24-25). We surface
 * these so callers can reject obviously-unsuitable carriers without
 * attempting a full decode.
 */

/**
 * The 8-byte PNG signature.
 *
 * Exported for tests and for callers that want to do their own comparisons.
 */
export const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * The minimum byte count required to confirm a PNG. We need 8 for the magic
 * and at least another 18 to parse IHDR for dimensions and pixel format
 * (chunk length + "IHDR" tag + width + height + bitDepth + colorType),
 * so 26 bytes covers it.
 */
export const PNG_HEADER_BYTES = 26;

/** Reasons a file can fail PNG validation. */
export type PngValidationReason =
  | "empty" // 0 bytes
  | "truncated" // <8 bytes
  | "wrong-magic"; // first 8 bytes don't match

/**
 * Detailed result of inspecting a (possibly) PNG file.
 */
export interface PngHeader {
  /**
   * Whether the file has the PNG signature.
   * If true, downstream code should still attempt a full parse —
   * truncated IHDR, invalid color types, etc. are encoder-time concerns.
   */
  readonly isPng: boolean;
  /**
   * Set only when `isPng === false`. Explains why in a stable, machine-readable
   * form. UI should map this to a user-friendly message.
   */
  readonly reason?: PngValidationReason;
  /** Image width in pixels, from the IHDR chunk. Undefined if IHDR was unreadable. */
  readonly width?: number;
  /** Image height in pixels. Undefined if IHDR was unreadable. */
  readonly height?: number;
  /** Bit depth per channel (e.g. 8, 16). Undefined if IHDR was unreadable. */
  readonly bitDepth?: number;
  /** PNG color type code (0=gray, 2=RGB, 3=palette, 4=gray+alpha, 6=RGBA). */
  readonly colorType?: number;
}

/**
 * Inspect the first 24 bytes of a file to determine whether it's a PNG and
 * (if so) extract its basic IHDR metadata.
 *
 * Reads a tiny slice of the file — under any modern device this is sub-ms
 * and allocates only a 24-byte buffer. Safe to call on any Blob or File.
 */
export async function readPngHeader(file: Blob): Promise<PngHeader> {
  if (file.size === 0) {
    return { isPng: false, reason: "empty" };
  }
  if (file.size < PNG_MAGIC.length) {
    return { isPng: false, reason: "truncated" };
  }

  // Read the bytes we need. Using `arrayBuffer()` on the whole blob is fine
  // because the caller is responsible for keeping these tiny — we never
  // look beyond the first 24 bytes regardless of file size.
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(PNG_HEADER_BYTES, file.size));

  // Magic check (8 bytes).
  for (let i = 0; i < PNG_MAGIC.length; i += 1) {
    if (bytes[i] !== PNG_MAGIC[i]) {
      return { isPng: false, reason: "wrong-magic" };
    }
  }

  // We confirmed PNG. Try to read IHDR.
  if (bytes.length < PNG_HEADER_BYTES) {
    // Valid PNG but truncated IHDR — return what we know.
    return { isPng: true };
  }

  // IHDR layout (after the 8-byte signature + 8-byte chunk preamble):
  //   bytes 8-11:  chunk length (u32 big-endian) — should be 13
  //   bytes 12-15: "IHDR" tag
  //   bytes 16-19: width (u32 big-endian)
  //   bytes 20-23: height (u32 big-endian)
  //   byte  24:    bit depth
  //   byte  25:    color type
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const bitDepth: number | undefined =
    bytes.length > 24 ? bytes[24] : undefined;
  const colorType: number | undefined =
    bytes.length > 25 ? bytes[25] : undefined;

  return {
    isPng: true,
    width,
    height,
    ...(bitDepth !== undefined ? { bitDepth } : {}),
    ...(colorType !== undefined ? { colorType } : {}),
  };
}

/**
 * Convenience wrapper for the common case of "is this a PNG, yes or no?".
 * Discards the IHDR metadata — use `readPngHeader` if you need dimensions.
 */
export async function isPng(file: Blob): Promise<boolean> {
  const header = await readPngHeader(file);
  return header.isPng;
}
