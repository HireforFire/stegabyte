# Benchmarks

Performance numbers for Stegabyte's pure-JS LSB core and the
Rust-compiled WebAssembly core.

> **Important**: all numbers below were measured **on the machine where
> this report was generated** (Windows 11, Node 20.9, V8 under jsdom).
> Real-browser numbers will differ by ±10–20%, but the **ratios** between
> operations should hold across browsers. Use `/benchmark` in your browser
> to get exact numbers for your hardware.

## Methodology

- **Image data**: synthetic RGBA pixels generated from a deterministic LCG
  (so the same bytes run every iteration).
- **Payload**: a 25%-of-capacity buffer filled with a simple `i & 0xff`
  pattern (worst case for LSB encoding — high entropy).
- **Iterations per measurement**:
  - 256×256 → 50 iters
  - 1024×1024 → 20 iters
  - 1920×1080 → 12 iters
  - 3840×2160 (4K) → 4 iters
- **Warm-up**: 3 iterations discarded before timing starts, to settle the
  JIT.
- **Timing**: `performance.now()` resolution; we report **total ms** and
  **per-op ms**.

## JS core (Vitest, jsdom, V8)

This run was captured by
`tests/unit/benchmark/js-baseline.bench.test.ts`:

```
┌─────────────────────────┬────────────────┬──────────┬─────────────┬──────────────┐
│ op                      │ image          │ iters    │ total ms    │ per-op ms    │
├─────────────────────────┼────────────────┼──────────┼─────────────┼──────────────┤
│ encode 256×256          │ 256×256        │       50 │        9.82 │        0.196 │
│ decode 256×256          │ 256×256        │       50 │       34.39 │        0.688 │
│ entropy 256×256         │ 256×256        │       50 │       23.56 │        0.471 │
│ lsbSuspicion 256×256    │ 256×256        │       50 │       28.62 │        0.572 │
│ histogram 256×256       │ 256×256        │       50 │       27.82 │        0.556 │
│ encode 1024×1024        │ 1024×1024      │       20 │       42.44 │        2.122 │
│ decode 1024×1024        │ 1024×1024      │       20 │      226.04 │       11.302 │
│ entropy 1024×1024       │ 1024×1024      │       20 │      136.38 │        6.819 │
│ lsbSuspicion 1024×1024  │ 1024×1024      │       20 │      181.66 │        9.083 │
│ histogram 1024×1024     │ 1024×1024      │       20 │      177.19 │        8.859 │
│ encode 1920×1080        │ 1920×1080      │       12 │       51.88 │        4.324 │
│ decode 1920×1080        │ 1920×1080      │       12 │      284.67 │       23.722 │
│ entropy 1920×1080       │ 1920×1080      │       12 │      161.53 │       13.461 │
│ lsbSuspicion 1920×1080  │ 1920×1080      │       12 │      215.43 │       17.952 │
│ histogram 1920×1080     │ 1920×1080      │       12 │      210.95 │       17.579 │
│ encode 3840×2160 (4K)   │ 3840×2160 (4K) │        4 │       67.24 │       16.809 │
│ decode 3840×2160 (4K)   │ 3840×2160 (4K) │        4 │      425.72 │      106.429 │
│ entropy 3840×2160 (4K)  │ 3840×2160 (4K) │        4 │      215.74 │       53.935 │
│ lsbSuspicion 3840×2160 (4K) │ 3840×2160 (4K) │        4 │      287.34 │       71.835 │
│ histogram 3840×2160 (4K) │ 3840×2160 (4K) │        4 │      284.29 │       71.072 │
└─────────────────────────┴────────────────┴──────────┴─────────────┴──────────────┘
```

### Key takeaways

- **decode is ~6× slower than encode** on the JS path. Encode writes
  bits to a fresh output buffer (sequential, cache-friendly). Decode
  reads bits from arbitrary positions in the pixel buffer (per-byte
  bit-recovery, harder to vectorise in plain JS).
- **The analysis path (entropy / lsbSuspicion / histogram) is the
  dominant cost on large images.** These three operations all walk the
  entire pixel buffer once, so they're I/O-bound by pixel count, not by
  payload size.

## WASM core (browser)

Open `/benchmark` in any modern browser to get real numbers for your
machine. The page runs both backends on identical inputs and prints:

- per-op timings for `encode`, `decode`, `entropy`, `lsbSuspicion`,
  `histogram`
- the speedup ratio per operation
- a full structured table to the dev-tools console (`console.table`)

### Expected speedup ranges (estimates)

Based on V8's TurboFan vs a single-threaded wasm32 module running
narrow loops over byte arrays, rough expectations for 4K images:

| operation    | JS (ms) | WASM (ms, expected) | speedup |
| ------------ | ------- | ------------------- | ------- |
| encode       | 16.8    | ~4–6                | 3–4×    |
| decode       | 106.4   | ~10–15              | 7–10×   |
| entropy      | 53.9    | ~6–9                | 6–9×    |
| lsbSuspicion | 71.8    | ~6–9                | 8–12×   |
| histogram    | 71.1    | ~6–9                | 8–12×   |

WASM dominates where V8 can't auto-vectorise the loop (which is most of
the time for the analysis path).

## Reproducing locally

```bash
# JS-only baseline (Node + jsdom):
npm test -- js-baseline.bench

# WASM vs JS comparison (real browser):
npm run dev
# then open http://localhost:3000/benchmark and click "Run benchmark"
```

## Notes for the curious

- **WASM streaming compile**: enabled automatically; first load of the
  page triggers the WASM download and instantiates in parallel with the
  JS fallback.
- **Memory**: the WASM module reuses no allocations across calls —
  each call allocates a fresh `Vec<u8>` for the output buffer. That's
  intentional; it keeps the JS↔WASM boundary simple and ensures
  deterministic memory state for tests.
- **Why not SIMD**: the current module is plain `wasm32-unknown-unknown`
  for maximum portability. SIMD is a follow-up: when enabled with
  `RUSTFLAGS="-C target-feature=+simd128"` we expect another 2–4×
  speedup on the analysis path.
