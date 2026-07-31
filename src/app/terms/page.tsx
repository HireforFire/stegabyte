import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of Stegabyte.",
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of terms",
    body: (
      <>
        <p>
          By accessing or using Stegabyte at <code>stegabyte.app</code> (the "Service"),
          you agree to be bound by these Terms of Service ("Terms"). If you do not agree,
          do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "license-grant",
    title: "2. License to use",
    body: (
      <>
        <p>
          Stegabyte is open-source software licensed under the MIT License (see{" "}
          <a href="/license">/license</a>). Subject to your compliance with these Terms,
          you are granted a non-exclusive, royalty-free, worldwide, non-transferable
          license to use the Service for lawful purposes only.
        </p>
        <p>You may also self-host the application; the source code is public.</p>
      </>
    ),
  },
  {
    id: "no-warranty",
    title: "3. No warranty (AS IS / AS AVAILABLE)",
    body: (
      <>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND,
          EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.
        </p>
        <p>
          Stegabyte makes no warranty that the Service will be uninterrupted, error-free,
          or that it will meet your requirements. Cryptographic implementations are
          believed correct based on standard published algorithms (AES-256-GCM,
          PBKDF2-SHA512) and the platform Web Crypto API; however, no cryptographic
          software is guaranteed to be free of defects, and a forgotten password renders
          the encrypted payload permanently unrecoverable.
        </p>
      </>
    ),
  },
  {
    id: "limitation",
    title: "4. Limitation of liability",
    body: (
      <>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE
          OPERATOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES (INCLUDING LOSS OF DATA, LOSS OF PRIVACY, OR LOSS OF GOODWILL)
          ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, EVEN IF THE
          OPERATOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          THE OPERATOR'S TOTAL CUMULATIVE LIABILITY SHALL NOT EXCEED ONE HUNDRED U.S.
          DOLLARS (USD $100) OR THE AMOUNT YOU HAVE PAID TO USE THE SERVICE IN THE TWELVE
          MONTHS PRECEDING THE CLAIM, WHICHEVER IS GREATER. (Because the Service is free,
          this cap is effectively zero in most cases.)
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    title: "5. Indemnification",
    body: (
      <>
        <p>
          You agree to indemnify, defend, and hold harmless the Operator from any claim,
          demand, loss, liability, damage, or expense (including reasonable attorneys'
          fees) arising out of or related to your use of the Service in violation of these
          Terms, any applicable law, or any third-party right.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable use",
    body: (
      <>
        <p>You agree NOT to use the Service to:</p>
        <ul>
          <li>
            Violate any applicable law, treaty, or regulation (including but not limited
            to the Computer Fraud and Abuse Act, GDPR, CCPA, child-protection statutes,
            and intellectual property laws).
          </li>
          <li>
            Distribute child sexual abuse material (CSAM) — there is no acceptable use
            that includes CSAM, period.
          </li>
          <li>Distribute malware, ransomware, or other malicious software payloads.</li>
          <li>Engage in fraud, identity theft, or phishing.</li>
          <li>
            Plan or execute acts of violence, terrorism, or harassment against any person.
          </li>
          <li>
            Circumvent lawful court orders, subpoenas, or warrants (Stegabyte has no
            ability to assist any party in this; the design of the service makes any
            third-party request impossible to satisfy).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "export-controls",
    title: "7. U.S. export controls (EAR)",
    body: (
      <>
        <p>
          Stegabyte uses only publicly available cryptographic algorithms: AES-256 (FIPS
          197), PBKDF2 (RFC 8018), and SHA-2 (FIPS 180-4). The Web Crypto API is a
          platform standard. The complete source code is published at the open-source
          repository listed on the <a href="/about">About</a> page.
        </p>
        <p>
          Under the U.S. Export Administration Regulations (EAR), 15 C.F.R. Part 734,
          publicly available encryption source code that is not subject to a license
          agreement restricting use is generally treated as not subject to encryption
          export controls (EAR §742.15(b)). Because Stegabyte is published under the
          permissive MIT license without use restrictions, the Service and its source code
          fall within this publicly available carve-out.
        </p>
        <p>
          Notwithstanding the above, you represent and warrant that you are not located
          in, under the control of, or a national or resident of any country to which the
          United States has embargoed the export of cryptographic software (currently:
          Cuba, Iran, North Korea, Syria, and the Crimea, Donetsk and Luhansk regions).
          This list is informational; consult the EAR for the current list.
        </p>
      </>
    ),
  },
  {
    id: "dmca",
    title: "8. DMCA and copyright",
    body: (
      <>
        <p>
          Stegabyte does not host or transmit any user-supplied content. All encryption,
          decryption, and embedding happens client-side; the operator never receives the
          plaintext, the password, or the carrier image.
        </p>
        <p>
          The application itself (source code, branding, design) is copyright © 2026 the
          Stegabyte Contributors and licensed under the MIT License. If you believe that
          any content hosted on this domain infringes your copyright, file an issue at{" "}
          <strong>
            <a href="https://github.com/HireforFire/stegabyte/issues">
              github.com/HireforFire/stegabyte/issues
            </a>
          </strong>{" "}
          with a takedown notice containing the items required by 17 U.S.C. §512(c)(3).
        </p>
      </>
    ),
  },
  {
    id: "no-warranty-crypto",
    title: "9. Cryptographic loss is permanent",
    body: (
      <>
        <p>
          You acknowledge and accept that if you forget the password you use to encrypt a
          payload, the encrypted payload is permanently unrecoverable. The operator cannot
          reset, recover, or escrow your password. There is no backdoor. This is a
          feature, not a defect: it is what makes end-to-end local encryption meaningful.
        </p>
        <p>
          You are solely responsible for backing up your passwords and for remembering
          them.
        </p>
      </>
    ),
  },
  {
    id: "modifications",
    title: "10. Modifications to the Service or Terms",
    body: (
      <>
        <p>
          The Operator may modify or discontinue the Service at any time, with or without
          notice. The Operator may revise these Terms; the effective date at the top of
          this page reflects the current version. Continued use of the Service after
          changes constitutes acceptance.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "11. Governing law and disputes",
    body: (
      <>
        <p>
          These Terms are governed by the laws of the jurisdiction in which the Stegabyte
          Contributors are organized, without regard to its conflict-of-laws principles.
          Any dispute arising out of or relating to these Terms shall be resolved in the
          competent courts of that jurisdiction, and you consent to the personal
          jurisdiction of such courts.
        </p>
        <p>
          Nothing in these Terms waives any right you may have under mandatory
          consumer-protection laws of your jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: "severability",
    title: "12. Severability",
    body: (
      <>
        <p>
          If any provision of these Terms is held to be unenforceable, the remaining
          provisions shall continue in full force and effect. The unenforceable provision
          shall be replaced by an enforceable provision that most closely reflects the
          original intent.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "13. Contact",
    body: (
      <>
        <p>
          Questions about these Terms: open an issue at{" "}
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
      eyebrow="Legal · Terms"
      title="Terms of Service"
      effective="2026-07-30"
      intro={
        <>
          These Terms govern your use of Stegabyte. They exist primarily to make explicit
          that the Service is provided without warranty, that you are responsible for your
          use of it, and that the operator is not liable for cryptographic loss or misuse.
        </>
      }
      sections={sections}
    />
  );
}
