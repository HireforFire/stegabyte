import type { Metadata } from "next";
import { ExtractPage } from "@/features/extract/extract-page";

export const metadata: Metadata = {
  title: "Extract",
  description: "Recover hidden messages from PNG images.",
};

export default function Page() {
  return <ExtractPage />;
}
