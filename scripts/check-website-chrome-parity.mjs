#!/usr/bin/env node
/**
 * Parity gate: the vendored didit.me chrome in this repo must be byte-identical
 * to fe-didit-website-v4 (after the one deterministic import rewrite) at one of
 * the accepted refs - `development` (both sites' staging line) or `main`
 * (production). If it matches neither, someone changed the navbar on one side
 * without syncing the other, and this check goes red until
 * `npm run sync:website-chrome` is run and committed.
 *
 * Usage:
 *   node scripts/check-website-chrome-parity.mjs --from-git ../fe-didit-website-v4
 *   node scripts/check-website-chrome-parity.mjs --from-dir <website-checkout> --ref-label development
 *
 * With --from-git, every ref in ACCEPTED_REFS is tried (prefixed origin/).
 * With --from-dir (CI checks out one ref per job), the dir is compared as-is.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as manifest from "./website-chrome/manifest.mjs";
import { computeExpected } from "./website-chrome/lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

function compareAgainst(source, label) {
  let artifacts;
  try {
    artifacts = computeExpected(manifest, source);
  } catch (err) {
    return { label, ok: false, mismatches: [`cannot compute expected content: ${err.message}`] };
  }
  const mismatches = [];
  for (const a of artifacts) {
    const dest = path.join(repoRoot, a.dest);
    if (!fs.existsSync(dest)) mismatches.push(`missing: ${a.dest}`);
    else if (!fs.readFileSync(dest).equals(a.content)) mismatches.push(`differs: ${a.dest} (source ${a.src})`);
  }
  return { label, ok: mismatches.length === 0, mismatches };
}

const fromDir = opt("--from-dir", undefined);
const results = [];
if (fromDir) {
  results.push(compareAgainst({ dir: fromDir }, opt("--ref-label", "checkout")));
} else {
  const gitDir = opt("--from-git", path.join(repoRoot, "..", "fe-didit-website-v4"));
  for (const ref of manifest.ACCEPTED_REFS) {
    results.push(compareAgainst({ gitDir, ref: `origin/${ref}` }, ref));
  }
}

const pass = results.find((r) => r.ok);
if (pass) {
  console.log(`website-chrome parity OK - vendored chrome matches ${manifest.WEBSITE_REPO}@${pass.label}`);
  process.exit(0);
}

console.error("website-chrome parity FAILED - the help centre navbar has drifted from didit.me.");
for (const r of results) {
  console.error(`\nagainst ${manifest.WEBSITE_REPO}@${r.label}: ${r.mismatches.length} mismatch(es)`);
  for (const m of r.mismatches.slice(0, 20)) console.error("  " + m);
  if (r.mismatches.length > 20) console.error(`  ... and ${r.mismatches.length - 20} more`);
}
console.error(
  "\nFix: run `npm run sync:website-chrome` (optionally --ref origin/main), review the diff, and commit.",
);
process.exit(1);
