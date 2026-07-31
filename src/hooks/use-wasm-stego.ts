/**
 * React hook that lazy-loads the WASM stego core on mount and exposes the
 * loaded module (or `null` until it's ready). On WebAssembly-unsupported
 * environments the hook resolves to a JS-core-backed module that the
 * caller can use as a drop-in replacement.
 *
 * The hook is intentionally idempotent and SSR-safe: the `loadWasm()`
 * promise is module-scoped, so multiple components calling it share a
 * single network fetch.
 */
import * as React from "react";
import { loadWasm, type WasmStegoModule } from "@/lib/stego/wasm-loader";

interface WasmStegoState {
  module: WasmStegoModule | null;
  loading: boolean;
  error: Error | null;
}

export function useWasmStego(): WasmStegoState {
  const [state, setState] = React.useState<WasmStegoState>({
    module: null,
    loading: false,
    error: null,
  });

  React.useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }));
    loadWasm()
      .then((module) => {
        if (cancelled) return;
        setState({ module, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          module: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
