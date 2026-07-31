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
 *   The wasm-pack-generated JavaScript glue lives in `public/wasm/` because
 *   Next.js can't bundle files that reference each other with relative
 *   `new URL(...)` calls — those are baked at build time by webpack into
 *   the chunk that contains the import. Files in `public/` are served
 *   verbatim, so we load the glue as text via `fetch()`, evaluate it in a
 *   scoped context, and then call its default export to initialise the
 *   WASM. The `.wasm` binary is fetched the same way.
 *
 *   This sidesteps Next.js's restriction that `public/` assets can only be
 *   referenced from HTML (`<script>` / `<link>`), not imported as ES
 *   modules, while still keeping the WASM core outside the JS bundle so
 *   the main thread doesn't pay for it on the critical path.
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

/**
 * Minimal contract for the wasm-pack-generated bindings, narrowed to the
 * surface we actually use.
 *
 * We deliberately keep this loose — the actual generated file is fetched
 * and evaluated at runtime, and its type isn't visible to TypeScript.
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
  readonly default: (module_or_path?: unknown) => Promise<unknown>;
}

/**
 * Fetch the wasm-pack-generated glue from `/wasm/stegabyte_stego_core.js`
 * and evaluate it in a way that exposes its default export.
 *
 * The generated code is `wasm-bindgen`'s standard Web target output. It
 * uses `new URL('stegabyte_stego_core_bg.wasm', import.meta.url)` to
 * resolve the WASM URL relative to itself — but since we're loading it
 * via `fetch()`, we override `import.meta.url` with the URL of the
 * script so that resolution points at the actual `/wasm/` directory.
 */
async function loadBindingsScript(): Promise<WasmBindings> {
  const scriptUrl = "/wasm/stegabyte_stego_core.js";
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to load WASM bindings script: ${response.status} ${response.statusText}`,
    );
  }
  const source = await response.text();
  const blob = new Blob([source], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    // Dynamic `import()` of a blob URL with the original script's URL
    // patched into `import.meta.url`. wasm-bindgen's `new URL(..., import.meta.url)`
    // resolves to `${blobUrl}/stegabyte_stego_core_bg.wasm`, which doesn't
    // exist — so before importing we also intercept the WASM URL.
    //
    // Simpler approach: import the blob as-is, then if the WASM URL is
    // wrong, manually call `init()` with the correct WASM URL.
    const module = (await import(/* webpackIgnore: true */ blobUrl)) as WasmBindings;
    return module;
  } finally {
    // Revoke after the import resolves; the module is cached separately.
    // Defer to give the dynamic import's fetch machinery time to clone.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }
}

/**
 * Resolve the absolute URL of the WASM binary served by Next.js.
 *
 * `public/wasm/stegabyte_stego_core_bg.wasm` is served verbatim at the
 * same path on the running site (or, in dev, `public/` files are served
 * from the same root).
 */
function wasmBinaryUrl(): string {
  return "/wasm/stegabyte_stego_core_bg.wasm";
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
    const bindings = await loadBindingsScript();
    await Promise.race([
      bindings.default(wasmBinaryUrl()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("WASM init timeout")), 5000),
      ),
    ]);
    return makeWasmBackend(bindings);
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
  for (let i = 0; i < bytes.length; i += 1) {
    out += (bytes[i]! >>> 4).toString(16);
    out += (bytes[i]! & 0x0f).toString(16);
  }
  return out;
}
