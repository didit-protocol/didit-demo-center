import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// From 1 Nov 2026 the "500 free checks a month" allowance is retired: the Free
// plan carries $10 of monthly credit usable on any feature. No demo card or
// note may promise a free allowance, and cards show the real per-check price.
const FILES = [
  "lib/demos.ts",
  "lib/pricing.ts",
  "components/demo-center/demo-detail-modal.tsx",
  "components/demo-center/hero.tsx",
];
const OLD_ALLOWANCE = /500 (free|checks|liveness|verif)|free tier|free-tier|freeTier|free allowance of|Free · /i;

for (const file of FILES) {
  test(`${file} does not promise a free allowance`, () => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const hit = text.split("\n").find((line) => OLD_ALLOWANCE.test(line));
    assert.equal(hit, undefined, `old allowance wording: ${hit}`);
  });
}
