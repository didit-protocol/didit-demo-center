#!/usr/bin/env node
/**
 * Installs what the /fintech demo needs on a Didit application: the
 * transaction-monitoring rule that holds outbound EUR transfers of 5,000 or
 * more for review. The definition is REVIEW_RULE in lib/fintech/model.ts, the
 * same object the app's "How this uses Didit" panel describes. It only matches
 * transactions carrying the demo's `custom_properties.demo_app = "fintech"`,
 * so other traffic on a shared application is never touched.
 *
 * Usage:
 *   npm run fintech:setup              # create the rule, or update it
 *   npm run fintech:setup -- --dry-run # print the payload, change nothing
 *
 * Reads API_KEY and NEXT_PUBLIC_IS_STAGING from the environment or from .env.
 * Safe to run any number of times: the rule is matched by title, created when
 * missing and PATCHed back to the definition when present. The demo runs on
 * staging only (lib/fintech/route.ts), so that is where it needs the rule.
 *
 * https://docs.didit.me/transaction-monitoring/rules-api
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(repoRoot, ".env");

if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { REVIEW_RULE } = await import("../lib/fintech/model.ts");

const dryRun = process.argv.includes("--dry-run");
const apiKey = process.env.API_KEY;
const base =
  process.env.NEXT_PUBLIC_IS_STAGING === "true"
    ? "https://verification.staging.didit.me"
    : "https://verification.didit.me";

async function didit(method, pathname, body) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `${method} ${pathname} returned ${response.status}: ${JSON.stringify(data)}`,
    );
  }

  return data;
}

const results = (data) => (Array.isArray(data) ? data : data?.results ?? []);

async function main() {
  if (!apiKey) {
    console.error("API_KEY is not set (environment or .env).");
    process.exit(1);
  }

  console.log(`Didit application behind API_KEY on ${base}\n`);

  const installed = results(
    await didit("GET", "/v3/transactions/rules/?page_size=500"),
  );
  const existing = installed.find((item) => item.title === REVIEW_RULE.title);

  if (dryRun) {
    console.log(
      `would ${existing ? "update" : "create"} rule "${REVIEW_RULE.title}"${
        existing ? ` ${existing.uuid} (now ${existing.mode})` : ""
      }\n${JSON.stringify(REVIEW_RULE, null, 2)}`,
    );

    return;
  }
  if (existing) {
    await didit("PATCH", `/v3/transactions/rules/${existing.uuid}/`, REVIEW_RULE);
    console.log(`updated rule "${REVIEW_RULE.title}" ${existing.uuid}`);
  } else {
    const created = await didit("POST", "/v3/transactions/rules/", REVIEW_RULE);

    console.log(`created rule "${REVIEW_RULE.title}" ${created.uuid}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
