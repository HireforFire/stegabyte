import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Stegabyte protects your data: algorithms, threat model, and responsible disclosure.",
};

const sections: LegalSection[] = [
  {
    id: "summary",
    title: "Security summary",
    body: (
      <>
        <p>
          Stegabyte uses industry-standard, peer-reviewed cryptographic primitives with
          conservative parameters. There is no server, so there is no server-side attack
          surface for user messages.
        </p>
      </>
    ),
  },
  {
    id: "algorithms",
    title: "1. Algorithms and parameters",
    body: (
      <>
        <p>
          The pipeline uses the following primitives and parameters, all of which are
          NIST-approved or RFC-standardized:
        </p>
        <ul>
          <li>
            <strong>Encryption:</strong> AES-256-GCM (FIPS 197, NIST SP 800-38D). 256-bit
            key, 96-bit IV, 128-bit authentication tag.
          </li>
          <li>
            <strong>Key derivation:</strong> PBKDF2 with HMAC-SHA512 (RFC 8018). 600,000
            iterations, 32-byte (256-bit) per-image random salt.
          </li>
          <li>
            <strong>Random number generation:</strong> <code>crypto.getRandomValues</code>{" "}
            — the browser's CSPRNG, which on modern platforms draws from the OS entropy
            pool.
          </li>
          <li>
            <strong>Steganography:</strong> 3-channel LSB on R, G, B with a 14-byte header
            (<code>CRYX</code> magic, format version, payload length, plaintext length).
          </li>
        </ul>
        <p>
          No custom cryptography is implemented; all primitive operations are delegated to
          the platform-native Web Crypto API.
        </p>
      </>
    ),
  },
  {
    id: "no-plaintext-leaves-device",
    title: "2. What is and is not sent over the network",
    body: (
      <>
        <p>
          Stegabyte never sends your plaintext, password, salt, IV, ciphertext, or carrier
          image to any server. The application is a static bundle served at the edge by
          Vercel. The only network requests are:
        </p>
        <ul>
          <li>Static asset loads (HTML, JS, CSS, fonts) from the deploy domain.</li>
          <li>The PWA manifest.</li>
          <li>
            (Optional) Service worker fetches, which only touch the same-origin static
            bundle.
          </li>
        </ul>
        <p>
          The Content Security Policy in the production <code>next.config.ts</code>{" "}
          forbids any other network call from the page.
        </p>
      </>
    ),
  },
  {
    id: "threat-model",
    title: "3. Threat model",
    body: (
      <>
        <p>
          <strong>Trusted:</strong> the user's device and browser; the Web Crypto API
          implementation of the platform; the integrity of the application bundle served
          over HTTPS.
        </p>
        <p>
          <strong>Untrusted:</strong> the network through which the carrier image travels;
          any third party who observes the carrier image; any future storage service that
          hosts the carrier image.
        </p>
        <p>
          <strong>Out of scope:</strong> malware on the user's device; keyloggers;
          compromised browsers; shoulder surfing; loss of password. These cannot be
          mitigated by any client-side tool.
        </p>
      </>
    ),
  },
  {
    id: "known-limitations",
    title: "4. Known limitations",
    body: (
      <>
        <ul>
          <li>
            <strong>LSB is detectable.</strong> A trained statistical detector can find
            LSB anomalies in any image. Stegabyte provides an entropy / LSB suspicion
            meter on the <a href="/analyze">Analyze</a> page so you can see what an
            analyst would see.
          </li>
          <li>
            <strong>PNG-only carrier.</strong> JPEG recompression destroys LSB data.
            Stegabyte intentionally restricts to lossless PNG.
          </li>
          <li>
            <strong>Single carrier.</strong> Each message is embedded in one image. There
            is no multi-image splitting.
          </li>
          <li>
            <strong>No password escrow / no recovery.</strong> A forgotten password is a
            permanently lost message. This is intentional.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "headers",
    title: "5. HTTP security headers",
    body: (
      <>
        <p>The production deployment sets the following headers:</p>
        <ul>
          <li>
            <code>Content-Security-Policy</code> — strict default-src 'self'; object-src
            'none'; media-src 'self'; manifest-src 'self'; frame-ancestors 'none'.
          </li>
          <li>
            <code>Strict-Transport-Security</code> — HSTS with preload eligibility.
          </li>
          <li>
            <code>Permissions-Policy</code> — denies 22 sensitive features (camera,
            microphone, geolocation, USB, etc.).
          </li>
          <li>
            <code>X-Content-Type-Options: nosniff</code>,{" "}
            <code>Referrer-Policy: strict-origin-when-cross-origin</code>,{" "}
            <code>X-Frame-Options: DENY</code>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "responsible-disclosure",
    title: "6. Responsible disclosure",
    body: (
      <>
        <p>
          If you have discovered a security vulnerability in Stegabyte, please open a{" "}
          <strong>
            <a href="https://github.com/HireforFire/stegabyte/security/advisories/new">
              private security advisory on GitHub
            </a>
          </strong>
          . We aim to acknowledge reports within 72 hours and to issue a fix within 30
          days for critical issues.
        </p>
        <p>
          Please do not publicly disclose the vulnerability until we have shipped a fix or
          90 days have elapsed, whichever comes first.
        </p>
        <p>
          Hall of fame: <em>(no reports received to date)</em>.
        </p>
      </>
    ),
  },
  {
    id: "audits",
    title: "7. Audits",
    body: (
      <>
        <p>
          Stegabyte has not yet been the subject of a formal third-party security audit.
          The implementation is small enough ({"<"} 1,000 lines of cryptographic code) to
          be reviewed by a competent cryptographer in a few hours; all cryptographic
          primitives are delegated to the Web Crypto API and are not implemented in the
          application source.
        </p>
      </>
    ),
  },
  {
    id: "updates",
    title: "8. How updates are delivered",
    body: (
      <>
        <p>
          Stegabyte is deployed as a static bundle. Updates are pushed through a new
          deployment, which is verified by HTTPS and the browser's standard caching rules.
          There is no auto-update mechanism that could be tampered with on the wire.
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="Legal · Security"
      title="Security & Cryptography"
      effective="2026-07-30"
      intro={
        <>
          This page documents how Stegabyte protects your data, what its threat model is,
          and what its known limitations are. It is part of our commitment to
          transparency: if a security property is not documented here, it is not promised.
        </>
      }
      sections={sections}
    />
  );
}
