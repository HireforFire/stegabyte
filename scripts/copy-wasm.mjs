#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Copies the WASM artifacts produced by `wasm-pack build` into the Next.js
 * `public/wasm/` directory so they can be fetched at runtime.
 *
 * Why we do this:
 * - Next.js does not serve files from `src/` as static assets.
 * - Workers + dynamic `import()` need a fetchable URL.
 * - Keeps the WASM build artefact under `crates/` (source of truth) and
 *   only mirrors the published JS+WASM files into `public/wasm/`.
 */
import process from "node:process";
import { cp, mkdir, rm, access, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src/lib/stego/wasm/pkg");
const DEST = join(ROOT, "public/wasm");

const FILES = [
  "stegabyte_stego_core.js",
  "stegabyte_stego_core.d.ts",
  "stegabyte_stego_core_bg.wasm",
  "stegabyte_stego_core_bg.wasm.d.ts",
  "package.json",
];

/**
 * Strip personal-name fields from the generated package.json. wasm-pack
 * hardcodes the Cargo.toml `authors` value into the generated
 * `collaborators` array. We rewrite it here so the build artefact never
 * ships the operator's real name. We also rewrite the `repository` URL
 * to a project-neutral fragment so the generated artefact never carries
 * the original maintainer's GitHub handle.
 */
const COLLABORATORS_PLACEHOLDER = ["Stegabyte Contributors"];
const REPOSITORY_PLACEHOLDER = "https://github.com/HireforFire/stegabyte";

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

if (!(await exists(SRC))) {
  console.warn(
    `[copy-wasm] Source directory missing: ${SRC}\n` +
      "This is expected in CI (no Rust toolchain). The build will use the\n" +
      "WASM artefacts already committed to `public/wasm/` instead.\n" +
      "Run `npm run wasm:build` locally to refresh them after editing the\n" +
      "Rust crate.",
  );
  // Exit early WITHOUT clearing `public/wasm/`. The committed artefacts
  // remain in place so `next build` can bundle them.
  process.exit(0);
}

// Sanity check: all five files must exist in the wasm-pack output before
// we treat it as authoritative. If anything is missing, fall back to the
// committed `public/wasm/` artefacts (which CI relies on when the Rust
// toolchain is absent).
const missingInSrc = FILES.filter((f) => !existsSync(join(SRC, f)));
if (missingInSrc.length > 0) {
  console.warn(
    `[copy-wasm] Source directory ${SRC} is missing:\n` +
      missingInSrc.map((f) => `  - ${f}`).join("\n") +
      "\nFalling back to the WASM artefacts already in `public/wasm/`.",
  );
  process.exit(0);
}

// All source files exist — clear the destination and copy fresh ones.
// CI never hits this branch because `wasm:build` is not run there.
await rm(DEST, { recursive: true, force: true });
await mkdir(DEST, { recursive: true });

let copiedAny = false;
for (const f of FILES) {
  const from = join(SRC, f);
  if (!(await exists(from))) continue;

  if (f === "package.json") {
    const raw = await readFile(from, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.collaborators)) {
      parsed.collaborators = COLLABORATORS_PLACEHOLDER;
    }
    if (typeof parsed.author === "string") {
      parsed.author = COLLABORATORS_PLACEHOLDER[0];
    }
    if (parsed.repository && typeof parsed.repository === "object") {
      parsed.repository.url = REPOSITORY_PLACEHOLDER;
    } else if (typeof parsed.repository === "string") {
      parsed.repository = REPOSITORY_PLACEHOLDER;
    }
    await writeFile(join(DEST, f), JSON.stringify(parsed, null, 2) + "\n", "utf8");
    console.log(`[copy-wasm] copied ${f} (collaborators + repository rewritten)`);
    continue;
  }

  await cp(from, join(DEST, f));
  copiedAny = true;
  console.log(`[copy-wasm] copied ${f}`);
}

if (!copiedAny) {
  console.warn(
    `[copy-wasm] Source directory ${SRC} exists but is empty.\n` +
      "Falling back to whatever is already in `public/wasm/`.",
  );
}

console.log("[copy-wasm] done");
