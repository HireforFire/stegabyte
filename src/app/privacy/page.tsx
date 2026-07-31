import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Stegabyte's privacy commitment: zero data collection, no servers, no analytics, no cookies.",
};

const sections: LegalSection[] = [
  {
    id: "summary",
    title: "Summary",
    body: (
      <>
        <p>
          Stegabyte does not collect, transmit, store, or process any personal data on any
          server. The service runs entirely in your browser. No account is required. No
          analytics SDK is loaded. No cookies are set. No plaintext ever leaves your
          device.
        </p>
        <p>
          This policy is intentionally short because the data we process is{" "}
          <strong>none</strong>.
        </p>
      </>
    ),
  },
  {
    id: "what-is-processed",
    title: "1. What data is processed on your device",
    body: (
      <>
        <p>
          The following data is processed locally in your browser using the Web Crypto API
          and Canvas APIs. None of this data is sent to any server:
        </p>
        <ul>
          <li>The plaintext message you type on the Encrypt page.</li>
          <li>The password you supply for key derivation.</li>
          <li>The carrier PNG image you upload (read as bytes).</li>
          <li>
            The encrypted, embedded PNG you download (produced locally and never
            transmitted).
          </li>
        </ul>
        <p>
          All of the above are processed in a sandboxed Web Worker and discarded from
          memory when the page is closed.
        </p>
      </>
    ),
  },
  {
    id: "no-collection",
    title: "2. What we do not collect",
    body: (
      <ul>
        <li>No usernames, email addresses, or authentication credentials.</li>
        <li>No uploaded files, messages, images, or extracted content.</li>
        <li>
          No analytics: we do not use Google Analytics, Plausible, Fathom, PostHog, or any
          other analytics or telemetry SDK.
        </li>
        <li>No tracking pixels, no fingerprinting, no session recording.</li>
        <li>
          No cookies. The application does not read or write <code>document.cookie</code>.
        </li>
        <li>
          No third-party fonts, scripts, or CDN-hosted resources. All assets are bundled
          with the application at build time.
        </li>
      </ul>
    ),
  },
  {
    id: "local-storage",
    title: "3. Browser local storage",
    body: (
      <>
        <p>
          Stegabyte stores a single key in <code>localStorage</code> with the prefix{" "}
          <code>Stegabyte.</code> for UI preferences (e.g. reduced motion, auto-analyze
          toggle). This data never leaves your browser and can be cleared at any time from
          the Settings page.
        </p>
        <p>
          Clearing this data has no effect on the cryptographic behavior of the
          application.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "4. Third parties and subprocessors",
    body: (
      <>
        <p>
          Stegabyte has no subprocessors, vendors, or third-party services that process
          user data. The site is deployed as a static bundle to{" "}
          <a href="https://vercel.com" target="_blank" rel="noreferrer">
            Vercel
          </a>
          ; Vercel's role is limited to serving static files at the edge and never sees
          your plaintext, password, or images. Vercel's own privacy practices apply only
          to its own logging (e.g. request IPs) and are governed by Vercel's privacy
          policy.
        </p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "5. Children's privacy (COPPA)",
    body: (
      <>
        <p>
          Stegabyte is not directed at children under the age of 13. We do not knowingly
          collect personal data from children. Because we collect no personal data from
          anyone, this provision is moot in practice but stated for regulatory
          completeness.
        </p>
      </>
    ),
  },
  {
    id: "gdpr",
    title: "6. GDPR (EU / EEA / UK)",
    body: (
      <>
        <p>
          Under the GDPR, Stegabyte is neither a controller nor a processor of personal
          data because no personal data leaves your device. No Data Processing Agreement
          is required. No Data Protection Officer has been appointed because no personal
          data is processed at scale.
        </p>
        <p>
          If you are an EU/EEA/UK user, your rights (access, rectification, erasure,
          restriction, portability, objection) are satisfied vacuously because nothing
          about you is recorded.
        </p>
      </>
    ),
  },
  {
    id: "us-state-privacy-laws",
    title: "7. US state privacy laws",
    body: (
      <>
        <p>
          Stegabyte does not collect, sell, or share personal information as those terms
          are used in applicable US state privacy statutes (including the CCPA, CPRA,
          VCDPA, CPA, CTDPA, UCPA, and similar laws). The rights those statutes grant — to
          know, delete, correct, and limit use of personal information — do not apply
          because no personal information is collected.
        </p>
      </>
    ),
  },
  {
    id: "data-breach",
    title: "8. Data breach disclosure",
    body: (
      <>
        <p>
          Because no personal data is stored on any server controlled by Stegabyte, there
          is no realistic data-breach scenario in which user messages would be exposed.
          The application's threat model assumes that the user's device is trusted and the
          carrier image travels through third parties (e.g. email, cloud storage,
          messaging apps); that is the entire purpose of end-to-end local encryption.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "9. Changes to this policy",
    body: (
      <>
        <p>
          If we change this policy in a material way, we will update the effective date
          and post a notice on the homepage. Continued use of the service after such
          changes constitutes acceptance of the revised policy.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "10. Contact",
    body: (
      <>
        <p>
          Privacy questions: open an issue at{" "}
          <strong>
            <a href="https://github.com/HireforFire/stegabyte/issues">
              github.com/HireforFire/stegabyte/issues
            </a>
          </strong>
          .
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="Legal · Privacy"
      title="Privacy Policy"
      effective="2026-07-30"
      intro={
        <>
          Stegabyte is a privacy-first steganography platform. This policy explains what
          data is processed, where, and by whom. The short answer:{" "}
          <strong>no data leaves your device</strong>.
        </>
      }
      sections={sections}
    />
  );
}
