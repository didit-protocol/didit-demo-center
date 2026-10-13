#!/usr/bin/env node
/**
 * Every "Docs" button in the catalogue has to land on a page that exists.
 *
 * A dead docs link is worse than no link: it is the first thing a developer
 * clicks after watching a demo run. This walks the `docsPath` on every demo,
 * every `request.docsPath`, and the shared DOC_PATHS map, and fetches each URL
 * on docs.didit.me.
 *
 * Usage:
 *   npm run check:docs-links
 *
 * Offline (no route to docs.didit.me) the script reports SKIPPED and exits 0,
 * so it never turns a build red for a network the runner does not have. Any
 * link that IS reachable and returns a non-2xx fails the run.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://docs.didit.me";

/**
 * The catalogue is TypeScript, so rather than compile it we read the paths out
 * of the source. Both files declare them as plain string literals on a
 * `docsPath:` key (lib/demos.ts) or inside the DOC_PATHS object (lib/docs.ts),
 * which keeps this check dependency-free.
 */
function collectPaths() {
  const found = new Set();

  const demos = fs.readFileSync(path.join(repoRoot, "lib/demos.ts"), "utf8");

  for (const match of demos.matchAll(/docsPath:\s*"([^"]+)"/g)) {
    found.add(match[1]);
  }

  const docs = fs.readFileSync(path.join(repoRoot, "lib/docs.ts"), "utf8");
  const block = docs.slice(
    docs.indexOf("export const DOC_PATHS"),
    docs.indexOf("} as const;"),
  );

  for (const match of block.matchAll(/:\s*"([^"]+)"/g)) {
    found.add(match[1]);
  }

  return [...found].sort();
}

async function main() {
  const paths = collectPaths();

  if (paths.length === 0) {
    console.error("check:docs-links found no paths to check - the parser broke.");
    process.exit(1);
  }

  console.log(`Checking ${paths.length} documentation links against ${ORIGIN}\n`);

  const failures = [];
  let checked = 0;

  for (const docPath of paths) {
    const url = `${ORIGIN}/${docPath}`;

    let response;

    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      console.log(`  SKIPPED (unreachable) ${docPath}`);
      continue;
    }

    checked += 1;
    if (response.ok) {
      console.log(`  ok   ${response.status}  ${docPath}`);
    } else {
      console.log(`  FAIL ${response.status}  ${docPath}`);
      failures.push({ docPath, status: response.status });
    }
  }

  if (checked === 0) {
    console.log("\ncheck:docs-links SKIPPED - docs.didit.me is not reachable.");

    return;
  }

  if (failures.length) {
    console.error(
      `\ncheck:docs-links FAILED - ${failures.length} of ${checked} links are dead:`,
    );
    for (const failure of failures) {
      console.error(`  ${failure.status}  ${ORIGIN}/${failure.docPath}`);
    }
    process.exit(1);
  }

  console.log(`\ncheck:docs-links OK - all ${checked} links resolve.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
