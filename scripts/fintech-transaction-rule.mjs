#!/usr/bin/env node
/**
 * Installs the transaction-monitoring rule the fintech demo (/fintech) relies
 * on: outbound EUR transfers of 5,000 or more from the demo go to review.
 *
 * The rule lives on the Didit application behind API_KEY, so it has to exist
 * there once before "Send money" can show a held payment. The definition is
 * REVIEW_RULE in lib/fintech/model.ts - the same object the app's "How this
 * uses Didit" panel describes - and it only matches transactions carrying the
 * demo's `custom_properties.demo_app = "fintech"`, so other traffic on a shared
 * application is never touched.
 *
 * Follows the rollout the Rules API recommends: create in TEST mode (it records
 * what it would have matched without changing anything), then switch to ACTIVE.
 *
 * Usage (reads API_KEY and NEXT_PUBLIC_IS_STAGING from .env):
 *   npm run fintech:rule                 # dry run: prints the rule and its state
 *   npm run fintech:rule -- --apply      # creates it in TEST mode if missing
 *   npm run fintech:rule -- --activate   # creates it if missing, then ACTIVE
 *
 * https://docs.didit.me/transaction-monitoring/rules-api
 */

import { REVIEW_RULE } from "../lib/fintech/model.ts";

const args = new Set(process.argv.slice(2));
const activate = args.has("--activate");
const apply = activate || args.has("--apply");

const base =
  process.env.NEXT_PUBLIC_IS_STAGING === "true"
    ? "https://verification.staging.didit.me"
    : "https://verification.didit.me";

async function didit(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "x-api-key": process.env.API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `${method} ${path} -> ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function findRule() {
  const data = await didit("GET", "/v3/transactions/rules/");
  const rules = Array.isArray(data) ? data : (data?.results ?? []);

  return rules.find((rule) => rule.title === REVIEW_RULE.title) ?? null;
}

async function main() {
  if (!process.env.API_KEY) {
    console.error("API_KEY is not set - copy .env.example to .env first.");
    process.exit(1);
  }

  console.log(`Application: ${base}`);
  console.log(`Rule: ${REVIEW_RULE.title}\n`);

  let rule = await findRule();

  if (!apply) {
    console.log(JSON.stringify({ ...REVIEW_RULE, mode: "TEST" }, null, 2));
    console.log(
      rule
        ? `\nInstalled: ${rule.uuid} (mode ${rule.mode}). Nothing changed.`
        : "\nNot installed. Dry run - re-run with --apply, then --activate.",
    );

    return;
  }

  if (!rule) {
    rule = await didit("POST", "/v3/transactions/rules/", {
      ...REVIEW_RULE,
      mode: "TEST",
    });
    console.log(`Created ${rule.uuid} in TEST mode.`);
  } else {
    console.log(`Already installed: ${rule.uuid} (mode ${rule.mode}).`);
  }

  if (activate && rule.mode !== "ACTIVE") {
    rule = await didit("PATCH", `/v3/transactions/rules/${rule.uuid}/`, {
      mode: "ACTIVE",
    });
    console.log(`Switched ${rule.uuid} to ACTIVE.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
