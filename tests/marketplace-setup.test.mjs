// The one-time setup of the seller KYB workflow (lib/marketplace/setup.ts,
// scripts/marketplace-setup.mjs) and where the page reads its id from
// (lib/didit/demos.ts, through lib/marketplace/route.ts).
import test from "node:test";
import assert from "node:assert/strict";

import {
  KYB_WORKFLOW_LABEL,
  ensureKybWorkflow,
  findDemoKybWorkflow,
  findExistingKybWorkflow,
  isWorkflowLimitError,
} from "../lib/marketplace/setup.ts";

const OPTIONS = {
  apply: true,
  countries: ["ES", "GB"],
  personWorkflowUuid: "2db28cd2-7713-405f-89ad-144613b7086e",
};
// The answer POST /v3/workflows/ gives an application at its limit
// (applications/serializers/verification_settings.py).
const LIMIT_REFUSAL = {
  non_field_errors: ["Maximum of 50 workflows per application reached."],
};

const row = (fields) => ({
  workflow_id: crypto.randomUUID(),
  workflow_label: "1. FREE KYC",
  workflow_type: "kyc",
  features: "OCR + LIVENESS + FACE_MATCH",
  status: "published",
  version: 1,
  is_archived: false,
  ...fields,
});

/**
 * A fake API: GET /v3/workflows/ lists `pages` (one per request, linked by
 * `next`), POST answers `create`. Every call is recorded.
 */
function fakeApi({ pages, create = { status: 201, body: { workflow_id: "new-id" } } }) {
  const calls = [];
  const call = async (method, path, body) => {
    calls.push({ method, path, body });
    if (method === "GET") {
      const index = Number(new URL(path, "http://x").searchParams.get("page") ?? 0);
      const next =
        index + 1 < pages.length
          ? `https://verification.staging.didit.me/v3/workflows/?limit=100&page=${index + 1}`
          : null;

      return { status: 200, body: { count: pages.flat().length, next, results: pages[index] } };
    }

    return create;
  };

  return { call, calls };
}

test("an existing demo workflow is found by name and nothing is created", async () => {
  const own = row({ workflow_label: KYB_WORKFLOW_LABEL, workflow_type: "kyb", features: "KYB_REGISTRY" });
  const api = fakeApi({ pages: [[row(), own]] });

  const setup = await ensureKybWorkflow(api.call, OPTIONS);

  assert.equal(setup.outcome, "found");
  assert.deepEqual(setup.workflow, { id: own.workflow_id, label: KYB_WORKFLOW_LABEL });
  assert.deepEqual(api.calls.map((c) => c.method), ["GET"]);
});

test("a dry run reports the workflow as missing without creating it", async () => {
  const api = fakeApi({ pages: [[row()]] });

  const setup = await ensureKybWorkflow(api.call, { ...OPTIONS, apply: false });

  assert.equal(setup.outcome, "missing");
  assert.equal(setup.workflow, null);
  assert.equal(setup.refusal, null);
  assert.deepEqual(api.calls.map((c) => c.method), ["GET"]);
});

test("a missing workflow is created once, with the KYB definition", async () => {
  // An archived workflow with the same name does not count as existing.
  const archived = row({ workflow_label: KYB_WORKFLOW_LABEL, is_archived: true });
  const api = fakeApi({ pages: [[archived, row()]] });

  const setup = await ensureKybWorkflow(api.call, OPTIONS);

  assert.equal(setup.outcome, "created");
  assert.deepEqual(setup.workflow, { id: "new-id", label: KYB_WORKFLOW_LABEL });
  assert.equal(setup.workflowCount, 3);

  const post = api.calls.find((c) => c.method === "POST");

  assert.equal(post.path, "/v3/workflows/");
  assert.equal(post.body.workflow_label, KYB_WORKFLOW_LABEL);
  assert.deepEqual(
    post.body.features.map((f) => f.feature),
    ["KYB_REGISTRY", "KYB_KEY_PEOPLE", "KYB_DOCUMENTS"],
  );
  assert.deepEqual(Object.keys(post.body.features[0].config.kyb_registry_countries_config), ["ES", "GB"]);
  assert.equal(post.body.features[1].config.kyb_officer_verification_workflow, OPTIONS.personWorkflowUuid);
});

test("at the workflow limit the application's existing KYB workflow is used", async () => {
  const draft = row({ workflow_type: "kyb", features: "KYB_REGISTRY", status: "draft" });
  const archived = row({ workflow_type: "kyb", features: "KYB_REGISTRY", is_archived: true });
  const kyb = row({ workflow_label: "Business onboarding", workflow_type: "kyb", features: "KYB_REGISTRY + KYB_DOCUMENTS" });
  const older = row({ workflow_label: "Old KYB", workflow_type: null, features: "KYB_REGISTRY + AML" });
  const api = fakeApi({
    pages: [[row(), draft, archived], [kyb, older]],
    create: { status: 400, body: LIMIT_REFUSAL },
  });

  const setup = await ensureKybWorkflow(api.call, OPTIONS);

  assert.equal(setup.outcome, "existing");
  assert.deepEqual(setup.workflow, { id: kyb.workflow_id, label: "Business onboarding" });
  assert.deepEqual(setup.refusal, { status: 400, body: LIMIT_REFUSAL });
  assert.equal(setup.workflowCount, 5);
  // Both pages were read, the second through `next` with the host stripped.
  assert.deepEqual(
    api.calls.filter((c) => c.method === "GET").map((c) => c.path),
    ["/v3/workflows/?limit=100", "/v3/workflows/?limit=100&page=1"],
  );
});

test("a refused create with no KYB workflow to fall back on reports why", async () => {
  const api = fakeApi({ pages: [[row(), row({ workflow_type: null, features: "OCR + AML" })]], create: { status: 400, body: LIMIT_REFUSAL } });

  const setup = await ensureKybWorkflow(api.call, OPTIONS);

  assert.equal(setup.outcome, "missing");
  assert.equal(setup.workflow, null);
  assert.equal(setup.refusal.status, 400);
  assert.ok(isWorkflowLimitError(setup.refusal.body));
});

test("a server error is thrown, not mistaken for a refusal", async () => {
  const api = fakeApi({ pages: [[row()]], create: { status: 502, body: null } });

  await assert.rejects(ensureKybWorkflow(api.call, OPTIONS), /POST \/v3\/workflows\/ -> 502/);
});

test("a failed list stops the setup before anything is created", async () => {
  const calls = [];
  const call = async (method, path) => {
    calls.push(method);

    return { status: 403, body: { detail: "You do not have permission to perform this action." } };
  };

  await assert.rejects(ensureKybWorkflow(call, OPTIONS), /GET \/v3\/workflows\/\?limit=100 -> 403/);
  assert.deepEqual(calls, ["GET"]);
});

test("the setup only ever reads and creates workflows", async () => {
  const scenarios = [
    { pages: [[row({ workflow_label: KYB_WORKFLOW_LABEL })]] },
    { pages: [[row()]] },
    { pages: [[row({ workflow_type: "kyb", features: "KYB_REGISTRY" })]], create: { status: 400, body: LIMIT_REFUSAL } },
    { pages: [[row()]], create: { status: 400, body: { features: ["invalid"] } } },
  ];

  for (const scenario of scenarios) {
    const api = fakeApi(scenario);

    await ensureKybWorkflow(api.call, OPTIONS);
    assert.ok(api.calls.every((c) => c.method === "GET" || c.method === "POST"));
    assert.ok(api.calls.filter((c) => c.method === "POST").length <= 1);
    assert.ok(api.calls.every((c) => c.method !== "POST" || c.path === "/v3/workflows/"));
  }
});

test("lookups ignore archived rows and other names", () => {
  const own = row({ workflow_label: KYB_WORKFLOW_LABEL });

  assert.equal(findDemoKybWorkflow([row(), row({ workflow_label: KYB_WORKFLOW_LABEL, is_archived: true })]), null);
  assert.equal(findDemoKybWorkflow([row(), own]), own);
  assert.equal(findExistingKybWorkflow([row(), row({ workflow_type: null, features: null })]), null);
});

test("only the limit message counts as the limit", () => {
  assert.ok(isWorkflowLimitError(LIMIT_REFUSAL));
  assert.equal(isWorkflowLimitError({ features: ["This field is required."] }), false);
  assert.equal(isWorkflowLimitError(null), false);
});

test("the routes take their workflows from the Northmarket config", async () => {
  await import("./helpers/register.mjs");
  const { marketEnv } = await import("../lib/marketplace/route.ts");
  const { northmarket } = await import("../lib/didit/demos.ts");
  const env = await marketEnv();

  assert.deepEqual(env.workflows, {
    kyb: northmarket.workflows.sellerKyb,
    age: northmarket.workflows.buyerAge,
    person: northmarket.workflows.person,
  });
  // The suite runs as production: the production seller KYB.
  assert.equal(env.workflows.kyb, "811d80dd-491e-4799-b905-2c8007c9df78");
  // Authentication is off without a publishable key: cookie identities.
  assert.equal(env.visitor, undefined);
});
