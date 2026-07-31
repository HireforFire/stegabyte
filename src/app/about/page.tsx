import type { Metadata } from "next";
import { AboutPage } from "@/features/about/about-page";

export const metadata: Metadata = {
  title: "About",
  description: "How Stegabyte works and what's under the hood.",
};

export default function Page() {
  return <AboutPage />;
}
