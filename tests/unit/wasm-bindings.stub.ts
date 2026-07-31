/**
 * Stub for the WASM bindings. Used by Vitest so it can resolve the dynamic
 * `import("./wasm/pkg/stegabyte_stego_core.js")` in `wasm-loader.ts`.
 *
 * The real bindings (and the real `.wasm` binary) live in `public/wasm/`
 * and are loaded at runtime by the browser. Vitest never needs to actually
 * run WASM — the loader falls back to the pure-JS core when this stub's
 * default export is called.
 *
 * Surface mirrors `stegabyte_stego_core.d.ts` exactly so type-checking
 * stays honest.
 */

export function stegabyte_decode(): Uint8Array {
  return new Uint8Array(0);
}

export function stegabyte_encode(
  pixels: Uint8Array,
  _payload: Uint8Array,
  _width: number,
  _height: number,
  _originalLength: number,
): Uint8Array {
  return pixels;
}

export function stegabyte_entropy(): number {
  return 0;
}

export function stegabyte_header_bytes(): number {
  return 14;
}

export function stegabyte_histogram(): Uint32Array {
  return new Uint32Array(256);
}

export function stegabyte_lsb_capacity(): number {
  return 0;
}

export function stegabyte_lsb_suspicion(): number {
  return 0;
}

export function stegabyte_max_dimension(): number {
  return 8192;
}

export default function __wbg_init(): Promise<unknown> {
  return Promise.resolve(undefined);
}
