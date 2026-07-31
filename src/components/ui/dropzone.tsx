"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UploadCloud, FileImage, X, ImagePlus, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CornerBrackets } from "./glass-panel";
import { readPngHeader } from "@/lib/files/png-sniffer";
import { isNativePngPickerSupported, tryNativePngPicker } from "@/lib/files/picker";

export interface DropZoneProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onDrop"
> {
  /** Legacy `accept` prop — preserved for backward compatibility but ignored
   *  internally; we always restrict to PNGs via the magic-byte validator. */
  accept?: string | undefined;
  onFile: (file: File) => void;
  maxSize?: number | undefined;
  hint?: string | undefined;
  preview?: React.ReactNode | undefined;
  fileName?: string | undefined;
  onClear?: (() => void) | undefined;
  /**
   * Allow the user to pick more than one file at once. When `true`, the
   * native picker opens in multi-select mode (where supported) and the
   * fallback `<input type="file">` is given `multiple`. The validator still
   * runs per-file and silently drops non-PNG picks.
   *
   * Defaults to `false` — Stegabyte's encrypt/extract/analyze flow is
   * fundamentally one-carrier-at-a-time.
   */
  multiple?: boolean | undefined;
  /**
   * Fired after a successful pick with all accepted PNGs. Useful for
   * batch flows; ignored when `multiple` is false.
   */
  onFiles?: ((files: File[]) => void) | undefined;
}

const TOUCH_DEVICE_HINT =
  "PNG only. Other formats like JPEG, HEIC, and WebP re-encode pixels and destroy hidden data.";

/**
 * The educational message shown when the user picks a non-PNG file.
 *
 * Kept inline so the copy is reviewable in one place and consistent across
 * every DropZone instance.
 */
const NOT_A_PNG_MESSAGE =
  "This isn't a PNG. Stegabyte embeds data in raw pixels — formats that re-encode (JPEG, HEIC, WebP) destroy hidden bits.";

export const DropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(function DropZone(
  {
    // `accept` is intentionally unused — we filter via magic bytes instead
    // because OS-reported MIME is unreliable (see png-sniffer.ts).
    accept: _accept = "image/png",
    onFile,
    maxSize = 25 * 1024 * 1024,
    hint = "Drag and drop a file, or press Enter to browse",
    preview,
    fileName,
    onClear,
    multiple = false,
    onFiles,
    className,
    ...props
  },
  ref,
) {
  // Reference the unused parameter so the underscore-prefix is the canonical
  // "intentionally ignored" signal and we don't get an unused-var lint.
  void _accept;
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  // Tracks the pick source so aria-live announcements and CTA labels stay
  // specific ("Choose Image" for the button, "drag-and-drop" for drops).
  const nativeSupported = React.useMemo(() => isNativePngPickerSupported(), []);
  const [isTouch, setIsTouch] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none)");
    setIsTouch(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /**
   * Validate a single File via magic-byte sniff and accept/reject it.
   * Returns true if the file was accepted (caller may proceed).
   */
  const acceptIfPng = React.useCallback(
    async (file: File): Promise<boolean> => {
      if (maxSize && file.size > maxSize) {
        setError("File exceeds the 25 MB maximum size.");
        setAnnouncement("File is too large.");
        return false;
      }
      // Quick MIME check first (cheap), then magic-byte verification
      // (authoritative). The browser-reported type is unreliable — some
      // mobile browsers report `application/octet-stream` for everything.
      const header = await readPngHeader(file);
      if (!header.isPng) {
        setError(NOT_A_PNG_MESSAGE);
        setAnnouncement("Rejected: not a PNG.");
        return false;
      }
      // Reset prior errors on success.
      setError(null);
      return true;
    },
    [maxSize],
  );

  /**
   * Dispatch a validated pick to the parent. Single-file mode picks the
   * first PNG; multi-file mode reports all accepted PNGs.
   */
  const handleValidatedFiles = React.useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      if (multiple && onFiles) {
        onFiles(files);
        setAnnouncement(`Selected ${files.length} PNG file${files.length === 1 ? "" : "s"}`);
      } else {
        onFile(files[0]!);
        setAnnouncement(`Selected ${files[0]!.name}`);
      }
    },
    [multiple, onFile, onFiles],
  );

  const handleFiles = React.useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      const accepted: File[] = [];
      for (const file of files) {
        // Sequential awaits are intentional — running these in parallel
        // would make the rejection UX non-deterministic (race on setError
        // calls). The list is short (typically 1-3 files), so the cost is
        // negligible.
        const ok = await acceptIfPng(file);
        if (ok) accepted.push(file);
      }
      handleValidatedFiles(accepted);
    },
    [acceptIfPng, handleValidatedFiles],
  );

  /**
   * Native picker path (File System Access API where supported).
   * Returns true if it ran (whether or not the user picked anything),
   * false if it bailed out and the caller should try the input fallback.
   */
  const tryNativePick = React.useCallback(async (): Promise<boolean> => {
    if (!nativeSupported) return false;
    try {
      const result = await tryNativePngPicker({ multiple });
      if (result === null) return false;
      if (result.cancelled) {
        setAnnouncement("Picker cancelled.");
        return true;
      }
      await handleFiles(result.files);
      return true;
    } catch (err) {
      // Unexpected error — fall back to <input>.
      console.warn("[Stegabyte] Native picker failed, falling back to input:", err);
      return false;
    }
  }, [nativeSupported, multiple, handleFiles]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) void handleFiles(files);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Prefer native picker when available; falls back to <input> internally.
      if (nativeSupported) {
        void tryNativePick().then((handled) => {
          if (!handled) inputRef.current?.click();
        });
      } else {
        inputRef.current?.click();
      }
    }
  };

  const onSurfaceClick = () => {
    if (nativeSupported) {
      void tryNativePick().then((handled) => {
        if (!handled) inputRef.current?.click();
      });
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div
      className={cn("grid gap-4 md:grid-cols-[1fr_auto] md:items-stretch", className)}
      {...props}
    >
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={hint}
        aria-describedby={`${inputId}-hint`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        onClick={onSurfaceClick}
        className={cn(
          "group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center transition-all",
          "hover:border-cyan/40 hover:bg-white/[0.04]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50",
          drag && "border-cyan/60 bg-cyan/[0.05]",
          error && "border-crimson/40 bg-crimson/[0.04]",
        )}
      >
        <CornerBrackets size={6} colorClass={drag ? "bg-cyan/40" : "bg-white/10"} />
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,.png"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) void handleFiles(files);
            e.target.value = "";
          }}
        />
        <span id={`${inputId}-hint`} className="sr-only">
          {hint}
        </span>
        <span aria-live="polite" className="sr-only">
          {announcement}
        </span>
        <motion.span
          animate={drag ? { y: -4, scale: 1.04 } : { y: 0, scale: 1 }}
          className={cn(
            "relative z-10 grid h-14 w-14 place-items-center rounded-lg border bg-white/[0.03] text-[#67e8f4]/80",
            drag ? "border-cyan/40" : "border-white/10",
          )}
        >
          <UploadCloud className="h-6 w-6" />
        </motion.span>
        <div className="relative z-10 space-y-1">
          <p className="text-sm font-normal text-white/80">
            {drag ? "Release to upload" : fileName ? fileName : "Drag & drop a file here"}
          </p>
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/25">
            {fileName
              ? "Click to replace"
              : `${hint} · PNG`}
          </p>
          {isTouch && !fileName ? (
            <p className="pt-2 text-[10px] normal-case tracking-normal text-white/35">
              {TOUCH_DEVICE_HINT}
            </p>
          ) : null}
        </div>
        {error && (
          <div
            className="relative z-10 flex w-full max-w-md flex-col items-center gap-2"
            role="alert"
          >
            <p className="flex items-center gap-1.5 text-xs font-normal text-[#fca5a5]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
                onSurfaceClick();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white"
              aria-label="Pick another file"
            >
              <ImagePlus className="h-3 w-3" /> Pick another
            </button>
          </div>
        )}
        <AnimatePresence>
          {fileName && onClear && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute right-2 top-2 z-10 inline-flex h-9 items-center gap-1 rounded-md border border-white/10 bg-white/[0.06] px-3 text-[11px] uppercase tracking-[0.15em] text-white/40 hover:text-white/80"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {preview ? (
        <div
          className="glass-panel flex min-h-[200px] w-full items-center justify-center p-3 md:w-auto md:min-w-[200px]"
          data-slot="dropzone-preview"
        >
          {preview}
        </div>
      ) : null}
    </div>
  );
});

export function ImagePreview({
  src,
  alt = "Selected preview",
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-white/8 relative aspect-square w-full max-w-[220px] overflow-hidden rounded-lg border",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <span className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-cyan/80">
        <FileImage className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
