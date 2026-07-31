"use client";

/**
 * Eagerly primes the WASM stego core on first mount so the first user
 * operation doesn't pay the load cost. Mounted invisibly at the root of
 * the layout tree.
 */
import { useWasmStego } from "@/hooks/use-wasm-stego";

export function WasmStegoPriming() {
  useWasmStego();
  return null;
}
