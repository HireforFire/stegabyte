/**
 * Tests for the File System Access API wrapper.
 *
 * Coverage goals:
 * - `isNativePngPickerSupported` correctly detects each branch
 *   (SSR, insecure context, missing API, present API).
 * - `tryNativePngPicker` returns `null` for unsupported browsers.
 * - `tryNativePngPicker` returns `{ cancelled: true }` on AbortError.
 * - `tryNativePngPicker` returns `{ cancelled: false, files, via: "fsa" }`
 *   on success, including the `multiple` flag and types config.
 * - Non-AbortError exceptions propagate to the caller.
 *
 * These run under `// @vitest-environment jsdom` so `window` is defined,
 * but we override `window.showOpenFilePicker`, `window.isSecureContext`,
 * and the global `DOMException` per test.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  isNativePngPickerSupported,
  tryNativePngPicker,
} from "@/lib/files/picker";

// @vitest-environment jsdom

interface PickerMockOptions {
  isSecure?: boolean;
  showOpenFilePicker?: ((options?: unknown) => Promise<unknown[]>) | undefined;
  pickerError?: Error;
}

function installWindowMock(opts: PickerMockOptions): void {
  const w = window as unknown as Record<string, unknown>;
  if ("isSecureContext" in w) {
    // Some jsdom versions already expose this; leave it alone.
  }
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    get: () => opts.isSecure ?? true,
  });
  if (opts.showOpenFilePicker === undefined) {
    // Remove the property entirely if it was present.
    delete (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker;
  } else {
    Object.defineProperty(window, "showOpenFilePicker", {
      configurable: true,
      writable: true,
      value: opts.showOpenFilePicker,
    });
  }
}

function restoreWindow(): void {
  delete (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker;
  delete (window as unknown as { isSecureContext?: unknown }).isSecureContext;
}

describe("isNativePngPickerSupported", () => {
  afterEach(() => restoreWindow());

  it("returns false when window is undefined", () => {
    const original = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = undefined;
    try {
      expect(isNativePngPickerSupported()).toBe(false);
    } finally {
      (globalThis as Record<string, unknown>).window = original;
    }
  });

  it("returns false in an insecure context", () => {
    installWindowMock({ isSecure: false, showOpenFilePicker: () => Promise.resolve([]) });
    expect(isNativePngPickerSupported()).toBe(false);
  });

  it("returns false when showOpenFilePicker is missing", () => {
    installWindowMock({ isSecure: true, showOpenFilePicker: undefined });
    expect(isNativePngPickerSupported()).toBe(false);
  });

  it("returns true in a secure context with showOpenFilePicker", () => {
    installWindowMock({ isSecure: true, showOpenFilePicker: () => Promise.resolve([]) });
    expect(isNativePngPickerSupported()).toBe(true);
  });
});

describe("tryNativePngPicker", () => {
  afterEach(() => restoreWindow());

  it("returns null when the API is unsupported", async () => {
    installWindowMock({ isSecure: false, showOpenFilePicker: undefined });
    expect(await tryNativePngPicker()).toBeNull();
  });

  it("returns { cancelled: true } on AbortError", async () => {
    const abort = new DOMException("User aborted", "AbortError");
    installWindowMock({
      isSecure: true,
      showOpenFilePicker: () => Promise.reject(abort),
    });
    const result = await tryNativePngPicker();
    expect(result).toEqual({ files: [], via: "fsa", cancelled: true });
  });

  it("rethrows non-AbortError exceptions", async () => {
    const boom = new Error("unexpected");
    installWindowMock({
      isSecure: true,
      showOpenFilePicker: () => Promise.reject(boom),
    });
    await expect(tryNativePngPicker()).rejects.toBe(boom);
  });

  it("returns files on success and passes through options", async () => {
    const fakeFile = new File(["fake-png-bytes"], "test.png", { type: "image/png" });
    const calls: unknown[] = [];
    installWindowMock({
      isSecure: true,
      showOpenFilePicker: (options) => {
        calls.push(options);
        return Promise.resolve([{ getFile: () => Promise.resolve(fakeFile) }]);
      },
    });
    const result = await tryNativePngPicker({ multiple: true, description: "Carrier PNG" });
    expect(result).toEqual({ files: [fakeFile], via: "fsa", cancelled: false });
    expect(calls).toHaveLength(1);
    const opts = calls[0] as {
      multiple?: boolean;
      excludeAcceptAllOption?: boolean;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    };
    expect(opts.multiple).toBe(true);
    expect(opts.excludeAcceptAllOption).toBe(true);
    expect(opts.types?.[0]?.description).toBe("Carrier PNG");
    expect(opts.types?.[0]?.accept).toEqual({ "image/png": [".png"] });
  });

  it("defaults multiple to false and description to 'PNG image'", async () => {
    const calls: unknown[] = [];
    installWindowMock({
      isSecure: true,
      showOpenFilePicker: (options) => {
        calls.push(options);
        return Promise.resolve([]);
      },
    });
    await tryNativePngPicker();
    const opts = calls[0] as {
      multiple?: boolean;
      types?: Array<{ description?: string }>;
    };
    expect(opts.multiple).toBe(false);
    expect(opts.types?.[0]?.description).toBe("PNG image");
  });
});
