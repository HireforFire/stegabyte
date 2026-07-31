# Stegabyte

> **Encrypted Secrets. Hidden In Plain Sight.**

Stegabyte is a privacy-first steganography platform that runs entirely in the
browser. Hide AES-256-GCM ciphertext inside PNG images using least-significant-bit
(LSB) encoding. No plaintext, password, or carrier image ever leaves your device.

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Browser-Only](https://img.shields.io/badge/browser-only-22d3ee)](#architecture)
[![Tests](https://img.shields.io/badge/tests-92%20passing-emerald)](#tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](tsconfig.json)

**Live demo:** _coming soon_

---

## Table of contents

- [Why Stegabyte?](#why-stegabyte)
- [Features](#features)
- [Architecture](#architecture)
- [How it works](#how-it-works)
- [Security model](#security-model)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Tests](#tests)
- [Deployment](#deployment)
- [Legal](#legal)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why Stegabyte?

Most "secure messaging" tools trust a server. Stegabyte doesn't have one. It
ships as a static bundle, runs in your browser, and uses the platform's
`SubtleCrypto` interface directly. Combine that with image LSB steganography
and the existence of a message becomes as secret as its contents.

- **No backend.** Nothing to subpoena, nothing to breach.
- **No third-party scripts.** Strict CSP blocks everything except your origin.
- **No telemetry.** No cookies, no analytics, no tracking pixels.
- **Auditable.** The entire codebase is small enough to read in a weekend.

## Features

| Feature                | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| AES-256-GCM            | Industry-standard authenticated encryption                         |
| PBKDF2 (SHA-512, 600k) | Strong key stretching with per-image 32-byte salts                 |
| PNG LSB embedding      | 3-channel bit-level embedding (R, G, B; alpha is preserved)        |
| Web Worker crypto      | Off-main-thread SubtleCrypto — UI stays responsive                 |
| Forensic analysis      | Entropy, LSB suspicion, histogram, capacity, payload detection     |
| Strict CSP             | Dev/prod split, `upgrade-insecure-requests`, no `'unsafe-eval'`    |
| Zero telemetry         | No cookies, no analytics, no server                                |
| Accessibility          | Keyboard nav, ARIA, focus traps, reduced-motion support            |
| Strict TypeScript      | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Liquid-glass aesthetic | Minimalist black + indigo + cyan UI                                |

## Architecture

```
src/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout (sidebar, navbar, mobile drawer)
│   ├── page.tsx          # Landing page
│   ├── encrypt/          # /encrypt
│   ├── extract/          # /extract
│   ├── analyze/          # /analyze
│   ├── dashboard/        # /dashboard
│   ├── settings/         # /settings
│   ├── about/            # /about
│   ├── privacy/          # /privacy
│   ├── terms/            # /terms
│   ├── security/         # /security
│   ├── license/          # /license
│   └── not-found.tsx     # 404
├── components/
│   ├── ui/               # Reusable UI primitives (button, glass-panel, input, ...)
│   ├── layout/           # Sidebar, navbar, command palette, mobile drawer
│   └── landing/          # Landing page composition
├── features/             # Feature-scoped page logic (encrypt, extract, analyze, ...)
├── hooks/                # React hooks (use-crypto-worker, use-focus-trap, ...)
├── lib/
│   ├── crypto/           # AES-256-GCM + PBKDF2 (encrypt.ts — pure, worker-safe)
│   ├── stego/            # PNG LSB encoder/decoder
│   │   ├── png-lsb-core.ts  # Pure encode/decode (no DOM)
│   │   └── png-lsb.ts       # DOM/Canvas wrapper
│   └── utils.ts          # cn(), formatBytes(), hex helpers
├── stores/               # Zustand stores (encrypt)
├── styles/               # Tailwind + globals.css
├── types/                # TypeScript types (crypto, stego)
├── workers/              # Web Workers (stegabyte-crypto.worker.ts)
└── lib/stego/wasm-loader.ts   # Lazy-loads the Rust-compiled WASM core

crates/
└── stegabyte-stego-core/      # Rust crate compiled to WebAssembly
```

The pure core in `lib/crypto/` and `lib/stego/png-lsb-core.ts` is intentionally
separated from the DOM-aware wrappers so it can be swapped for a WebAssembly
module without API changes. **The Rust-compiled WASM core is shipped out of
the box** and transparently accelerates `encode`, `decode`, `entropy`,
`lsbSuspicion`, and `histogram` on every page that touches a PNG. A pure-JS
fallback runs automatically in environments where WebAssembly is unavailable.
See [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md) for numbers.

## How it works

### Encryption pipeline

1. **Key derivation** — PBKDF2-SHA512 with a per-image 32-byte salt stretches
   the user's password (600 000 iterations).
2. **Encryption** — AES-256-GCM with a fresh 12-byte IV encrypts the plaintext.
3. **Bundling** — IV + salt + ciphertext are concatenated into a single byte
   string.
4. **Header** — A 14-byte `CRYX` header encodes the format version, payload
   length, and original plaintext length.
5. **Embedding** — The header + payload bytes are split into bits and written
   into the R, G, B LSBs of the carrier image (alpha is preserved untouched).
6. **Rendering** — The modified pixel buffer is rendered through a Canvas to
   produce a fresh PNG `Blob`.

### Decryption pipeline

1. **LSB decode** — Read the 14-byte `CRYX` header and payload bytes back from
   the LSB stream.
2. **Bundle extraction** — Split the recovered bundle into IV, salt, and
   ciphertext.
3. **Key re-derivation** — PBKDF2 with the recovered salt and the user password
   produces the same key.
4. **AES-GCM decrypt** — Authenticated decryption recovers the plaintext and
   verifies integrity. Tampering with the image causes decryption to fail
   loudly.

### Stego format

```
HEADER (14 bytes)
  [0..3]   Magic "CRYX"
  [4..5]   Version (uint16 LE)
  [6..9]   Payload length (uint32 LE)
  [10..13] Original plaintext length (uint32 LE)

PAYLOAD (variable)
  IV (12 bytes) | Salt (32 bytes) | AES-GCM ciphertext
```

## Security model

- **No backend.** The application is a static bundle. There is no server-side
  state, no API routes for processing user data, no analytics endpoint.
- **Web Crypto API.** All primitives (PBKDF2, AES-GCM, SHA-256) come from the
  browser's `SubtleCrypto` interface. No third-party crypto library is loaded.
- **Strict CSP.** `default-src 'self'`, `connect-src 'self'`,
  `frame-ancestors 'none'`, HSTS preload, `X-Frame-Options: DENY`, COEP/COOP
  enabled, dev/prod CSP split (production removes `unsafe-eval`).
- **Per-image salts.** Identical messages in different images produce unrelated
  ciphertexts. The salt is generated with `crypto.getRandomValues`.
- **Authenticated encryption.** AES-GCM guarantees both confidentiality and
  integrity; tampering with the image causes decryption to fail loudly.
- **Zero telemetry.** No cookies, no analytics, no third-party scripts.
- **Permissions-Policy.** 22 features explicitly disabled to limit what embedded
  iframes (none today, but defence in depth) could ever request.

### What Stegabyte cannot protect against

- **Forgotten passwords.** PBKDF2 makes brute-force impractical, so a lost
  password means a lost message. Store passwords safely.
- **Trained steganalysis.** LSB steganography is detectable by statistical
  analysis. Stegabyte surfaces an LSB suspicion metric so you can see what an
  analyst would see.
- **Lossy recompression.** PNG is lossless, but converting to JPEG will destroy
  the payload. Stegabyte only supports PNG carriers.
- **A compromised device.** Stegabyte runs in your browser; if your OS or
  browser is already compromised, no client-side tool can save you.

## Tech stack

| Layer         | Tool                                  |
| ------------- | ------------------------------------- |
| Framework     | Next.js 16 (App Router) + React 19    |
| Language      | TypeScript (strict)                   |
| Styling       | Tailwind CSS 3 + CSS variables        |
| UI primitives | Hand-built shadcn-compatible          |
| Icons         | Lucide                                |
| State         | Zustand                               |
| Forms         | React Hook Form + Zod                 |
| Crypto        | Web Crypto API (SubtleCrypto)         |
| Stego         | Canvas API + Rust-compiled WASM core  |
| Tests         | Vitest + Testing Library + Playwright |
| Lint/Format   | ESLint + Prettier                     |

## Getting started

### Prerequisites

- Node.js >= 20.9 (see `.nvmrc`)
- npm >= 10

### Installation

```bash
npm install
```

### Development

```bash
npm run dev          # http://localhost:3000
```

### Production build

```bash
npm run build
npm start
```

## Scripts

| Command                    | What it does                                     |
| -------------------------- | ------------------------------------------------ |
| `npm run dev`              | Start the dev server                             |
| `npm run build`            | Production build                                 |
| `npm start`                | Serve the production build                       |
| `npm test`                 | Run Vitest unit tests once                       |
| `npm run test:watch`       | Run Vitest in watch mode                         |
| `npm run test:coverage`    | Run Vitest with v8 coverage                      |
| `npm run test:e2e`         | Run Playwright e2e (requires `test:e2e:install`) |
| `npm run test:e2e:install` | Install Playwright browsers                      |
| `npm run lint`             | Run ESLint                                       |
| `npm run lint:fix`         | Run ESLint with `--fix`                          |
| `npm run typecheck`        | Run `tsc --noEmit`                               |
| `npm run format`           | Run Prettier `--write`                           |
| `npm run check`            | Run lint + typecheck + tests                     |

## Tests

92 unit tests across 8 files. Coverage report is generated via
`npm run test:coverage` and surfaces any regression. Coverage highlights:

- `lib/crypto/encrypt.ts` — 100%
- `lib/stego/png-lsb-core.ts` — ~99%
- `lib/utils.ts` — ~86%

E2E tests (Playwright) cover the full UI happy-path: encrypt → extract round-trip.

## Deployment

Stegabyte is configured for one-click deployment on [Vercel](https://vercel.com).

```bash
vercel deploy --prod
```

The full deployment walkthrough — GitHub repo setup, environment
variables, custom domain, post-deploy verification — lives in
[`DEPLOY.md`](DEPLOY.md). The short version:

- `vercel.json` and `next.config.ts` configure the framework
  (`nextjs`), region (`iad1`), and security headers at both the Next.js
  layer and the Vercel edge (CSP, HSTS, X-Frame-Options, COEP, COOP,
  CORP, Permissions-Policy).
- No required secrets. The only optional env var is
  `NEXT_PUBLIC_SITE_URL` (used as `metadataBase` for OG tags).
- The WASM artefact is committed under `public/wasm/` so Vercel can
  build without the Rust toolchain.

## Legal

- [Privacy Policy](/privacy) — what we (don't) collect
- [Terms of Service](/terms) — usage terms
- [Security](/security) — threat model + responsible-disclosure policy
- [License](/license) — MIT

For the canonical disclosure policy, see [`SECURITY.md`](SECURITY.md).

## Roadmap

### v1.0 (current)

- PNG LSB steganography
- AES-256-GCM + PBKDF2-SHA512 (600 000 iterations)
- Web Worker crypto (off-main-thread)
- Forensic analysis (entropy, LSB suspicion, histogram, capacity)
- Dashboard, Encrypt, Extract, Analyze, Settings, About
- Rust-compiled WebAssembly stego core (with JS fallback)
- `/benchmark` page for real-browser WASM-vs-JS comparison
- 102 unit tests + Playwright e2e
- Strict CSP, COEP/COOP, accessibility audits

### v1.1

- BMP carrier support
- WAV carrier support (16-bit PCM)
- Additional image formats

### v1.2

- QR-code embedding (pixel-perfect overlay)
- Zero-width Unicode text encoding
- Batch processing (multiple images / files)

### v2.0

- Secure local vault (IndexedDB, encrypted)
- Entropy heatmap visualization
- Metadata stripping utility
- PWA + offline mode
- SIMD128 acceleration of LSB hot paths (Rust target-feature)
- Plugin API for community formats

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow. Issues and pull
requests are welcome — please use the templates under
`.github/ISSUE_TEMPLATE/`.

## License

MIT. See [`LICENSE`](LICENSE) for details.

Copyright (c) 2026 Stegabyte Contributors.

---

Built with care for people who care about privacy.
