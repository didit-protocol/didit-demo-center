#!/usr/bin/env node
/**
 * Vendor the Didit design system v4 parts the Demo Center chrome uses.
 *
 * The source is the design system package (`design-system/` in the design
 * repository): its token sheet and its component bundle. The bundle is 2 MB,
 * so only the blocks the Demo Center bar, hub, live layer and console view
 * chrome use are taken, each one verbatim between its own markers. The one
 * rewrite: the token sheet's spacing, radius and type `:root` block is scoped
 * to `.dd`, because this app's Tailwind preset already owns `--radius-*` and
 * `--font-sans` on `:root` (the website does the same).
 *
 * Usage:
 *   node scripts/sync-design-system.mjs --from-dir <design repo checkout>
 *   node scripts/sync-design-system.mjs --from-git <clone> --ref <ref>
 *   --commit <sha> records the source commit for a --from-dir read
 *   add --check to compare instead of write (exits 1 on drift)
 */

import fs from "node:fs";
import path from "node:path";

import { makeReader, resolveCommit } from "./website-chrome/lib.mjs";

export const DESIGN_REPO = "didit-protocol/verification-flow-design";
export const DEST = "vendor/didit-design-system/ds.css";
const TOKENS = "design-system/tokens.css";
const BUNDLE = "design-system/components/bundle.css";

/** Bundle blocks, in order: [name, first line starts with, stop before the line that starts with]. */
export const BLOCKS = [
  ["root", "/* ---------- 1. Root ---------- */", "/* ---------- 2. Type"],
  ["button", "/* ==== DS4 BUTTON BEGIN", "/* ==== DS4 BUTTON END ==== */"],
  ["status", ".dd-status {", "/* ==== DS4 TAG BEGIN"],
  ["tag", "/* ==== DS4 TAG BEGIN", "/* ==== DS4 TAG END ==== */"],
  ["tile", "/* Graphite tile", ".dd-plan-mark {"],
  ["halftone", "/* halftone panel", ".dd-float {"],
  ["window", "/* console window", ".dd-bleed-right {"],
  ["tabs", "/* ---------- 11. Tabs and segmented controls", ".dd-utabs {"],
  ["eyebrow", "/* ---- Eyebrow ---- */", "/* ---- ImageGrid ---- */"],
];

function lines(text) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function block(all, name, start, stop) {
  const from = all.findIndex((line) => line.startsWith(start));

  if (from === -1) throw new Error(`bundle.css: "${name}" start not found`);
  const to = all.findIndex((line, i) => i > from && line.startsWith(stop));

  if (to === -1) throw new Error(`bundle.css: "${name}" end not found`);
  // An END marker belongs to its block; a next-rule stop does not.
  const end = stop.includes(" END ") ? to + 1 : to;

  return all.slice(from, end).join("\n").trimEnd();
}

/** The top-level `{ ... }` blocks of the token sheet, as text. */
function topBlocks(css) {
  const out = [];
  let depth = 0;
  let begin = 0;

  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) {
      out.push(css.slice(begin, i + 1).trim().replace(/^(\/\*[\s\S]*?\*\/\s*)+/, ""));
      begin = i + 1;
    }
  }

  return out;
}

export function derive(read) {
  const tokens = topBlocks(read(TOKENS).toString("utf8"));
  const light = tokens.find((b) => b.startsWith(':root, [data-theme="light"] {'));
  const dark = tokens.find((b) => b.startsWith('[data-theme="dark"] {'));
  const scale = tokens.find((b) => b.startsWith(":root {") && b.includes("--space-1:"));

  if (!light || !dark || !scale) throw new Error("tokens.css: colour or scale block not found");
  const bundle = lines(read(BUNDLE).toString("utf8"));
  const parts = BLOCKS.map(([name, start, stop]) => block(bundle, name, start, stop));

  return [
    "/* Didit design system v4: vendored by scripts/sync-design-system.mjs. Never edit by hand. */",
    `/* ${TOKENS}: colour tokens, light and dark */`,
    light,
    dark,
    `/* ${TOKENS}: spacing, radius and type, scoped to .dd */`,
    scale.replace(/^:root \{/, ".dd {"),
    `/* ${BUNDLE}: ${BLOCKS.map(([name]) => name).join(", ")} */`,
    ...parts,
    "",
  ].join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const opt = (flag) => {
    const i = args.indexOf(flag);

    return i === -1 ? undefined : args[i + 1];
  };
  const source = { dir: opt("--from-dir"), gitDir: opt("--from-git"), ref: opt("--ref") };
  const css = derive(makeReader(source));
  const dest = path.resolve(DEST);

  if (args.includes("--check")) {
    const current = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : "";

    if (current !== css) {
      console.error(`${DEST} differs from the design system; run the sync.`);
      process.exit(1);
    }
    console.log(`${DEST} matches the design system.`);

    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, css);
  const state = {
    repo: DESIGN_REPO,
    ref: source.ref ?? null,
    commit: opt("--commit") ?? resolveCommit(source),
    files: [TOKENS, BUNDLE],
    blocks: BLOCKS.map(([name]) => name),
  };

  fs.writeFileSync(
    path.join(path.dirname(dest), "SYNC-STATE.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );
  console.log(`wrote ${DEST}`);
}

main();
