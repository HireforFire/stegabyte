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
  console.error(
    `[copy-wasm] Source directory missing: ${SRC}\n` +
      "Run `npm run wasm:build` first to produce the artefacts.",
  );
  process.exit(1);
}

await rm(DEST, { recursive: true, force: true });
await mkdir(DEST, { recursive: true });

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
  console.log(`[copy-wasm] copied ${f}`);
}

console.log("[copy-wasm] done");
