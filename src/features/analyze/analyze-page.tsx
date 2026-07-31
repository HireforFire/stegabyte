"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  ImageIcon,
  Hash,
  Layers,
  AlertTriangle,
  ShieldCheck,
  Activity,
  BarChart3,
  RefreshCcw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { DropZone, ImagePreview } from "@/components/ui/dropzone";
import { Histogram } from "@/components/ui/histogram";
import { EntropyMeter } from "@/components/ui/entropy-meter";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TechLabel } from "@/components/ui/tech-label";
import { TechButton } from "@/components/ui/tech-button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/ui/toaster";
import { useWasmStego } from "@/hooks/use-wasm-stego";
import {
  analyzePng,
  decodePngLsb,
  readPngPixels,
  isPngBuffer,
} from "@/lib/stego/png-lsb";
import { formatBytes } from "@/lib/utils";

interface Analysis {
  width: number;
  height: number;
  fileSize: number;
  colorDepth: number;
  entropy: number;
  suspicion: number;
  histo: number[];
  capacity: number;
  payloadDetected: boolean;
  payloadVersion?: number | undefined;
  payloadLength?: number | undefined;
  payloadOriginalLength?: number | undefined;
}

export function AnalyzePage() {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [buffer, setBuffer] = React.useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const { module: wasm } = useWasmStego();

  const handleFile = React.useCallback(
    async (file: File) => {
      setFileName(file.name);
      const buf = await file.arrayBuffer();
      setBuffer(buf);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setAnalysis(null);

      if (!isPngBuffer(buf)) {
        notify.error("File is not a valid PNG.");
        return;
      }

      setLoading(true);
      try {
        const result = await analyzePng(buf);
        let payloadDetected = false;
        let payloadVersion: number | undefined;
        let payloadLength: number | undefined;
        let payloadOriginalLength: number | undefined;
        try {
          const { pixels, width, height } = await readPngPixels(buf);
          const decode = wasm
            ? wasm.decode(pixels, width, height)
            : decodePngLsb(pixels, width, height);
          payloadDetected = true;
          payloadVersion = decode.header.version;
          payloadLength = decode.header.payloadLength;
          payloadOriginalLength = decode.header.originalLength;
        } catch {
          payloadDetected = false;
        }

        setAnalysis({
          ...result,
          payloadDetected,
          payloadVersion,
          payloadLength,
          payloadOriginalLength,
        });
        notify.success("Analysis complete.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Analysis failed.";
        notify.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [wasm],
  );

  const handleClear = React.useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setBuffer(null);
    setAnalysis(null);
  }, [previewUrl]);

  const refresh = React.useCallback(async () => {
    if (!buffer) return;
    setLoading(true);
    try {
      const result = await analyzePng(buffer);
      setAnalysis((prev) =>
        prev ? { ...prev, ...result } : { ...result, payloadDetected: false },
      );
    } finally {
      setLoading(false);
    }
  }, [buffer]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-3"
      >
        <TechLabel color="cyan">Workspace · Analyze</TechLabel>
        <h1 className="text-3xl font-extralight tracking-tight text-white/90 md:text-4xl">
          Image Analysis
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/40">
          Inspect any PNG image to estimate its entropy, LSB-suspicion score, channel
          histogram, and detectable Stegabyte payloads.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Carrier</CardTitle>
            <Badge variant="indigo">PNG</Badge>
          </div>
          <CardDescription>
            All analysis runs locally — no image data is uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            accept="image/png"
            onFile={handleFile}
            fileName={fileName ?? undefined}
            onClear={handleClear}
            preview={
              previewUrl ? <ImagePreview src={previewUrl} alt="Carrier preview" /> : null
            }
          />
        </CardContent>
      </Card>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <GlassPanel
              tint={analysis.payloadDetected ? "indigo" : "neutral"}
              className="p-6 md:p-8"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <TechLabel color={analysis.payloadDetected ? "indigo" : "cyan"}>
                  {analysis.payloadDetected ? "Payload detected" : "Clean"}
                </TechLabel>
                <TechButton
                  variant="ghost"
                  onClick={refresh}
                  icon={<RefreshCcw className="h-4 w-4" />}
                >
                  Refresh
                </TechButton>
              </div>
              <div className="mb-4 flex items-center gap-3">
                {analysis.payloadDetected ? (
                  <AlertTriangle className="h-5 w-5 text-amber-300/80" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-300/80" />
                )}
                <h3 className="text-xl font-extralight tracking-tight text-white/90">
                  {analysis.payloadDetected
                    ? "Stegabyte Payload Detected"
                    : "No Stegabyte Payload Detected"}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-white/40">
                {analysis.payloadDetected
                  ? "An LSB payload matching the Stegabyte format is present in this image."
                  : 'No "CRYX" magic bytes were found in the LSB stream of this image.'}
              </p>
              {analysis.payloadDetected && (
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Stat label="Version" value={analysis.payloadVersion} />
                  <Stat label="Payload bytes" value={analysis.payloadLength} />
                  <Stat label="Plaintext bytes" value={analysis.payloadOriginalLength} />
                  <Stat
                    label="Capacity used"
                    value={
                      analysis.capacity > 0
                        ? `${Math.round(((analysis.payloadLength ?? 0) / analysis.capacity) * 100)}%`
                        : "-"
                    }
                  />
                </div>
              )}
            </GlassPanel>

            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat
                  icon={<ImageIcon className="h-3.5 w-3.5" />}
                  label="Resolution"
                  value={`${analysis.width}×${analysis.height}`}
                />
                <Stat
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="File size"
                  value={formatBytes(analysis.fileSize)}
                />
                <Stat
                  icon={<Layers className="h-3.5 w-3.5" />}
                  label="Color depth"
                  value={`${analysis.colorDepth}-bit`}
                />
                <Stat
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  label="Capacity"
                  value={formatBytes(analysis.capacity)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Entropy & LSB Analysis</CardTitle>
                  <Activity className="h-5 w-5 text-[#67e8f4]/70" />
                </div>
                <CardDescription>
                  Shannon entropy measures randomness. LSB suspicion detects bit-level
                  anomalies consistent with steganography.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EntropyMeter
                  value={analysis.entropy * 8}
                  suspicion={analysis.suspicion}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pixel Histogram</CardTitle>
                <CardDescription>
                  Distribution of byte intensities (0–255) across all RGBA channels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Histogram
                  data={analysis.histo}
                  className="border-white/8 rounded-md border bg-black/40"
                  height={120}
                />
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs tracking-[0.05em] text-white/50">
                  <div>
                    Min:{" "}
                    <span className="font-mono text-white/80">
                      {minBin(analysis.histo)}
                    </span>
                  </div>
                  <div className="text-center">
                    Max:{" "}
                    <span className="font-mono text-white/80">
                      {maxBin(analysis.histo)}
                    </span>
                  </div>
                  <div className="text-right">
                    Mean:{" "}
                    <span className="font-mono text-white/80">
                      {meanBin(analysis.histo).toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicators</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant={analysis.entropy * 8 >= 7.5 ? "warning" : "success"}>
                  <ScanLine className="h-3 w-3" /> Entropy{" "}
                  {analysis.entropy >= 0.94 ? "high" : "normal"}
                </Badge>
                <Badge variant={analysis.suspicion > 0.5 ? "warning" : "cyan"}>
                  LSB suspicion {Math.round(analysis.suspicion * 100)}%
                </Badge>
                <Badge variant={analysis.payloadDetected ? "warning" : "success"}>
                  {analysis.payloadDetected ? "Payload detected" : "No embedded payload"}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingOverlay open={loading} label="Analyzing image…" />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{label}</p>
      <p className="flex items-center gap-1.5 font-mono text-sm text-white/90">
        {icon}
        {value ?? "-"}
      </p>
    </div>
  );
}

function minBin(h: number[]): number {
  for (let i = 0; i < h.length; i++) if (h[i]! > 0) return i;
  return 0;
}
function maxBin(h: number[]): number {
  for (let i = h.length - 1; i >= 0; i--) if (h[i]! > 0) return i;
  return 0;
}
function meanBin(h: number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < h.length; i++) {
    sum += i * h[i]!;
    count += h[i]!;
  }
  return count === 0 ? 0 : sum / count;
}
