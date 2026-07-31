"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UploadCloud, FileImage, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CornerBrackets } from "./glass-panel";

export interface DropZoneProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onDrop"
> {
  accept?: string | undefined;
  onFile: (file: File) => void;
  maxSize?: number | undefined;
  hint?: string | undefined;
  preview?: React.ReactNode | undefined;
  fileName?: string | undefined;
  onClear?: (() => void) | undefined;
}

export const DropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(function DropZone(
  {
    accept = "image/png",
    onFile,
    maxSize = 25 * 1024 * 1024,
    hint = "Drag and drop a file, or press Enter to browse",
    preview,
    fileName,
    onClear,
    className,
    ...props
  },
  ref,
) {
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  const handleFile = React.useCallback(
    (file: File) => {
      setError(null);
      if (accept && !file.type.match(accept.replace("*", ".*"))) {
        setError(`Unsupported file type: ${file.type || "unknown"}`);
        setAnnouncement(`Unsupported file type.`);
        return;
      }
      if (maxSize && file.size > maxSize) {
        setError(`File exceeds maximum size.`);
        setAnnouncement("File is too large.");
        return;
      }
      onFile(file);
      setAnnouncement(`Selected ${file.name}`);
    },
    [accept, maxSize, onFile],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
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
        onClick={() => inputRef.current?.click()}
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
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
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
              : `${hint} · ${accept.replace(/.*\//, "").toUpperCase()}`}
          </p>
        </div>
        {error && (
          <p className="relative z-10 text-xs font-normal text-[#fca5a5]" role="alert">
            {error}
          </p>
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
  alt?: string;
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
