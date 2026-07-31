/**
 * Micro-benchmark for the pure-JS LSB core. Runs in any environment
 * (Vitest under jsdom or Node) because it does NOT touch the WASM module.
 *
 * The WASM-vs-JS comparison lives in `wasm-parity.test.ts`; this file's
 * job is to give us stable, reproducible numbers for the JS path so we can
 * reason about its absolute performance. WASM numbers are reported by
 * `benchmark-browser.html` which must be opened in a real browser.
 */
import { describe, it, expect } from "vitest";
import {
  encodePngLsb,
  decodePngLsb,
  estimatePngEntropy,
  lsbSuspicion,
  histogram,
  lsbCapacity,
} from "@/lib/stego/png-lsb-core";

interface BenchResult {
  op: string;
  imageSize: string;
  iterations: number;
  totalMs: number;
  perOpMs: number;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makePixels(width: number, height: number, seed: number): Uint8Array {
  const rand = lcg(seed);
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < out.length; i++) out[i] = Math.floor(rand() * 256);
  return out;
}

function bench(label: string, fn: () => void, iters: number): BenchResult {
  // Warm-up: ensure JIT has stabilised.
  for (let i = 0; i < Math.min(3, iters); i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  const t1 = performance.now();
  const totalMs = t1 - t0;
  return {
    op: label,
    imageSize: "?",
    iterations: iters,
    totalMs,
    perOpMs: totalMs / iters,
  };
}

describe("JS LSB benchmark (baseline)", () => {
  const sizes: { name: string; w: number; h: number; iters: number }[] = [
    { name: "256×256", w: 256, h: 256, iters: 50 },
    { name: "1024×1024", w: 1024, h: 1024, iters: 20 },
    { name: "1920×1080", w: 1920, h: 1080, iters: 12 },
    { name: "3840×2160 (4K)", w: 3840, h: 2160, iters: 4 },
  ];

  it("reports per-op timings (printed at end)", () => {
    const results: BenchResult[] = [];
    for (const s of sizes) {
      const pixels = makePixels(s.w, s.h, 42);
      const cap = lsbCapacity(s.w, s.h);
      // Encode a payload that fills ~25% of the image so we get real bit work.
      const payload = new Uint8Array(Math.floor(cap * 0.25));
      for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;

      let encoded: Uint8Array | null = null;
      const encodeR = bench(
        `encode ${s.name}`,
        () => {
          const out = encodePngLsb(
            pixels,
            payload.buffer as ArrayBuffer,
            s.w,
            s.h,
            payload.length,
          );
          encoded = out.outPixels;
        },
        s.iters,
      );

      const decodeR = bench(
        `decode ${s.name}`,
        () => {
          if (!encoded) throw new Error("encode didn't run");
          decodePngLsb(encoded, s.w, s.h);
        },
        s.iters,
      );

      const entropyR = bench(
        `entropy ${s.name}`,
        () => {
          estimatePngEntropy(pixels);
        },
        s.iters,
      );

      const suspicionR = bench(
        `lsbSuspicion ${s.name}`,
        () => {
          lsbSuspicion(pixels);
        },
        s.iters,
      );

      const histogramR = bench(
        `histogram ${s.name}`,
        () => {
          histogram(pixels);
        },
        s.iters,
      );

      results.push(
        { ...encodeR, imageSize: s.name },
        { ...decodeR, imageSize: s.name },
        { ...entropyR, imageSize: s.name },
        { ...suspicionR, imageSize: s.name },
        { ...histogramR, imageSize: s.name },
      );
    }

    // Surface the table so vitest prints it.
    const lines = [
      "",
      "  ┌─────────────────────────┬────────────────┬──────────┬─────────────┬──────────────┐",
      "  │ op                      │ image          │ iters    │ total ms    │ per-op ms    │",
      "  ├─────────────────────────┼────────────────┼──────────┼─────────────┼──────────────┤",
      ...results.map(
        (r) =>
          `  │ ${r.op.padEnd(23)} │ ${r.imageSize.padEnd(14)} │ ${String(r.iterations).padStart(8)} │ ${r.totalMs.toFixed(2).padStart(11)} │ ${r.perOpMs.toFixed(3).padStart(12)} │`,
      ),
      "  └─────────────────────────┴────────────────┴──────────┴─────────────┴──────────────┘",
      "",
    ];
    console.log(lines.join("\n"));

    // Sanity: ensure we actually ran something.
    expect(results.length).toBe(sizes.length * 5);
  }, 120_000);
});
