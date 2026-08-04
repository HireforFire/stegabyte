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
 *
 * Loading strategy:
 *
 *   1. Fetch the `.wasm` binary directly and compile it to a
 *      `WebAssembly.Module` ahead of time.
 *   2. Fetch the wasm-bindgen-generated glue (`stegabyte_stego_core.js`)
 *      and evaluate it inside a Blob URL — the same dynamic-import path
 *      that v1.0 used, but we now skip the glue's own URL-resolution
 *      branch by passing the precompiled module.
 *   3. Call `bindings.default({ module })`, which bypasses the
 *      `new URL('...wasm', import.meta.url)` lookup entirely (that lookup
 *      would otherwise resolve to a `blob:` URL, where the WASM file
 *      doesn't exist).
 *
 *   This was the architectural bug in v1.0: blob-importing the glue made
 *   `import.meta.url` a `blob:https://…` URL, so the glue's WASM fetch
 *   landed on a 404 every time. The fallback to JS then fired after a
 *   5 s timeout and a noisy console warning, on every cold load.
 */
import {
  lsbCapacity as jsLsbCapacity,
  encodePngLsb as jsEncodePngLsb,
  decodePngLsb as jsDecodePngLsb,
  estimatePngEntropy as jsEntropy,
  lsbSuspicion as jsLsbSuspicion,
  histogram as jsHistogram,
  MAX_PAYLOAD_LENGTH_BYTES,
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
    typeof WebAssembly !== "undefined" &&
    typeof WebAssembly.instantiate === "function" &&
    typeof WebAssembly.compile === "function"
  );
}

/**
 * Minimal contract for the wasm-pack-generated bindings, narrowed to the
 * surface we actually use. The actual generated file is fetched and
 * evaluated at runtime — its type isn't visible to TypeScript.
 */
interface WasmBindings {
  readonly stegabyte_decode: (pixels: Uint8Array, width: number, height: number) => Uint8Array;
  readonly stegabyte_encode: (
    pixels: Uint8Array,
    payload: Uint8Array,
    width: number,
    height: number,
    original_length: number,
  ) => Uint8Array;
  readonly stegabyte_entropy: (pixels: Uint8Array) => number;
  readonly stegabyte_histogram: (pixels: Uint8Array) => Uint32Array;
  readonly stegabyte_header_bytes: () => number;
  readonly stegabyte_lsb_capacity: (width: number, height: number) => number;
  readonly stegabyte_lsb_suspicion: (pixels: Uint8Array) => number;
  readonly stegabyte_max_dimension: () => number;
  readonly default: (initArg: { module: WebAssembly.Module }) => Promise<unknown>;
}

const WASM_SCRIPT_URL = "/wasm/stegabyte_stego_core.js";
const WASM_BINARY_URL = "/wasm/stegabyte_stego_core_bg.wasm";

/**
 * Fetch the WASM binary and compile it ahead of time. Doing the
 * `compile()` here (rather than letting the bindings do an `instantiate`
 * which includes compilation) means we fail fast if the bytes are
 * missing or corrupt — instead of paying a 5 s `await` inside the
 * bindings before falling back to JS.
 */
async function fetchWasmModule(): Promise<WebAssembly.Module> {
  const response = await fetch(WASM_BINARY_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to load WASM binary: ${response.status} ${response.statusText}`,
    );
  }
  const bytes = await response.arrayBuffer();
  return WebAssembly.compile(bytes);
}

/**
 * Fetch the wasm-bindgen-generated glue and import it as an ES module.
 *
 * The glue contains `new URL("stegabyte_stego_core_bg.wasm", import.meta.url)`
 * but we bypass that branch by passing a precompiled module to
 * `bindings.default({ module })`. The blob URL is only used to evaluate
 * the glue code; nothing inside it fetches anything based on the blob
 * origin.
 */
async function loadBindingsScript(): Promise<WasmBindings> {
  const response = await fetch(WASM_SCRIPT_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to load WASM bindings script: ${response.status} ${response.statusText}`,
    );
  }
  const source = await response.text();
  const blob = new Blob([source], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const module = (await import(/* webpackIgnore: true */ blobUrl)) as WasmBindings;
    return module;
  } finally {
    // Defer the revoke until after the import promise settles so the
    // glue's first reference doesn't see a revoked URL.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }
}

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
    const [bindings, module] = await Promise.all([
      loadBindingsScript(),
      fetchWasmModule(),
    ]);
    await Promise.race([
      bindings.default({ module }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("WASM init timeout")), 5000),
      ),
    ]);
    return makeWasmBackend(bindings);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Stegabyte] Failed to load WASM stego core, falling back to JS:", err);
    }
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
      // v1.0 conflated capacityUsed with capacityTotal, which made the
      // CapacityMeter report "100% used" for every encode. Now we
      // derive capacityUsed from the byte count the encoder actually
      // wrote (HEADER_BYTES + payload.length in bits, divided by 8).
      // The WASM core doesn't return this directly, so we recompute it
      // on the JS side — same arithmetic the JS core uses internally.
      const HEADER_BYTES = mod.stegabyte_header_bytes();
      const totalBits = (HEADER_BYTES + payload.byteLength) * 8;
      const capacityTotal = mod.stegabyte_lsb_capacity(width, height);
      const capacityUsed = Math.min(totalBits, capacityTotal);
      return { outPixels, capacityUsed, capacityTotal };
    },
    decode(pixels, width, height) {
      const out = mod.stegabyte_decode(pixels, width, height);
      const HEADER_BYTES = mod.stegabyte_header_bytes();
      const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
      // DoS guard: an attacker can craft a header with a huge payloadLength
      // claim. Without this check, the bytesToHex() below would attempt to
      // hex-encode ~800 MB of data, freezing the tab. Mirror the JS core's
      // bound (see png-lsb-core.ts).
      if (dv.byteLength < HEADER_BYTES) {
        throw new Error("Corrupt header: WASM decode returned invalid data.");
      }
      const version = dv.getUint16(4, true);
      const payloadLength = dv.getUint32(6, true);
      const originalLength = dv.getUint32(10, true);
      if (payloadLength > MAX_PAYLOAD_LENGTH_BYTES) {
        throw new Error("Corrupt header: payload length exceeds reasonable bounds.");
      }
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
  for (let i = 0; i < bytes.length; i += 1) {
    out += (bytes[i]! >>> 4).toString(16);
    out += (bytes[i]! & 0x0f).toString(16);
  }
  return out;
}
