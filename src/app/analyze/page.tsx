import type { Metadata } from "next";
import { AnalyzePage } from "@/features/analyze/analyze-page";

export const metadata: Metadata = {
  title: "Analyze",
  description: "Inspect a PNG image for steganographic content.",
};

export default function Page() {
  return <AnalyzePage />;
}
