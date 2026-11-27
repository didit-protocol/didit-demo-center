#!/usr/bin/env node
/**
 * Creates what the marketplace demo (/marketplace) needs on the Didit
 * application behind API_KEY: the seller KYB workflow ("Demo - Marketplace
 * seller KYB") and the three transaction-monitoring rules. The definitions are
 * in lib/marketplace/setup.ts - the same objects the page's "How this uses
 * Didit" panel describes.
 *
 * Idempotent: the workflow is found by name and every rule by title, so a
 * re-run only creates what is missing. Existing workflows are never edited or
 * deleted. If the API refuses the create (an application holds at most 50
 * workflows), the application's existing KYB workflow is used instead. Rules
 * follow the rollout the Rules API recommends: created in TEST mode, then
 * switched to ACTIVE.
 *
 * Usage (reads API_KEY and NEXT_PUBLIC_IS_STAGING from .env):
 *   npm run marketplace:setup                 # dry run: prints what exists
 *   npm run marketplace:setup -- --apply      # creates what is missing
 *   npm run marketplace:setup -- --activate   # --apply, then rules ACTIVE
 *
 * Put the printed NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID in .env and in the hosting
 * environment's variables.
 *
 * https://docs.didit.me/management-api/workflows/create
 * https://docs.didit.me/transaction-monitoring/rules-api
 */

import { SELLER_COUNTRIES } from "../lib/marketplace/catalog.ts";
import { diditUrls } from "../lib/didit/config.ts";
import { northmarket } from "../lib/didit/demos.ts";
import {
  KYB_WORKFLOW_LABEL,
  ensureKybWorkflow,
  isWorkflowLimitError,
  ruleDefinitions,
} from "../lib/marketplace/setup.ts";

const KYB_ENV = "NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID";

const args = new Set(process.argv.slice(2));
const activate = args.has("--activate");
const apply = activate || args.has("--apply");

if (process.env.NEXT_PUBLIC_IS_STAGING !== "true") {
  console.error(
    "This setup creates the staging seller KYB workflow and rules (NEXT_PUBLIC_IS_STAGING=true). Production uses the published workflow in lib/didit/demos.ts.",
  );
  process.exit(1);
}

// The same base URL and workflows the routes use (lib/didit).
const base = diditUrls.api;
const workflows = northmarket.workflows;

async function call(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "x-api-key": process.env.API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

async function didit(method, path, body) {
  const reply = await call(method, path, body);

  if (reply.status >= 400) {
    throw new Error(
      `${method} ${path} -> ${reply.status} ${JSON.stringify(reply.body)}`,
    );
  }

  return reply.body;
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
  const setup = await ensureKybWorkflow(call, {
    apply,
    countries: SELLER_COUNTRIES.map((country) => country.code),
    personWorkflowUuid: workflows.person,
  });

  if (setup.refusal) {
    const reason = isWorkflowLimitError(setup.refusal.body)
      ? `the application already holds ${setup.workflowCount} workflows (archived ones included) and is at its workflow limit`
      : `the API answered ${setup.refusal.status} ${JSON.stringify(setup.refusal.body)}`;

    console.log(`"${KYB_WORKFLOW_LABEL}": NOT created - ${reason}.`);
  }

  switch (setup.outcome) {
    case "found":
      console.log(`"${KYB_WORKFLOW_LABEL}": ${setup.workflow.id}`);
      break;
    case "created":
      console.log(`"${KYB_WORKFLOW_LABEL}": created ${setup.workflow.id}`);
      break;
    case "existing":
      console.log(
        `Using the application's existing KYB workflow instead: "${setup.workflow.label}" ${setup.workflow.id}`,
      );
      break;
    default:
      console.log(
        setup.refusal
          ? "No KYB workflow exists on this application to use instead. Free a workflow slot in the console, then re-run."
          : `"${KYB_WORKFLOW_LABEL}": not created yet.`,
      );
  }

  return setup.workflow?.id ?? null;
}

async function ensureRules() {
  const rules = await listAll("/v3/transactions/rules/");

  for (const definition of ruleDefinitions(workflows.buyerAge)) {
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

  if (workflowId) {
    console.log(
      process.env[KYB_ENV] === workflowId
        ? `\n${KYB_ENV} is already set to it.`
        : `\nSet it in .env and in the hosting environment:\n${KYB_ENV}=${workflowId}`,
    );
  }
  if (!apply) console.log("\nDry run. Re-run with --apply, then --activate.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
