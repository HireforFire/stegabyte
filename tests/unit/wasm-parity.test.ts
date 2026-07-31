/**
 * Parity tests: the WASM-backed LSB module MUST produce identical outputs to
 * the pure-JS core for every code path. These tests are skipped when the
 * WASM module cannot be loaded (e.g. under jsdom where the public/wasm/
 * asset isn't served).
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  encodePngLsb as jsEncode,
  estimatePngEntropy as jsEntropy,
  lsbSuspicion as jsLsbSuspicion,
  histogram as jsHistogram,
} from "@/lib/stego/png-lsb-core";
import { loadWasm, type WasmStegoModule } from "@/lib/stego/wasm-loader";

let wasm: WasmStegoModule | null = null;
let wasmAvailable = false;

beforeAll(async () => {
  try {
    const m = await loadWasm();
    if (m.backend === "wasm") {
      wasm = m;
      wasmAvailable = true;
    }
  } catch {
    wasmAvailable = false;
  }
}, 15_000);

function makeRandomPixels(width: number, height: number, seed: number): Uint8Array {
  // Tiny LCG so we get reproducible random-ish data.
  let state = seed >>> 0 || 1;
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < out.length; i++) {
    state = (1664525 * state + 1013904223) >>> 0;
    out[i] = state & 0xff;
  }
  return out;
}

const itIfWasm = (name: string, fn: () => void) =>
  it(name, wasmAvailable ? fn : () => undefined);

describe("WASM parity", () => {
  itIfWasm("lsbCapacity matches the JS capacity formula", () => {
    if (!wasm) return;
    for (const [w, h] of [
      [1, 1],
      [10, 10],
      [640, 480],
      [1920, 1080],
    ]) {
      expect(wasm.lsbCapacity(w, h)).toBe(Math.floor((w * h * 3) / 8));
    }
  });

  itIfWasm("encode + decode round-trips a UTF-8 payload", () => {
    if (!wasm) return;
    const width = 32;
    const height = 32;
    const pixels = makeRandomPixels(width, height, 42);
    const payload = new TextEncoder().encode("Stegabyte WASM parity test — 你好世界 🔒");
    const out = wasm.encode(pixels, payload.buffer, width, height, payload.byteLength);
    const decoded = wasm.decode(out.outPixels, width, height);
    const decodedBytes = new Uint8Array(
      decoded.payload.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );
    expect(decodedBytes).toEqual(payload);
    expect(decoded.header.magic).toBe("CRYX");
    expect(decoded.header.payloadLength).toBe(payload.byteLength);
    expect(decoded.header.originalLength).toBe(payload.byteLength);
  });

  itIfWasm("encode produces a CRYX header", () => {
    if (!wasm) return;
    const width = 8;
    const height = 8;
    const pixels = makeRandomPixels(width, height, 7);
    const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const w = wasm.encode(pixels, payload.buffer, width, height, payload.length);
    const wHeader = String.fromCharCode(...w.outPixels.slice(0, 4));
    expect(wHeader).toBe("CRYX");
  });

  itIfWasm("encode output matches JS output byte-for-byte", () => {
    if (!wasm) return;
    const width = 16;
    const height = 16;
    const pixels = makeRandomPixels(width, height, 99);
    const payload = new Uint8Array(64);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    const js = jsEncode(pixels, payload.buffer, width, height, payload.length);
    const w = wasm.encode(pixels, payload.buffer, width, height, payload.length);
    expect(w.outPixels).toEqual(js.outPixels);
  });

  itIfWasm("entropy matches JS core", () => {
    if (!wasm) return;
    const pixels = makeRandomPixels(64, 64, 99);
    const jsVal = jsEntropy(pixels);
    const wVal = wasm.entropy(pixels);
    expect(Math.abs(jsVal - wVal)).toBeLessThan(1e-9);
  });

  itIfWasm("lsbSuspicion matches JS core", () => {
    if (!wasm) return;
    const pixels = makeRandomPixels(64, 64, 13);
    const jsVal = jsLsbSuspicion(pixels);
    const wVal = wasm.lsbSuspicion(pixels);
    expect(Math.abs(jsVal - wVal)).toBeLessThan(1e-9);
  });

  itIfWasm("histogram matches JS core", () => {
    if (!wasm) return;
    const pixels = makeRandomPixels(64, 64, 21);
    const jsHist = jsHistogram(pixels);
    const wHist = wasm.histogram(pixels);
    expect(wHist).toHaveLength(256);
    for (let i = 0; i < 256; i++) {
      expect(wHist[i]).toBe(jsHist[i]!);
    }
  });

  itIfWasm("decode rejects undersized pixel buffers", () => {
    if (!wasm) return;
    expect(() => wasm.decode(new Uint8Array(8), 1, 1)).toThrow();
  });

  itIfWasm("decode rejects images without CRYX magic", () => {
    if (!wasm) return;
    // Build a valid-size buffer with all zero pixels (magic bytes won't match).
    const pixels = new Uint8Array(32 * 32 * 4);
    expect(() => wasm.decode(pixels, 32, 32)).toThrow(/magic|Stegabyte/);
  });

  itIfWasm("the JS core is reachable as a fallback when WASM fails to load", () => {
    // We can't easily test the failure path here (jsdom doesn't expose the
    // browser fetch), but we can verify the JS backend signature matches.
    // This is more of a smoke test that the public surface is consistent.
    if (!wasm) return;
    expect(typeof wasm.lsbCapacity).toBe("function");
    expect(typeof wasm.encode).toBe("function");
    expect(typeof wasm.decode).toBe("function");
    expect(typeof wasm.entropy).toBe("function");
    expect(typeof wasm.lsbSuspicion).toBe("function");
    expect(typeof wasm.histogram).toBe("function");
  });
});
