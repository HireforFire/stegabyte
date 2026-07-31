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

// Polyfill Blob.prototype.arrayBuffer for jsdom (the bundled Blob
// implementation pre-dates the arrayBuffer method on some Node versions,
// and our PNG sniffer uses it to read the first 26 bytes of an
// uploaded file). The polyfill is a no-op when the method already
// exists, so it's safe to install unconditionally.
if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
      reader.readAsArrayBuffer(this);
    });
  };
}

// Avoid noisy console.error from jsdom's missing implementations.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("Not implemented: HTMLCanvasElement.prototype.getContext")) return;
  originalError(...args);
};
