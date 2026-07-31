"use client";

/**
 * /benchmark — runs both the WASM and pure-JS LSB cores on identical inputs
 * and prints a side-by-side timing table.
 *
 * Usage:
 *   1. `npm run dev`
 *   2. Open http://localhost:3000/benchmark
 *   3. Click "Run benchmark"
 *
 * The page is intentionally minimal — it's a measurement tool, not a
 * production UI. All numbers are printed to the table and to the console
 * (Ctrl+Shift+I → Console) for easy copy-pasting.
 */
import * as React from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TechButton } from "@/components/ui/tech-button";
import { TechLabel } from "@/components/ui/tech-label";
import { useWasmStego } from "@/hooks/use-wasm-stego";
import type { WasmStegoModule } from "@/lib/stego/wasm-loader";

interface BenchRow {
  op: string;
  imageSize: string;
  iterations: number;
  jsMs: number | null;
  wasmMs: number | null;
  speedup: number | null;
}

interface BenchmarkPageState {
  running: boolean;
  rows: BenchRow[];
  error: string | null;
}

const SIZES = [
  { name: "256×256", w: 256, h: 256, iters: 50 },
  { name: "1024×1024", w: 1024, h: 1024, iters: 20 },
  { name: "1920×1080", w: 1920, h: 1080, iters: 12 },
  { name: "3840×2160 (4K)", w: 3840, h: 2160, iters: 4 },
];

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

function timeIters(iters: number, fn: () => void): number {
  for (let i = 0; i < Math.min(3, iters); i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  return performance.now() - t0;
}

export function BenchmarkPage() {
  const wasmStego = useWasmStego();
  const [state, setState] = React.useState<BenchmarkPageState>({
    running: false,
    rows: [],
    error: null,
  });

  const runBenchmark = React.useCallback(async () => {
    setState({ running: true, rows: [], error: null });
    try {
      const wasm = wasmStego.module;
      const rows: BenchRow[] = [];

      for (const s of SIZES) {
        const pixels = makePixels(s.w, s.h, 42);
        const cap = Math.floor((s.w * s.h * 3) / 8);
        const payload = new Uint8Array(Math.floor(cap * 0.25));
        for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;

        // Let the UI breathe between sizes.
        await new Promise((r) => setTimeout(r, 30));

        // JS core timings via dynamic import so the WASM bundle is not
        // re-evaluated for these operations.
        const js = await import("@/lib/stego/png-lsb-core");
        let encoded: Uint8Array | null = null;
        const jsEncodeMs = timeIters(s.iters, () => {
          const out = js.encodePngLsb(
            pixels,
            payload.buffer as ArrayBuffer,
            s.w,
            s.h,
            payload.length,
          );
          encoded = out.outPixels;
        });
        const jsDecodeMs = timeIters(s.iters, () => {
          if (!encoded) throw new Error("encode didn't run");
          js.decodePngLsb(encoded, s.w, s.h);
        });
        const jsEntropyMs = timeIters(s.iters, () => {
          js.estimatePngEntropy(pixels);
        });
        const jsSuspicionMs = timeIters(s.iters, () => {
          js.lsbSuspicion(pixels);
        });
        const jsHistogramMs = timeIters(s.iters, () => {
          js.histogram(pixels);
        });

        const wasmEncodeMs = wasm
          ? timeIters(s.iters, () => {
              const out = (wasm as WasmStegoModule).encode(
                pixels,
                payload.buffer as ArrayBuffer,
                s.w,
                s.h,
                payload.length,
              );
              encoded = out.outPixels;
            })
          : null;
        const wasmDecodeMs =
          wasm && encoded
            ? timeIters(s.iters, () => {
                (wasm as WasmStegoModule).decode(encoded!, s.w, s.h);
              })
            : null;
        const wasmEntropyMs = wasm
          ? timeIters(s.iters, () => {
              (wasm as WasmStegoModule).entropy(pixels);
            })
          : null;
        const wasmSuspicionMs = wasm
          ? timeIters(s.iters, () => {
              (wasm as WasmStegoModule).lsbSuspicion(pixels);
            })
          : null;
        const wasmHistogramMs = wasm
          ? timeIters(s.iters, () => {
              (wasm as WasmStegoModule).histogram(pixels);
            })
          : null;

        rows.push(
          {
            op: "encode",
            imageSize: s.name,
            iterations: s.iters,
            jsMs: jsEncodeMs,
            wasmMs: wasmEncodeMs,
            speedup: speedup(jsEncodeMs, wasmEncodeMs),
          },
          {
            op: "decode",
            imageSize: s.name,
            iterations: s.iters,
            jsMs: jsDecodeMs,
            wasmMs: wasmDecodeMs,
            speedup: speedup(jsDecodeMs, wasmDecodeMs),
          },
          {
            op: "entropy",
            imageSize: s.name,
            iterations: s.iters,
            jsMs: jsEntropyMs,
            wasmMs: wasmEntropyMs,
            speedup: speedup(jsEntropyMs, wasmEntropyMs),
          },
          {
            op: "lsbSuspicion",
            imageSize: s.name,
            iterations: s.iters,
            jsMs: jsSuspicionMs,
            wasmMs: wasmSuspicionMs,
            speedup: speedup(jsSuspicionMs, wasmSuspicionMs),
          },
          {
            op: "histogram",
            imageSize: s.name,
            iterations: s.iters,
            jsMs: jsHistogramMs,
            wasmMs: wasmHistogramMs,
            speedup: speedup(jsHistogramMs, wasmHistogramMs),
          },
        );

        setState((prev) => ({ ...prev, rows: [...rows] }));
      }

      console.table(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, error: msg }));
    } finally {
      setState((prev) => ({ ...prev, running: false }));
    }
  }, [wasmStego.module]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div>
        <TechLabel>Diagnostics</TechLabel>
        <h1 className="mt-2 text-3xl font-extralight tracking-tight text-white sm:text-4xl">
          WASM benchmark
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/50">
          Runs both the pure-JS core and the Rust-compiled WebAssembly core on identical
          inputs. Open the dev tools console to see the raw timings table.
        </p>
      </div>

      <GlassPanel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-white/70">
              Backend:{" "}
              <span className="font-mono text-white">
                {wasmStego.module
                  ? `${wasmStego.module.backend}`
                  : wasmStego.loading
                    ? "loading…"
                    : "unavailable"}
              </span>
            </p>
            <p className="text-xs text-white/40">
              {wasmStego.error
                ? `WASM error: ${wasmStego.error.message}`
                : "Results are reported in milliseconds per call."}
            </p>
          </div>
          <TechButton
            onClick={runBenchmark}
            disabled={state.running || wasmStego.loading}
          >
            {state.running ? "Running…" : "Run benchmark"}
          </TechButton>
        </div>

        {state.error && (
          <p
            className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {state.error}
          </p>
        )}

        {state.rows.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-2 pr-4 font-normal">op</th>
                  <th className="py-2 pr-4 font-normal">image</th>
                  <th className="py-2 pr-4 text-right font-normal">iters</th>
                  <th className="py-2 pr-4 text-right font-normal">JS ms</th>
                  <th className="py-2 pr-4 text-right font-normal">WASM ms</th>
                  <th className="py-2 text-right font-normal">speedup</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r, i) => (
                  <tr
                    key={`${r.op}-${r.imageSize}-${i}`}
                    className="border-b border-white/5 text-white/80"
                  >
                    <td className="py-1.5 pr-4">{r.op}</td>
                    <td className="py-1.5 pr-4 text-white/60">{r.imageSize}</td>
                    <td className="py-1.5 pr-4 text-right text-white/60">
                      {r.iterations}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      {r.jsMs?.toFixed(2) ?? "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-cyan-300">
                      {r.wasmMs?.toFixed(2) ?? "—"}
                    </td>
                    <td className="py-1.5 text-right text-emerald-300">
                      {r.speedup ? `${r.speedup.toFixed(2)}×` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function speedup(js: number | null, wasm: number | null): number | null {
  if (js === null || wasm === null) return null;
  if (wasm === 0) return null;
  return js / wasm;
}
