import type { EncodeResult } from "@/types/stego";
import {
  encodePngLsb as jsEncodePngLsb,
  decodePngLsb as jsDecodePngLsb,
  estimatePngEntropy as jsEstimatePngEntropy,
  lsbSuspicion as jsLsbSuspicion,
  histogram as jsHistogram,
  lsbCapacity as jsLsbCapacity,
  isPngBuffer,
  MAX_DIMENSION,
} from "./png-lsb-core";
import { getWasmSync, loadWasm } from "./wasm-loader";

// ---------------------------------------------------------------------------
// Re-exports (constants + helpers unchanged)
// ---------------------------------------------------------------------------
export {
  encodePngLsb,
  decodePngLsb,
  estimatePngEntropy,
  lsbSuspicion,
  lsbCapacity,
  histogram,
  isPngBuffer,
  HEADER_BYTES,
  MAX_DIMENSION,
} from "./png-lsb-core";

export type { EncodeResult } from "@/types/stego";

// ---------------------------------------------------------------------------
// Internal: synchronous dispatcher. Tries the WASM backend (loaded by
// `loadWasm()` earlier in the lifecycle); otherwise falls back to the pure
// JS core. Triggers a one-time async `loadWasm()` on first miss so subsequent
// calls hit the WASM path.
// ---------------------------------------------------------------------------

interface ImageDataInfo {
  pixels: Uint8Array;
  width: number;
  height: number;
}

/**
 * Read a PNG file buffer into raw RGBA pixels using a Canvas.
 * Browser-only — uses DOM APIs (document, Image, Blob).
 */
export async function readPngPixels(buffer: ArrayBuffer): Promise<ImageDataInfo> {
  if (!isPngBuffer(buffer)) {
    throw new Error("File is not a valid PNG (magic bytes mismatch).");
  }
  const blob = new Blob([buffer], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load PNG image."));
      img.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      throw new Error(
        `Image too large for the browser canvas (${w}x${h}). Max ${MAX_DIMENSION}px per side.`,
      );
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context.");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    return { pixels: new Uint8Array(data.data), width: w, height: h };
  } finally {
    // Revoke the blob URL on every exit path (success, dimension error,
    // canvas error, image decode error). Without this, repeated decode
    // failures leak blob URLs until the browser reclaims them — and
    // browsers cap the total number of live blob URLs per origin.
    URL.revokeObjectURL(url);
  }
}

/**
 * Render an RGBA pixel buffer to a PNG dataUrl using the DOM Canvas API.
 * Browser-only.
 */
export function renderPngDataUrl(
  pixels: Uint8Array,
  width: number,
  height: number,
): string {
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(
      `Image too large for the browser canvas (${width}x${height}). Max ${MAX_DIMENSION}px per side.`,
    );
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context.");
  const imgData = ctx.createImageData(width, height);
  imgData.data.set(pixels);
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Convenience: encode + render in one step (browser only).
 * Uses the WASM backend if loaded; otherwise the JS core.
 */
export function encodeAndRenderPng(
  pixels: Uint8Array,
  payload: ArrayBuffer,
  width: number,
  height: number,
  originalLength: number,
): EncodeResult {
  const mod = getWasmSync();
  let result: { outPixels: Uint8Array; capacityUsed: number; capacityTotal: number };
  if (mod) {
    result = mod.encode(pixels, payload, width, height, originalLength);
  } else {
    // Fire-and-forget: schedule WASM load so the next call is faster.
    // Attach a no-op catch so a load failure doesn't surface as an
    // unhandled promise rejection (no observability in production).
    loadWasm().catch(() => undefined);
    result = jsEncodePngLsb(pixels, payload, width, height, originalLength);
  }
  const dataUrl = renderPngDataUrl(result.outPixels, width, height);
  return {
    dataUrl,
    capacityUsed: result.capacityUsed,
    capacityTotal: result.capacityTotal,
  };
}

/**
 * Analyze a PNG buffer, computing resolution, file size, color depth,
 * entropy, LSB suspicion, histogram, and capacity estimates.
 *
 * WASM is loaded lazily on first invocation; subsequent calls use the
 * WASM-accelerated path.
 */
export async function analyzePng(buffer: ArrayBuffer): Promise<{
  width: number;
  height: number;
  fileSize: number;
  colorDepth: number;
  entropy: number;
  suspicion: number;
  histo: number[];
  capacity: number;
}> {
  const { pixels, width, height } = await readPngPixels(buffer);
  // Ensure WASM is loaded before computing analytics (best-effort).
  await loadWasm();
  const mod = getWasmSync();
  if (mod) {
    return {
      width,
      height,
      fileSize: buffer.byteLength,
      colorDepth: 32,
      entropy: mod.entropy(pixels),
      suspicion: mod.lsbSuspicion(pixels),
      histo: mod.histogram(pixels),
      capacity: mod.lsbCapacity(width, height),
    };
  }
  return {
    width,
    height,
    fileSize: buffer.byteLength,
    colorDepth: 32,
    entropy: jsEstimatePngEntropy(pixels),
    suspicion: jsLsbSuspicion(pixels),
    histo: jsHistogram(pixels),
    capacity: jsLsbCapacity(width, height),
  };
}

/**
 * Synchronous LSB decode. Tries the WASM backend (loaded by `loadWasm()`
 * earlier in the lifecycle); otherwise falls back to the pure JS core.
 *
 * On the very first call after page mount (before WASM has finished loading),
 * this synchronously uses the JS core AND kicks off async `loadWasm()` so
 * subsequent calls hit the WASM path. There is no perceptible delay because
 * the JS fallback is already fast.
 */
export function decodePngLsbOrSync(
  pixels: Uint8Array,
  width: number,
  height: number,
): ReturnType<typeof jsDecodePngLsb> {
  const mod = getWasmSync();
  if (mod) return mod.decode(pixels, width, height);
  loadWasm().catch(() => undefined);
  return jsDecodePngLsb(pixels, width, height);
}
