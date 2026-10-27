// The ACCS ISO 27566 workflows and the reason /api/verification hands back
// when Didit refuses a session. Run with `npm test`.
//
// The two ACCS catalogue cards and /accs sent the production workflow ids on
// staging too. Staging answered {"workflow_id": "Invalid workflow_id."}, and
// this route reduced that to "Failed to create verification session", so the
// cards failed on demos.staging.didit.me with no reason on screen.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

process.env.API_KEY = "test-api-key";

const PRODUCTION_ESTIMATION = "2d958679-f3bf-4747-8a38-9a40a29a6098";
const PRODUCTION_VERIFICATION = "a8942aa3-3bfe-4e1c-b322-d0d43e7ec31f";

// The module reads the environment once, so each build gets its own copy.
process.env.NEXT_PUBLIC_IS_STAGING = "false";
const production = await import("../lib/accs-workflows.ts?build=production");
process.env.NEXT_PUBLIC_IS_STAGING = "true";
const staging = await import("../lib/accs-workflows.ts");

const { DEMOS } = await import("../lib/demos.ts");
const { NextRequest } = await import("next/server");
const verification = await import("../app/api/verification/route.ts");

const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`./fixtures/verification/${name}.json`, import.meta.url),
    ),
  );

const source = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("a production build launches the production ACCS workflows", () => {
  assert.equal(production.ACCS_ESTIMATION_WORKFLOW_ID, PRODUCTION_ESTIMATION);
  assert.equal(
    production.ACCS_VERIFICATION_WORKFLOW_ID,
    PRODUCTION_VERIFICATION,
  );
  assert.match(production.ACCS_WORKFLOW_NOTE, /^Production workflow/);
  assert.equal(production.ACCS_ENGINE, "production");
});

test("a staging build launches the staging twins, never a production id", () => {
  assert.equal(
    staging.ACCS_ESTIMATION_WORKFLOW_ID,
    "d444046b-af0d-4e5b-b3ca-95d08419e654",
  );
  assert.equal(
    staging.ACCS_VERIFICATION_WORKFLOW_ID,
    "5f4d97b5-4d09-470c-836a-181c2db3d565",
  );
  assert.match(staging.ACCS_WORKFLOW_NOTE, /^Staging twin/);
  assert.equal(staging.ACCS_ENGINE, "staging");
});

test("the ACCS catalogue cards use the shared workflow ids", () => {
  const card = (id) => DEMOS.find((demo) => demo.id === id);

  assert.equal(
    card("accs-estimation").workflowId,
    staging.ACCS_ESTIMATION_WORKFLOW_ID,
  );
  assert.equal(
    card("accs-verification").workflowId,
    staging.ACCS_VERIFICATION_WORKFLOW_ID,
  );
  assert.equal(card("accs-estimation").note, staging.ACCS_WORKFLOW_NOTE);
  assert.equal(card("accs-verification").note, staging.ACCS_WORKFLOW_NOTE);
});

test("no page hard-codes a production ACCS workflow id", () => {
  for (const path of ["lib/demos.ts", "app/accs/page.tsx"]) {
    const text = source(path);

    assert.ok(
      !text.includes(PRODUCTION_ESTIMATION),
      `${path} hard-codes ${PRODUCTION_ESTIMATION}`,
    );
    assert.ok(
      !text.includes(PRODUCTION_VERIFICATION),
      `${path} hard-codes ${PRODUCTION_VERIFICATION}`,
    );
  }
  assert.match(source("app/accs/page.tsx"), /from "@\/lib\/accs-workflows"/);
  // On staging the page must not claim the production engine ran the session.
  assert.ok(
    !source("app/accs/page.tsx").includes("the production verification engine"),
  );
});

async function createSession(answer) {
  globalThis.fetch = async () =>
    Response.json(answer.response, { status: answer.status });

  const response = await verification.POST(
    new NextRequest("http://localhost/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflow_id: PRODUCTION_ESTIMATION,
        vendor_data: "accs-test",
        callback: "https://demos.staging.didit.me/verification/callback",
      }),
    }),
  );

  return { status: response.status, body: await response.json() };
}

test("a refused workflow id reaches the page as the API's own reason", async () => {
  const answer = fixture("session-create-production-workflow-on-staging");

  assert.deepEqual(await createSession(answer), {
    status: 400,
    body: { error: "Invalid workflow_id." },
  });
});

test("a field error the message does not name keeps its field", async () => {
  const answer = fixture("session-create-callback-without-scheme");

  assert.deepEqual(await createSession(answer), {
    status: 400,
    body: {
      error: "callback: URL must have a scheme (e.g., https:// or myapp://)",
    },
  });
});

test("a non-field error is passed through as it is", async () => {
  const answer = fixture("workflow-create-limit-reached");

  assert.deepEqual(await createSession(answer), {
    status: 400,
    body: { error: "Maximum of 50 workflows per application reached." },
  });
});
