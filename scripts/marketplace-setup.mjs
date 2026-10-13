#!/usr/bin/env node
/**
 * Creates what the marketplace demo (/marketplace) needs on the Didit
 * application behind API_KEY: the seller KYB workflow and the three
 * transaction-monitoring rules. The definitions are in lib/marketplace/setup.ts
 * - the same objects the page's "How this uses Didit" panel describes.
 *
 * Idempotent: the workflow is matched by label and every rule by title, so a
 * re-run only creates what is missing. Rules follow the rollout the Rules API
 * recommends: created in TEST mode, then switched to ACTIVE.
 *
 * Usage (reads API_KEY and NEXT_PUBLIC_IS_STAGING from .env):
 *   npm run marketplace:setup                 # dry run: prints what exists
 *   npm run marketplace:setup -- --apply      # creates what is missing
 *   npm run marketplace:setup -- --activate   # --apply, then rules ACTIVE
 *
 * Paste the printed KYB workflow id into STAGING_WORKFLOWS.kyb in
 * lib/marketplace/config.ts.
 *
 * https://docs.didit.me/management-api/workflows/create
 * https://docs.didit.me/transaction-monitoring/rules-api
 */

import { SELLER_COUNTRIES } from "../lib/marketplace/catalog.ts";
import { STAGING_WORKFLOWS } from "../lib/marketplace/config.ts";
import {
  KYB_WORKFLOW_LABEL,
  kybWorkflowDefinition,
  ruleDefinitions,
} from "../lib/marketplace/setup.ts";

const args = new Set(process.argv.slice(2));
const activate = args.has("--activate");
const apply = activate || args.has("--apply");

if (process.env.NEXT_PUBLIC_IS_STAGING !== "true") {
  console.error(
    "The marketplace demo runs on staging only (NEXT_PUBLIC_IS_STAGING=true): a KYB registry search with UBOs is billed per company on production.",
  );
  process.exit(1);
}

const base = "https://verification.staging.didit.me";

async function didit(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "x-api-key": process.env.API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `${method} ${path} -> ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function listAll(path) {
  const rows = [];
  let next = `${path}?limit=100`;

  while (next) {
    const data = await didit("GET", next);
    const page = Array.isArray(data) ? data : (data?.results ?? []);

    rows.push(...page);
    next =
      !Array.isArray(data) && data?.next
        ? data.next.replace(/^https?:\/\/[^/]+/, "")
        : null;
  }

  return rows;
}

async function ensureWorkflow() {
  const workflows = await listAll("/v3/workflows/");
  const existing = workflows.find(
    (workflow) =>
      workflow.workflow_label === KYB_WORKFLOW_LABEL && !workflow.is_archived,
  );

  if (existing) {
    console.log(
      `KYB workflow: ${existing.workflow_id} (${existing.status}, v${existing.version})`,
    );

    return existing.workflow_id;
  }
  if (!apply) {
    console.log("KYB workflow: not created yet.");

    return null;
  }

  try {
    const created = await didit(
      "POST",
      "/v3/workflows/",
      kybWorkflowDefinition(
        SELLER_COUNTRIES.map((country) => country.code),
        STAGING_WORKFLOWS.person,
      ),
    );

    console.log(`KYB workflow: created ${created.workflow_id}`);

    return created.workflow_id;
  } catch (error) {
    // An application holds at most 50 workflows, archived ones included, and
    // only deleting one frees a slot. That is the application owner's call,
    // so the script reports it and carries on with the rules.
    if (String(error?.message).includes("Maximum of")) {
      console.log(
        `KYB workflow: NOT created - this application already holds ${workflows.length} workflow versions and is at its workflow limit. Free a slot in the console, then re-run.`,
      );

      return null;
    }
    throw error;
  }
}

async function ensureRules() {
  const rules = await listAll("/v3/transactions/rules/");

  for (const definition of ruleDefinitions(STAGING_WORKFLOWS.age)) {
    let rule = rules.find((candidate) => candidate.title === definition.title);

    if (!rule && !apply) {
      console.log(`Rule "${definition.title}": not created yet.`);
      continue;
    }
    if (!rule) {
      rule = await didit("POST", "/v3/transactions/rules/", {
        ...definition,
        mode: "TEST",
      });
      console.log(`Rule "${definition.title}": created ${rule.uuid} in TEST.`);
    } else {
      console.log(`Rule "${definition.title}": ${rule.uuid} (${rule.mode}).`);
    }

    if (activate && rule.mode !== "ACTIVE") {
      rule = await didit("PATCH", `/v3/transactions/rules/${rule.uuid}/`, {
        mode: "ACTIVE",
      });
      console.log(`  switched to ACTIVE.`);
    }
  }
}

async function main() {
  if (!process.env.API_KEY) {
    console.error("API_KEY is not set - copy .env.example to .env first.");
    process.exit(1);
  }

  console.log(`Application behind API_KEY on ${base}\n`);

  const workflowId = await ensureWorkflow();

  await ensureRules();

  if (workflowId && workflowId !== STAGING_WORKFLOWS.kyb) {
    console.log(
      `\nSet STAGING_WORKFLOWS.kyb = "${workflowId}" in lib/marketplace/config.ts.`,
    );
  }
  if (!apply) console.log("\nDry run. Re-run with --apply, then --activate.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
