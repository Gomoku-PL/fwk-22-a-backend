// How to run (Windows PowerShell):
// 1) From the frontend folder:
//    npm run format:repo
//
// 2) Or run directly with Node:
//    node ./scripts/formatRepo.mjs
//
// This script formats files across the entire repo (frontend + backend)
// using Prettier. It mirrors the same root + ignore rules as removeComments.mjs.

import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fg from "fast-glob";
import prettier from "prettier";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "..", "..");

const globs = ["**/*.{js,jsx,ts,tsx,css,html,json,md,mdx}"];

const ignore = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/build/**",
  "**/.next/**",
  "**/.vercel/**",
  "**/.cache/**",
  "**/coverage/**",
];

async function formatFile(file) {
  const content = await fs.readFile(file, "utf8");
  const config = (await prettier.resolveConfig(file)) ?? {};
  const formatted = await prettier.format(content, {
    ...config,
    filepath: file,
  });
  if (formatted !== content) {
    await fs.writeFile(file, formatted, "utf8");
    return true;
  }
  return false;
}

async function main() {
  const entries = await fg(globs, {
    cwd: repoRoot,
    ignore,
    absolute: true,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: false,
  });
  console.log("[format] Root:", repoRoot);
  console.log("[format] Files matched:", entries.length);

  let changed = 0;
  for (const file of entries) {
    try {
      const didChange = await formatFile(file);
      if (didChange) {
        console.log("Formatted:", path.relative(repoRoot, file));
        changed += 1;
      }
    } catch (e) {
      console.error(
        "Failed to format",
        path.relative(repoRoot, file),
        e.message
      );
    }
  }
  console.log(`[format] Done. Changed: ${changed} / ${entries.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
