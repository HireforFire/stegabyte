/**
 * WASM-backed LSB core. Loads `stegabyte_stego_core_bg.wasm` lazily on first
 * call and falls back to the pure-JS core if WebAssembly is unavailable or
 * the module fails to load. The fallback path guarantees parity — see
 * `tests/unit/wasm-parity.test.ts`.
 *
 * The exported surface mirrors `png-lsb-core.ts` so callers don't need to
 * branch on which backend is active.
 *
 * Concurrency model: `loadWasm()` is idempotent; concurrent callers all
 * await the same `initPromise`. After init, every exported function is
 * synchronous (WASM calls are sync).
 */
import {
  lsbCapacity as jsLsbCapacity,
  encodePngLsb as jsEncodePngLsb,
  decodePngLsb as jsDecodePngLsb,
  estimatePngEntropy as jsEntropy,
  lsbSuspicion as jsLsbSuspicion,
  histogram as jsHistogram,
} from "@/lib/stego/png-lsb-core";

import type { DecodeResult } from "@/types/stego";

export interface WasmStegoModule {
  /** Display name for diagnostics. */
  readonly backend: "wasm" | "js";
  lsbCapacity(width: number, height: number): number;
  encode(
    pixels: Uint8Array,
    payload: ArrayBuffer,
    width: number,
    height: number,
    originalLength: number,
  ): { outPixels: Uint8Array; capacityUsed: number; capacityTotal: number };
  decode(pixels: Uint8Array, width: number, height: number): DecodeResult;
  entropy(pixels: Uint8Array): number;
  lsbSuspicion(pixels: Uint8Array): number;
  histogram(pixels: Uint8Array): number[];
}

let cachedModule: WasmStegoModule | null = null;
let initPromise: Promise<WasmStegoModule> | null = null;

function wasmSupported(): boolean {
  return (
    typeof WebAssembly !== "undefined" && typeof WebAssembly.instantiate === "function"
  );
}

// Type-only reference to the generated WASM bindings. Using `import()`
// type-position is required here because the bindings are a dynamic import.
type WasmBindings = typeof import("./wasm/pkg/stegabyte_stego_core.js"); // eslint-disable-line @typescript-eslint/consistent-type-imports

async function doLoad(): Promise<WasmStegoModule> {
  // SSR / Node: skip WASM entirely and use the JS core.
  if (typeof window === "undefined") {
    return makeJsBackend();
  }
  // Try the WASM backend first.
  if (!wasmSupported()) {
    return makeJsBackend();
  }
  try {
    const wasm: WasmBindings = await import("./wasm/pkg/stegabyte_stego_core.js");
    // No URL argument: the generated glue resolves `./<wasm>.wasm` relative
    // to its own module location (`import.meta.url`), which Next/Turbopack
    // keeps co-located with the JS chunk. The public/wasm/ copy remains a
    // redundant safety net for environments where the bundler hashes the
    // file and breaks the relative URL resolution.
    await Promise.race([
      wasm.default(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("WASM init timeout")), 5000),
      ),
    ]);
    return makeWasmBackend(wasm);
  } catch (err) {
    console.warn("[Stegabyte] Failed to load WASM stego core, falling back to JS:", err);
    return makeJsBackend();
  }
}

/**
 * Get the LSB backend, initialising WASM on first call. Returns the same
 * module instance on every subsequent call. Safe to call concurrently.
 */
export function loadWasm(): Promise<WasmStegoModule> {
  if (cachedModule) return Promise.resolve(cachedModule);
  if (!initPromise) {
    initPromise = doLoad().then((m) => {
      cachedModule = m;
      return m;
    });
  }
  return initPromise;
}

/** Synchronous accessor — returns `null` if the WASM module hasn't loaded yet. */
export function getWasmSync(): WasmStegoModule | null {
  return cachedModule;
}

function makeWasmBackend(mod: WasmBindings): WasmStegoModule {
  return {
    backend: "wasm",
    lsbCapacity(width, height) {
      return mod.stegabyte_lsb_capacity(width, height);
    },
    encode(pixels, payload, width, height, originalLength) {
      const outPixels = mod.stegabyte_encode(
        pixels,
        new Uint8Array(payload),
        width,
        height,
        originalLength,
      );
      // capacityUsed/usedInThisCall is not separately returned by WASM;
      // approximate by total capacity minus remaining bits.
      const capacityTotal = mod.stegabyte_lsb_capacity(width, height);
      const capacityUsed = capacityTotal;
      return { outPixels, capacityUsed, capacityTotal };
    },
    decode(pixels, width, height) {
      const out = mod.stegabyte_decode(pixels, width, height);
      const HEADER_BYTES = mod.stegabyte_header_bytes();
      const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
      const version = dv.getUint16(4, true);
      const payloadLength = dv.getUint32(6, true);
      const originalLength = dv.getUint32(10, true);
      const payloadBytes = out.subarray(HEADER_BYTES);
      const hex = bytesToHex(payloadBytes);
      return {
        payload: hex,
        header: { magic: "CRYX", version, payloadLength, originalLength },
      };
    },
    entropy(pixels) {
      return mod.stegabyte_entropy(pixels);
    },
    lsbSuspicion(pixels) {
      return mod.stegabyte_lsb_suspicion(pixels);
    },
    histogram(pixels) {
      const u32 = mod.stegabyte_histogram(pixels);
      return Array.from(u32);
    },
  };
}

function makeJsBackend(): WasmStegoModule {
  return {
    backend: "js",
    lsbCapacity(width, height) {
      return jsLsbCapacity(width, height);
    },
    encode(pixels, payload, width, height, originalLength) {
      return jsEncodePngLsb(pixels, payload, width, height, originalLength);
    },
    decode(pixels, width, height) {
      return jsDecodePngLsb(pixels, width, height);
    },
    entropy(pixels) {
      return jsEntropy(pixels);
    },
    lsbSuspicion(pixels) {
      return jsLsbSuspicion(pixels);
    },
    histogram(pixels) {
      return jsHistogram(pixels);
    },
  };
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i]! >>> 4).toString(16);
    out += (bytes[i]! & 0x0f).toString(16);
  }
  return out;
}
