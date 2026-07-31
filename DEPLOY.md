# Deploying Stegabyte

Stegabyte is a static Next.js 16 app. It builds to a set of prerendered
HTML pages plus a WASM artefact — no runtime server, no database, no
backend. There are **zero required secrets** and **zero required
environment variables** to deploy.

The default target is [Vercel](https://vercel.com), but any static host
that supports the Next.js App Router works (Cloudflare Pages, Netlify,
GitHub Pages via static export, etc.).

---

## 1. One-time: create the GitHub repository

Stegabyte's canonical repo URL is `HireforFire/stegabyte`.
The repo is hosted under the personal account `HireforFire`. When
forking or mirroring, update the following files in a single PR:

| File                                     | Field                            |
| ---------------------------------------- | -------------------------------- |
| `package.json`                           | `repository.url`, `bugs.url`     |
| `crates/stegabyte-stego-core/Cargo.toml` | `repository`                     |
| `public/wasm/package.json`               | `repository.url`                 |
| `src/lib/stego/wasm/pkg/package.json`    | `repository.url`                 |
| `.github/CODEOWNERS`                     | `@HireforFire`                   |
| `README.md`                              | repository URL block             |
| `src/app/security/page.tsx`              | Security Advisory link           |
| `src/app/terms/page.tsx`                 | Issues link (×2)                 |
| `src/app/privacy/page.tsx`               | Issues link                      |
| `SECURITY.md`                            | Security Advisory link           |
| `CONTRIBUTING.md`                        | Security Advisory link           |

Then create the GitHub repository (web UI or `gh repo create`):

```bash
gh repo create HireforFire/stegabyte --public --source=. --remote=origin --push
```

---

## 2. Push the code

```bash
git init
git add .
git commit -m "feat: Stegabyte v1.0 — encrypted LSB steganography"
git remote add origin git@github.com:HireforFire/stegabyte.git
git push -u origin main
```

---

## 3. Deploy to Vercel

### Option A — connect via the Vercel dashboard (recommended)

1. Sign in to [vercel.com](https://vercel.com).
2. **Add New → Project → Import** the GitHub repo.
3. Vercel auto-detects Next.js. The defaults are correct:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build` (from `vercel.json`)
   - Output Directory: `.next` (auto)
   - Install Command: `npm ci` (from `vercel.json`)
4. Click **Deploy**. The first build takes ~3 minutes (large WASM module).
5. After the first deploy succeeds, add the custom domain
   `stegabyte.app` under **Settings → Domains** (requires the domain to be
   purchased and DNS pointed to Vercel).

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link          # link the local dir to a Vercel project
vercel env add NEXT_PUBLIC_SITE_URL production   # set to https://stegabyte.app
vercel --prod        # first production deploy
```

### Required / optional environment variables

| Name                           | Scope | Default                 | Purpose                                                                                                                                                |
| ------------------------------ | ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`         | All   | `https://stegabyte.app` | Used as the `metadataBase` for Open Graph / Twitter / sitemap absolute URLs. Vercel preview deployments auto-promote `VERCEL_URL` when this isn't set. |
| `NEXT_PUBLIC_VERCEL_ANALYTICS` | All   | `false`                 | Reserved for a future opt-in toggle; not currently used.                                                                                               |

There are no other variables, no API keys, no database URIs.

---

## 4. Verify the deployment

After the first production deploy:

```bash
# Check the security headers
curl -sI https://stegabyte.app/ | grep -iE 'content-security-policy|strict-transport-security|cross-origin'

# Check the WASM module loads with the correct MIME + CORP
curl -sI https://stegabyte.app/wasm/stegabyte_stego_core_bg.wasm | grep -iE 'content-type|cross-origin|cache-control'

# Run the end-to-end smoke test
curl -s https://stegabyte.app/encrypt -o /dev/null -w "status: %{http_code}\nsize: %{size_download}\n"
```

Expected: all routes return `200`, the CSP / HSTS / COEP / CORP headers
are present, and the WASM module returns `Content-Type: application/wasm`
with `Cross-Origin-Resource-Policy: same-origin`.

---

## 5. Custom domain

Vercel custom-domain setup is unchanged:

1. Buy the domain (e.g. `stegabyte.app`).
2. In Vercel: **Settings → Domains → Add** `stegabyte.app` and `www.stegabyte.app`.
3. Point the domain's DNS to Vercel per the instructions shown.
4. Set `NEXT_PUBLIC_SITE_URL=https://stegabyte.app` in Vercel env.
5. Redeploy (or wait for the next push).

The HSTS preload directive in `vercel.json` is already configured; once
the domain has been serving HTTPS for ~30 days it qualifies for the
[ preload list](https://hstspreload.org/).

---

## 6. Continuous deployment

Once the GitHub repo is connected to Vercel, every push to `main`
triggers a production deploy and every PR gets a preview URL. The
`.github/workflows/ci.yml` workflow runs `lint + typecheck + test +
coverage + build` on every PR — passing CI is the gate for merge.

---

## Notes

- The WASM build artefact (`public/wasm/*.wasm`, ~28 KB) is committed
  to the repo so Vercel can build without the Rust toolchain. To rebuild
  it after editing `crates/stegabyte-stego-core/src/lib.rs`, run
  `npm run wasm:rebuild` locally and commit the regenerated
  `public/wasm/` files.
- The `smoke-test-logs/` directory is gitignored and only used by ad-hoc
  deployment smoke tests. It will never reach the repo.
- No telemetry, analytics, or third-party scripts are loaded. The
  codebase contains zero outgoing network requests at runtime.
