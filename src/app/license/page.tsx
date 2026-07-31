import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "License",
  description: "MIT License — Stegabyte is open-source.",
};

const sections: LegalSection[] = [
  {
    id: "summary",
    title: "License summary",
    body: (
      <>
        <p>
          Stegabyte is released under the <strong>MIT License</strong>, one of the most
          permissive open-source licenses. You can use, modify, distribute, and sublicense
          the code for any purpose, including commercial, provided you retain the
          copyright notice.
        </p>
        <p>
          The MIT License is approved by the Open Source Initiative (OSI) and is
          compatible with the GNU GPL.
        </p>
      </>
    ),
  },
  {
    id: "full-text",
    title: "Full license text",
    body: (
      <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/40 p-5 font-mono text-[11px] leading-relaxed text-white/70">
        {`MIT License

Copyright (c) 2026 Stegabyte Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
      </pre>
    ),
  },
  {
    id: "third-party",
    title: "Third-party acknowledgments",
    body: (
      <>
        <p>Stegabyte depends on the following open-source packages:</p>
        <ul>
          <li>
            <strong>Next.js</strong> — MIT License, © Vercel Inc.
          </li>
          <li>
            <strong>React</strong> — MIT License, © Meta Platforms Inc.
          </li>
          <li>
            <strong>Tailwind CSS</strong> — MIT License, © Tailwind Labs Inc.
          </li>
          <li>
            <strong>Framer Motion</strong> — MIT License, © Framer BV.
          </li>
          <li>
            <strong>Lucide Icons</strong> — ISC License, © Lucide Contributors.
          </li>
          <li>
            <strong>Sonner (toast)</strong> — MIT License, © Emil Kowalski.
          </li>
          <li>
            <strong>Zod</strong> — MIT License, © Colin McDonald.
          </li>
          <li>
            <strong>Zustand</strong> — MIT License, © Poimandres.
          </li>
        </ul>
        <p>
          All cryptographic operations use the platform-native Web Crypto API; no
          third-party cryptography is bundled.
        </p>
      </>
    ),
  },
  {
    id: "trademark",
    title: "Trademark",
    body: (
      <>
        <p>
          "Stegabyte" is the name of this project. The author does not assert any
          trademark in the name at this time. If you fork or self-host the code, you are
          encouraged — but not required — to use a different name to avoid user confusion.
        </p>
        <p>
          The 4-byte magic header <code>CRYX</code> embedded inside every Stegabyte PNG is
          a file-format identifier and is not a trademark.
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="Legal · License"
      title="License"
      effective="2026-07-30"
      intro={
        <>
          Stegabyte is open-source under the MIT License. The full text is reproduced
          below. Acknowledgments for third-party dependencies are also listed.
        </>
      }
      sections={sections}
    />
  );
}
