"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Download, ShieldCheck, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropZone, ImagePreview } from "@/components/ui/dropzone";
import { CapacityMeter } from "@/components/ui/capacity-meter";
import { PasswordStrength } from "@/components/ui/password-strength";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TechLabel } from "@/components/ui/tech-label";
import { TechButton } from "@/components/ui/tech-button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/ui/toaster";
import { useEncryptStore } from "@/stores/encrypt-store";
import { useCryptoWorker } from "@/hooks/use-crypto-worker";
import { readPngPixels, encodeAndRenderPng, isPngBuffer } from "@/lib/stego/png-lsb";
import { formatBytes, hexToBytes } from "@/lib/utils";

const schema = z.object({
  message: z.string().min(1, "Message is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

export function EncryptPage() {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [imageBuffer, setImageBuffer] = React.useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [capacity, setCapacity] = React.useState(0);
  const [showPassword, setShowPassword] = React.useState(false);

  const store = useEncryptStore();
  const { encryptInWorker } = useCryptoWorker();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "", password: "" },
  });

  const password = watch("password");

  const handleFile = React.useCallback(
    async (file: File) => {
      setFileName(file.name);
      store.setImageFile(file);
      const buf = await file.arrayBuffer();
      setImageBuffer(buf);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      try {
        if (!isPngBuffer(buf)) {
          store.setError("File is not a valid PNG (magic bytes mismatch).");
          notify.error("File is not a valid PNG.");
          return;
        }
        const { width, height } = await readPngPixels(buf);
        const numPixels = width * height;
        const cap = Math.floor((numPixels * 3) / 8);
        setCapacity(cap);
        store.setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not read image.";
        store.setError(msg);
        notify.error(msg);
      }
    },
    [store],
  );

  const handleClear = React.useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setImageBuffer(null);
    setCapacity(0);
    store.setImageFile(null);
    store.reset();
  }, [previewUrl, store]);

  const onSubmit = React.useCallback(
    async ({ message, password }: FormValues) => {
      if (!imageBuffer) {
        notify.error("Please select an image first.");
        return;
      }

      setLoading(true);
      setProgress(0);
      store.setStatus("encrypting");
      store.setError(null);

      try {
        const { pixels: pxData, width, height } = await readPngPixels(imageBuffer);
        // `readPngPixels` already returns a freshly-allocated Uint8Array
        // (not aliased to the canvas), so we can use it directly. The
        // copy was a v1.0 workaround that just allocated a second buffer.
        const pixelBytes = pxData;

        store.setProgress(0.15);
        const encrypted = await encryptInWorker({ plaintext: message, password });

        store.setStatus("embedding");
        store.setProgress(0.45);
        // Use the validated `hexToBytes` helper instead of inline parseInt —
        // a malformed bundle now throws a clear error instead of silently
        // producing NaN-truncated bytes.
        const payloadBytes = hexToBytes(encrypted.ciphertext);

        // Compute the plaintext byte length AFTER encryption so the value
        // matches what was actually fed into the worker (no risk of
        // divergence from whitespace normalization or form trimming).
        const plaintextByteLength = new TextEncoder().encode(message).length;

        store.setProgress(0.65);
        const encodeResult = encodeAndRenderPng(
          pixelBytes,
          payloadBytes.buffer,
          width,
          height,
          plaintextByteLength,
        );

        store.setResult(
          encodeResult.dataUrl,
          encodeResult.capacityUsed,
          encodeResult.capacityTotal,
        );
        store.setProgress(1);

        notify.success("Message encrypted and hidden successfully.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error.";
        store.setError(msg);
        notify.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [imageBuffer, store, encryptInWorker],
  );

  const downloadResult = React.useCallback(() => {
    const { resultDataUrl } = useEncryptStore.getState();
    if (!resultDataUrl) return;
    const link = document.createElement("a");
    link.download = "Stegabyte-encrypted.png";
    link.href = resultDataUrl;
    link.click();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-3"
      >
        <TechLabel color="indigo">Workspace · Encrypt</TechLabel>
        <h1 className="text-3xl font-extralight tracking-tight text-white/90 md:text-4xl">
          Encrypt & Embed
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/40">
          Write a message, set a password, and hide the encrypted ciphertext inside a PNG
          image using least-significant-bit steganography. Everything runs locally.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Carrier Image</CardTitle>
              <Badge variant="indigo">PNG</Badge>
            </div>
            <CardDescription>
              Upload a PNG to serve as the hiding container. Larger images hold more data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DropZone
              accept="image/png"
              onFile={handleFile}
              fileName={fileName ?? undefined}
              onClear={handleClear}
              preview={
                previewUrl ? (
                  <ImagePreview src={previewUrl} alt="Carrier preview" />
                ) : null
              }
            />
            {capacity > 0 && (
              <div className="mt-5">
                <CapacityMeter used={0} total={capacity} label="Available capacity" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Secret Message</CardTitle>
            <CardDescription>
              Will be encrypted with AES-256-GCM before embedding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="msg">
                Your message <span className="text-[#fca5a5]/80">*</span>
              </Label>
              <Textarea
                id="msg"
                placeholder="Lorem ipsum..."
                aria-required="true"
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "msg-error" : undefined}
                {...register("message")}
              />
              {errors.message && (
                <p
                  id="msg-error"
                  className="flex items-center gap-1.5 text-xs text-[#fca5a5]"
                  role="alert"
                >
                  <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
                  {errors.message.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">
                Password <span className="text-[#fca5a5]/80">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "pw-error" : undefined}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="pw-error"
                  className="flex items-center gap-1.5 text-xs text-[#fca5a5]"
                  role="alert"
                >
                  <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
                  {errors.password.message}
                </p>
              )}
              <PasswordStrength password={password} />
            </div>
          </CardContent>
        </Card>

        <TechButton
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!imageBuffer || loading}
          icon={loading ? undefined : <Lock className="h-4 w-4" />}
          className="w-full"
        >
          {loading ? "Processing…" : "Encrypt + Embed"}
        </TechButton>
      </form>

      <AnimatePresence>
        {store.status === "done" && store.resultDataUrl && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            role="status"
            aria-live="polite"
            ref={(el) => {
              // After the result appears, move focus to the heading so SR
              // users hear the success state without tabbing forward. The
              // tabIndex={-1} makes the heading focusable without putting
              // it in the tab order.
              if (el) {
                (el as unknown as HTMLElement).tabIndex = -1;
                (el as unknown as HTMLElement).focus({ preventScroll: true });
              }
            }}
          >
            <GlassPanel tint="cyan" className="p-6 md:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <TechLabel color="cyan">Encryption Complete</TechLabel>
                <ShieldCheck aria-hidden className="h-5 w-5 text-[#67e8f4]/70" />
              </div>
              <p className="mb-5 text-sm leading-relaxed text-white/40">
                {formatBytes(store.capacityUsed)} used of{" "}
                {formatBytes(store.capacityTotal)} capacity.
              </p>
              {store.resultDataUrl && (
                <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-md border border-white/10">
                  <img
                    src={store.resultDataUrl}
                    alt="Encrypted result"
                    className="h-auto w-full"
                  />
                </div>
              )}
              <TechButton
                variant="cyan"
                className="mt-5 w-full"
                onClick={downloadResult}
                icon={<Download className="h-4 w-4" />}
              >
                Download encrypted PNG
              </TechButton>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {store.status === "error" && store.error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="flex items-center gap-3 rounded-md border border-crimson/30 bg-crimson/[0.04] p-4 text-sm text-[#fca5a5]"
          >
            <AlertTriangle aria-hidden className="h-4 w-4 flex-shrink-0" />
            <span>{store.error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingOverlay
        open={loading}
        label={
          store.status === "encrypting" ? "Encrypting message…" : "Embedding into image…"
        }
        description="All operations run locally in your browser."
        progress={progress}
      />
    </div>
  );
}
