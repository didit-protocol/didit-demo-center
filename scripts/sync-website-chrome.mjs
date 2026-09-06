#!/usr/bin/env node
/**
 * Sync the vendored didit.me website chrome (navbar + announcement bar) from
 * fe-didit-website-v4 into this repo. See scripts/website-chrome/manifest.mjs
 * for what is copied and why.
 *
 * Usage:
 *   npm run sync:website-chrome                 # sibling clone, origin/development
 *   node scripts/sync-website-chrome.mjs --from-git ../fe-didit-website-v4 --ref origin/main
 *   node scripts/sync-website-chrome.mjs --from-dir /path/to/checked-out-website
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as manifest from "./website-chrome/manifest.mjs";
import { computeExpected, resolveCommit, validateClosure } from "./website-chrome/lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const source = {
  gitDir: opt("--from-git", args.includes("--from-dir") ? undefined : path.join(repoRoot, "..", "fe-didit-website-v4")),
  ref: opt("--ref", "origin/development"),
  dir: opt("--from-dir", undefined),
};

const artifacts = computeExpected(manifest, source);

let written = 0;
let unchanged = 0;
for (const a of artifacts) {
  const dest = path.join(repoRoot, a.dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && fs.readFileSync(dest).equals(a.content)) {
    unchanged++;
    continue;
  }
  fs.writeFileSync(dest, a.content);
  written++;
  console.log(`  wrote ${a.dest}`);
}

// Shims must exist (they are authored once, never synced).
for (const shim of manifest.SHIMS) {
  const p = path.join(repoRoot, manifest.VENDOR_DIR, shim);
  if (!fs.existsSync(p)) console.warn(`  WARNING: shim missing (author it): ${manifest.VENDOR_DIR}/${shim}`);
}

const problems = validateClosure(manifest, repoRoot);
if (problems.length) {
  console.error("Vendored import closure is incomplete:");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

const commit = resolveCommit(source);
const state = {
  repo: manifest.WEBSITE_REPO,
  ref: source.dir ? "(dir)" : source.ref,
  commit,
  syncedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(repoRoot, manifest.VENDOR_DIR, "SYNC-STATE.json"),
  JSON.stringify(state, null, 2) + "\n",
);

console.log(
  `sync:website-chrome done - ${written} written, ${unchanged} unchanged` +
    (commit ? ` (source ${source.ref} @ ${commit.slice(0, 10)})` : ""),
);
