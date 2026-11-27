#!/usr/bin/env node
/**
 * Configures the Didit application for the /crypto-exchange demo (Kestrel):
 * the three transaction rules and the Travel Rule settings defined in
 * lib/crypto-exchange/policy.ts.
 *
 * Usage:
 *   npm run crypto-exchange:setup              # create what is missing, update the rest
 *   npm run crypto-exchange:setup -- --dry-run # print what would change, change nothing
 *
 * Reads API_KEY and NEXT_PUBLIC_IS_STAGING from the environment or from .env.
 * Safe to run any number of times: rules are matched by title, created when
 * missing and PATCHed back to their definition when present. It never touches a
 * rule it did not define.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(repoRoot, ".env");

if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

// Loaded after .env so NEXT_PUBLIC_IS_STAGING picks the right workflow ids.
const policy = await import("../lib/crypto-exchange/policy.ts");

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

/** The fields a rule definition owns, compared to decide whether to PATCH. */
const OWNED = ["description", "category", "mode", "evaluation_mode", "scope", "conditions", "actions"];

/** JSON with sorted keys: the API stores objects with its own key order. */
const canonical = (value) =>
  JSON.stringify(value ?? null, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );

const same = (a, b) => canonical(a) === canonical(b);

async function ensureRule(definition, existingRules) {
  const existing = existingRules.find((rule) => rule.title === definition.title);

  if (!existing) {
    if (dryRun) {
      console.log(`would create rule "${definition.title}"`);

      return;
    }
    const created = await didit("POST", "/v3/transactions/rules/", definition);

    console.log(`created rule "${definition.title}" ${created.uuid}`);

    return;
  }

  const changed = OWNED.filter((key) => !same(existing[key], definition[key]));

  if (changed.length === 0) {
    console.log(`rule "${definition.title}" ${existing.uuid} is up to date`);

    return;
  }
  if (dryRun) {
    console.log(`would update rule "${definition.title}" (${changed.join(", ")})`);

    return;
  }
  await didit("PATCH", `/v3/transactions/rules/${existing.uuid}/`, definition);
  console.log(`updated rule "${definition.title}" ${existing.uuid} (${changed.join(", ")})`);
}

async function ensureTravelRule() {
  const current = await didit("GET", "/v3/travel-rule/settings/");
  const wanted = policy.TRAVEL_RULE_SETTINGS;
  const changed = Object.keys(wanted).filter(
    (key) => String(current?.[key]) !== String(wanted[key]),
  );

  if (changed.length === 0) {
    console.log("Travel Rule settings are up to date");

    return;
  }
  if (dryRun) {
    console.log(`would update Travel Rule settings (${changed.join(", ")})`);

    return;
  }
  // PUT is a partial upsert here: only the keys sent change.
  await didit("PUT", "/v3/travel-rule/settings/", wanted);
  console.log(`updated Travel Rule settings (${changed.join(", ")})`);
}

async function main() {
  if (!apiKey) {
    console.error("API_KEY is not set (environment or .env).");
    process.exit(1);
  }

  const stepUp = policy.CX_WORKFLOWS.stepUp;

  if (!stepUp) {
    console.error(
      "No step-up workflow is configured for this environment in lib/crypto-exchange/policy.ts.",
    );
    process.exit(1);
  }

  console.log(`${dryRun ? "[dry run] " : ""}Configuring ${base}\n`);

  const existingRules = results(await didit("GET", "/v3/transactions/rules/?limit=200"));

  for (const definition of policy.cryptoExchangeRules(stepUp)) {
    await ensureRule(definition, existingRules);
  }
  await ensureTravelRule();
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
