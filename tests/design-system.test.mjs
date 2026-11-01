// The Demo Center chrome on design system v4. Run with `npm test`.
//
// The DS v4 rules come from the design system package through
// scripts/sync-design-system.mjs, never as hand copies; the chrome's product
// colours are the DS v4 categories and the v2 values are gone.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const { derive } = await import("../scripts/sync-design-system.mjs");

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const ds = read("vendor/didit-design-system/ds.css");
const live = read("styles/demos/live.css");
const hub = read("styles/demos/hub.css");

test("the vendored sheet carries every DS v4 class the chrome uses", () => {
  for (const name of [
    "dd-btn-primary", "dd-btn-secondary", "dd-btn-ghost", "dd-btn-sm", "dd-btn-md", "dd-btn-lg", "dd-btn-icon",
    "dd-status-warning", "dd-status-approved", "dd-status-sm",
    "dd-tag-cat", "dd-tile-32", "dd-eb-section", "dd-eb-slash",
    "dd-window-bar", "dd-halftone", "dd-wash", "dd-h1", "dd-h2", "dd-lede",
  ]) {
    assert.match(ds, new RegExp(`\\.${name}[\\s,{.:]`), name);
  }
});

test("the product colours are the DS v4 categories", () => {
  for (const [token, value] of [
    ["--cat-auth", "#de4b80"],
    ["--sub-identity-data", "#07799b"],
    ["--cat-identity", "#2567ff"],
    ["--cat-transactions", "#0e9f8e"],
  ]) {
    assert.match(ds, new RegExp(`${token}: ${value};`), token);
  }
  assert.match(live, /\.p-auth \{ --cat: var\(--cat-auth\)/);
  assert.match(live, /\.p-sig \{ --cat: var\(--sub-identity-data\)/);
  assert.match(live, /\.p-ver \{ --cat: var\(--cat-identity\)/);
  assert.match(live, /\.p-txn \{ --cat: var\(--cat-transactions\)/);
  assert.match(live, /\.p-hold \{ --cat: var\(--c-review-dot\)/);
  assert.match(live, /\.p-stop \{ --cat: var\(--c-danger-dot\)/);
});

test("no v2 colour is left in the chrome", () => {
  for (const sheet of [live, hub]) {
    for (const v2 of ["#7A5AF8", "#F07316", "#0E9F6E"]) {
      assert.ok(!sheet.toUpperCase().includes(v2), v2);
    }
  }
});

test("the sync takes each block verbatim and scopes the scale tokens to .dd", () => {
  const bundle = [
    "/* ---------- 1. Root ---------- */", ".dd { --dd-mono: x; }",
    "/* ---------- 2. Type (marketing) ---------- */", ".dd-h1 { font-size: 64px; }", ".dd-prose { }",
    "/* ==== DS4 BUTTON BEGIN (P1) ==== */", ".dd-btn { height: 44px; }", "/* ==== DS4 BUTTON END ==== */",
    ".dd-status { height: 24px; }", "/* ==== DS4 TAG BEGIN (P1) ==== */", ".dd-tag { height: 22px; }", "/* ==== DS4 TAG END ==== */",
    "/* Graphite tile (D46) */", ".dd-tile { width: 52px; }", ".dd-plan-mark { }",
    "/* halftone panel: dots */", ".dd-halftone { }", ".dd-float { }",
    "/* console window: frame */", ".dd-window { }", ".dd-bleed-right { }",
    "/* ---------- 11. Tabs and segmented controls ---------- */", ".dd-tabs { }", ".dd-utabs { }",
    "/* Colour fields: the product sits on Didit blue */", ".dd-wash { }", "/* In a product family */",
    "/* ---- Eyebrow ---- */", ".dd-eb { }", "/* ---- ImageGrid ---- */",
    "/* icon-only: a circle */", ".dd-btn.dd-btn-icon { width: 44px; }", "/* the danger fill */",
  ].join("\n");
  const tokens = [
    "/* generated */",
    ':root, [data-theme="light"] {\n  --c-line: #ededed;\n}',
    '[data-theme="dark"] {\n  --c-line: #2a2a2e;\n}',
    ":root {\n  --space-1: 4px;\n  --radius-sm: 10px;\n}",
    ".t-h1 { }",
  ].join("\n");
  const css = derive((file) => Buffer.from(file.endsWith("tokens.css") ? tokens : bundle));

  assert.match(css, /:root, \[data-theme="light"\] \{\n {2}--c-line: #ededed;\n\}/);
  assert.match(css, /\n\.dd \{\n {2}--space-1: 4px;\n {2}--radius-sm: 10px;\n\}/);
  assert.ok(!css.includes(":root {\n  --space-1"), "the scale block leaves :root");
  assert.ok(css.includes("/* ==== DS4 BUTTON END ==== */"));
  assert.ok(css.includes(".dd-btn.dd-btn-icon { width: 44px; }"));
  assert.ok(!css.includes(".dd-prose") && !css.includes(".dd-utabs") && !css.includes(".t-h1"));
});
