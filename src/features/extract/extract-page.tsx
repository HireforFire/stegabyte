"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Unlock, Copy, Download, AlertTriangle, Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropZone, ImagePreview } from "@/components/ui/dropzone";
import { PasswordStrength } from "@/components/ui/password-strength";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TechLabel } from "@/components/ui/tech-label";
import { TechButton } from "@/components/ui/tech-button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/ui/toaster";
import { useCryptoWorker } from "@/hooks/use-crypto-worker";
import { useWasmStego } from "@/hooks/use-wasm-stego";
import { readPngPixels, decodePngLsb, isPngBuffer } from "@/lib/stego/png-lsb";

export function ExtractPage() {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [imageBuffer, setImageBuffer] = React.useState<ArrayBuffer | null>(null);
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [processingLabel, setProcessingLabel] = React.useState("Reading pixels…");
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [showPlaintext, setShowPlaintext] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [headerInfo, setHeaderInfo] = React.useState<{
    version: number;
    originalLength: number;
  } | null>(null);

  const { decryptInWorker } = useCryptoWorker();
  const { module: wasm } = useWasmStego();

  const handleFile = React.useCallback(async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    setImageBuffer(buf);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    if (!isPngBuffer(buf)) {
      setError("File is not a valid PNG (magic bytes mismatch).");
      notify.error("File is not a valid PNG.");
      return;
    }
    setError(null);
    setPlaintext(null);
    setHeaderInfo(null);
    setShowPlaintext(false);
  }, []);

  const handleClear = React.useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setImageBuffer(null);
    setPlaintext(null);
    setHeaderInfo(null);
    setShowPlaintext(false);
  }, [previewUrl]);

  const handleExtract = React.useCallback(async () => {
    if (!imageBuffer) {
      notify.error("Please select a stego image first.");
      return;
    }
    if (!password || password.length < 8) {
      notify.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setProcessingLabel("Reading pixels…");
    setError(null);
    setPlaintext(null);
    setHeaderInfo(null);

    try {
      const { pixels, width, height } = await readPngPixels(imageBuffer);

      setProcessingLabel("Decoding LSBs…");
      const decodeResult = wasm
        ? wasm.decode(pixels, width, height)
        : decodePngLsb(pixels, width, height);

      setProcessingLabel("Decrypting payload…");
      const decrypted = await decryptInWorker({
        ciphertext: decodeResult.payload,
        password,
      });

      setHeaderInfo({
        version: decodeResult.header.version,
        originalLength: decodeResult.header.originalLength,
      });
      setPlaintext(decrypted.plaintext);
      notify.success("Message recovered successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error.";
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }, [imageBuffer, password, decryptInWorker, wasm]);

  const copyToClipboard = React.useCallback(() => {
    if (!plaintext) return;
    navigator.clipboard.writeText(plaintext).then(
      () => notify.success("Copied to clipboard."),
      (err: unknown) => {
        // Clipboard API rejects in insecure contexts (HTTP) or when
        // permission is denied. Surface the failure rather than
        // silently no-op'ing — and skip the notification if the
        // browser doesn't expose clipboard at all.
        const msg = err instanceof Error ? err.message : "Clipboard unavailable.";
        notify.error(`Couldn't copy to clipboard: ${msg}`);
      },
    );
  }, [plaintext]);

  const downloadPlaintext = React.useCallback(() => {
    if (!plaintext) return;
    const blob = new Blob([plaintext], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "Stegabyte-extracted.txt";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [plaintext]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-3"
      >
        <TechLabel color="cyan">Workspace · Extract</TechLabel>
        <h1 className="text-3xl font-extralight tracking-tight text-white/90 md:text-4xl">
          Extract & Decrypt
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/40">
          Upload a PNG with hidden data and the correct password to recover the original
          message.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Stego Image</CardTitle>
            <Badge variant="cyan">PNG</Badge>
          </div>
          <CardDescription>
            Drop the image that contains encrypted hidden data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleExtract();
            }}
            aria-busy={loading}
          >
            <DropZone
              accept="image/png"
              onFile={handleFile}
              fileName={fileName ?? undefined}
              onClear={handleClear}
              preview={
                previewUrl ? <ImagePreview src={previewUrl} alt="Stego preview" /> : null
              }
            />

            <div className="space-y-2">
              <Label htmlFor="extract-pw">
                Password <span className="text-[#fca5a5]/80">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="extract-pw"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  autoComplete="current-password"
                  aria-required="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-white/40 hover:text-white/70 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <TechButton
              type="submit"
              variant="cyan"
              disabled={!imageBuffer || loading}
              loading={loading}
              icon={<Unlock className="h-4 w-4" />}
              className="w-full"
            >
              Extract & Decrypt
            </TechButton>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {headerInfo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="border-white/8 rounded-md border bg-black/40 p-4 text-[11px] tracking-[0.05em] text-white/40"
          >
            Detected payload — version{" "}
            <span className="font-mono text-[#67e8f4]/80">{headerInfo.version}</span>,
            expected plaintext length{" "}
            <span className="font-mono text-[#67e8f4]/80">
              {headerInfo.originalLength}
            </span>{" "}
            bytes.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {plaintext && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            <GlassPanel tint="indigo" className="p-6 md:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <TechLabel color="indigo">Recovered Message</TechLabel>
                {showPlaintext ? (
                  <Eye className="h-5 w-5 text-[#a5aaff]/70" />
                ) : (
                  <EyeOff className="h-5 w-5 text-[#a5aaff]/70" />
                )}
              </div>
              <p className="mb-4 text-[11px] tracking-[0.05em] text-white/30">
                {plaintext.length} characters decoded.
              </p>
              <div className="border-white/8 relative min-h-[80px] overflow-x-auto rounded-md border bg-black/40 p-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-sm text-white/90">
                  {showPlaintext
                    ? plaintext
                    : 'Click "Show" to reveal the decrypted message.'}
                </pre>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <TechButton
                  variant="ghost"
                  onClick={() => setShowPlaintext((v) => !v)}
                  icon={
                    showPlaintext ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )
                  }
                >
                  {showPlaintext ? "Hide" : "Show"}
                </TechButton>
                <TechButton
                  variant="ghost"
                  onClick={copyToClipboard}
                  icon={<Copy className="h-4 w-4" />}
                >
                  Copy
                </TechButton>
                <TechButton
                  variant="ghost"
                  onClick={downloadPlaintext}
                  icon={<Download className="h-4 w-4" />}
                >
                  Download
                </TechButton>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-md border border-crimson/30 bg-crimson/[0.04] p-4 text-sm text-[#fca5a5]"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingOverlay
        open={loading}
        label={processingLabel}
        description="All operations run locally in your browser."
      />
    </div>
  );
}
