#!/usr/bin/env node
/**
 * check-published-urls.mjs - the published URL list only grows.
 *
 * tests/url-permanence.test.mjs proves every path in data/published-urls.json
 * still resolves. That proof is only as good as the list: a change that deletes
 * a page AND its entry would pass it while the URL returns 404. This
 * compares the list with the one on the base commit, so dropping an entry fails
 * (CLAUDE.md, "URLs are permanent"). CI runs it on every pull request.
 *
 *   node scripts/check-published-urls.mjs                   # base = merge-base with origin/main
 *   node scripts/check-published-urls.mjs --base <commit>   # CI passes the pull request base
 *   node scripts/check-published-urls.mjs --root <dir>      # a fixture repository, for the tests
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const FILE = "data/published-urls.json";
const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const root = path.resolve(option("--root") ?? process.cwd());
const git = (...gitArgs) => execFileSync("git", ["-C", root, ...gitArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const succeeds = (...gitArgs) => {
  try {
    git(...gitArgs);
    return true;
  } catch {
    return false;
  }
};

/** Every path in the list: the values of all its arrays. */
const entries = (list) => new Set(Object.values(list).filter(Array.isArray).flat());

const base = option("--base") ?? git("merge-base", "HEAD", "origin/main").trim();
if (!succeeds("cat-file", "-e", `${base}^{commit}`)) {
  console.error(`Base commit ${base} is not available; fetch it first.`);
  process.exit(2);
}
if (!succeeds("cat-file", "-e", `${base}:${FILE}`)) {
  console.log(`${FILE} does not exist on ${base.slice(0, 12)}; nothing to compare yet.`);
  process.exit(0);
}

const before = entries(JSON.parse(git("show", `${base}:${FILE}`)));
const now = entries(JSON.parse(readFileSync(path.join(root, FILE), "utf8")));
const removed = [...before].filter((entry) => !now.has(entry));

if (removed.length > 0) {
  console.error(`${removed.length} published path(s) left ${FILE}:`);
  for (const entry of removed) console.error(`  - ${entry}`);
  console.error("Put them back. A published URL is permanent: keep the page, or redirect it to its closest equivalent.");
  process.exit(1);
}
console.log(`All ${before.size} published paths from ${base.slice(0, 12)} are still listed.`);
