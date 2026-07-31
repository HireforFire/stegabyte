import "@testing-library/jest-dom/vitest";

// Polyfill SubtleCrypto for jsdom (used by our crypto tests).
import { webcrypto } from "node:crypto";

if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: false,
    configurable: false,
  });
}

// MatchMedia stub for components that read prefers-reduced-motion.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Avoid noisy console.error from jsdom's missing implementations.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("Not implemented: HTMLCanvasElement.prototype.getContext")) return;
  originalError(...args);
};
