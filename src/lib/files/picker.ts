/**
 * Wrapper around the browser's native file-picker APIs.
 *
 * Strategy:
 * 1. On browsers that support the File System Access API
 *    (`window.showOpenFilePicker` — Chromium-based desktops: Chrome 86+,
 *    Edge 86+, Opera 72+, Brave), use it. This gives us a fully-controlled
 *    picker with PNG filter hints and the OS's built-in sort menu.
 * 2. On all other browsers (Safari, Firefox, iOS Safari, Android Chrome
 *    WebView, etc.), fall back to the legacy `<input type="file">` flow.
 *    The DropZone component handles that case itself.
 *
 * This wrapper is purely additive: it never throws on unsupported browsers.
 * It returns `null` from `tryNativePngPicker` to signal "fall back", and the
 * DropZone falls back automatically.
 *
 * Privacy: the File System Access API does not transmit the file's contents
 * anywhere. It opens a native OS dialog (same as `<input>`) and hands us
 * a `FileSystemFileHandle` that we read locally.
 */

export interface PickerOptions {
  /** Allow selecting more than one file. Defaults to `false`. */
  multiple?: boolean;
  /** Optional human-readable description shown in the OS picker. */
  description?: string;
}

export interface PickerResult {
  /** The selected files. Empty if cancelled or no files selected. */
  files: File[];
  /**
   * Which API succeeded.
   * - `"fsa"`: File System Access API (`window.showOpenFilePicker`).
   * - `"input"`: legacy `<input type="file">` fallback.
   * - `null`: nothing ran (e.g. unsupported browser for the native path).
   */
  via: "fsa" | "input" | null;
  /** True if the user dismissed the dialog without selecting. */
  cancelled: boolean;
}

/**
 * The minimal shape of the File System Access API we use.
 *
 * This is declared locally so we don't have to install `@types/dom` patches
 * for browsers that haven't shipped the API yet. If `window.showOpenFilePicker`
 * is present at runtime, we know it conforms to this shape.
 */
interface ShowOpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}

interface OpenFilePickerFileHandle {
  getFile(): Promise<File>;
}

interface WindowWithFilePicker extends Window {
  showOpenFilePicker?: (options?: ShowOpenFilePickerOptions) => Promise<OpenFilePickerFileHandle[]>;
}

/**
 * Detect support without triggering any user prompts.
 *
 * Returns true only when `window.showOpenFilePicker` is callable and
 * we're in a secure context (HTTPS or localhost — required by the spec).
 */
export function isNativePngPickerSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (!window.isSecureContext) {
    return false;
  }
  const w = window as WindowWithFilePicker;
  return typeof w.showOpenFilePicker === "function";
}

/**
 * Attempt to open the native PNG-only file picker.
 *
 * Returns `null` if the browser doesn't support the File System Access API
 * — caller should fall back to `<input type="file">`.
 *
 * Returns `{ cancelled: true, files: [], via: "fsa" }` if the user dismisses
 * the dialog without picking.
 *
 * Returns `{ cancelled: false, files: [...], via: "fsa" }` on success.
 */
export async function tryNativePngPicker(opts: PickerOptions = {}): Promise<PickerResult | null> {
  if (!isNativePngPickerSupported()) {
    return null;
  }
  const w = window as WindowWithFilePicker;
  try {
    const handles = await w.showOpenFilePicker!({
      multiple: opts.multiple ?? false,
      excludeAcceptAllOption: true,
      types: [
        {
          description: opts.description ?? "PNG image",
          accept: { "image/png": [".png"] },
        },
      ],
    });
    const files = await Promise.all(handles.map((h) => h.getFile()));
    return { files, via: "fsa", cancelled: false };
  } catch (err) {
    // The FSA API throws `AbortError` (DOMException name === "AbortError")
    // when the user dismisses the picker. Any other error is unexpected —
    // bubble it up so the caller can decide what to do.
    if (err instanceof DOMException && err.name === "AbortError") {
      return { files: [], via: "fsa", cancelled: true };
    }
    throw err;
  }
}
