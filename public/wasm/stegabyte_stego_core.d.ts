/* tslint:disable */
/* eslint-disable */

export function _start(): void;

/**
 * Decode an LSB payload out of `pixels`. Returns a `Uint8Array` containing
 * `[HEADER_BYTES | payload...]`. Use `stegabyte_header_bytes()` to slice
 * off the prefix.
 *
 * Returns error if `pixels.len() != width * height * 4`, if the image is too
 * small to contain a header, or if the magic bytes don't match.
 */
export function stegabyte_decode(pixels: Uint8Array, width: number, height: number): Uint8Array;

/**
 * Encode a payload into the LSBs of `pixels` (RGBA, 4 bytes/pixel).
 *
 * - `pixels`: input RGBA buffer.
 * - `payload`: plaintext-after-header bytes to embed.
 * - `width`, `height`: image dimensions (used for capacity calc).
 * - `original_length`: plaintext byte count, written to header bytes 10..13.
 *
 * Returns a freshly allocated `Uint8Array` containing the modified pixel buffer.
 *
 * Returns error if `pixels.len() != width * height * 4` or if the payload
 * doesn't fit in the image's LSB capacity.
 */
export function stegabyte_encode(pixels: Uint8Array, payload: Uint8Array, width: number, height: number, original_length: number): Uint8Array;

/**
 * Normalized Shannon entropy over R,G,B channels (0..1).
 * Skips alpha.
 */
export function stegabyte_entropy(pixels: Uint8Array): number;

/**
 * Header bytes length (constant for callers that want to slice off the header).
 */
export function stegabyte_header_bytes(): number;

/**
 * Returns a 256-bin histogram of R,G,B channel byte values (alpha skipped).
 */
export function stegabyte_histogram(pixels: Uint8Array): Uint32Array;

/**
 * LSB capacity in bytes for an RGBA image of `width` × `height`.
 * Capacity = (width × height × 3 channels) / 8 bits per byte.
 */
export function stegabyte_lsb_capacity(width: number, height: number): number;

/**
 * LSB suspicion metric: how far the R,G/B LSB ratio deviates from 50/50.
 * Returns 0..1 — higher means more anomalous.
 */
export function stegabyte_lsb_suspicion(pixels: Uint8Array): number;

/**
 * Max allowed dimension per side (defence against OOM via huge dimensions).
 */
export function stegabyte_max_dimension(): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly stegabyte_decode: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly stegabyte_encode: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly stegabyte_entropy: (a: number, b: number) => number;
    readonly stegabyte_histogram: (a: number, b: number, c: number) => void;
    readonly stegabyte_lsb_capacity: (a: number, b: number) => number;
    readonly stegabyte_lsb_suspicion: (a: number, b: number) => number;
    readonly _start: () => void;
    readonly stegabyte_header_bytes: () => number;
    readonly stegabyte_max_dimension: () => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
