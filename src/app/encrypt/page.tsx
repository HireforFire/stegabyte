import type { Metadata } from "next";
import { EncryptPage } from "@/features/encrypt/encrypt-page";

export const metadata: Metadata = {
  title: "Encrypt",
  description:
    "Encrypt a message and hide it inside a PNG image using AES-256-GCM and LSB steganography.",
};

export default function Page() {
  return <EncryptPage />;
}
