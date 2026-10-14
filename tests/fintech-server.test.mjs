// The fintech demo's API handlers (lib/fintech/server.ts), replayed against
// responses recorded from the Didit staging API. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

const {
  createAccount,
  createPayment,
  deleteAccount,
  discoverConsoleIds,
  getAccount,
  listPayments,
  previewMonitoring,
  readVerification,
  startVerification,
} = await import("../lib/fintech/server.ts");
const { MAX_PAYMENTS, ONBOARDING_WORKFLOW_ID } = await import(
  "../lib/fintech/model.ts"
);

const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/fintech/${name}.json`, import.meta.url)),
  );

const API = "https://verification.staging.didit.me";
const NOW = Date.UTC(2026, 9, 13, 21, 0, 0);

const DEPOSIT = fixture("transaction-deposit-approved").response;
const TRANSFER = fixture("transaction-transfer-approved").response;
const HELD = fixture("transaction-transfer-held").response;
const NOT_STARTED = fixture("decision-not-started").response;
const SESSION = fixture("session-create").response;

/** The same decision, as it reads once the person has been approved. */
const approved = { ...NOT_STARTED, status: "Approved" };

/**
 * A fetch that serves recorded responses by "METHOD path" and keeps every
 * request it was asked to make, so a test can assert what reached Didit.
 */
function didit(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const path = url.replace(API, "");
    const key = `${init.method ?? "GET"} ${path}`;

    calls.push({
      key,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
    });

    const route = routes[key];

    if (!route) throw new Error(`unexpected call ${key}`);
    if (route instanceof Error) throw route;

    const { status = 200, body } = typeof route === "function" ? route() : route;

    return new Response(JSON.stringify(body), { status });
  };

  return { fetch, calls };
}

function env(fetch, overrides = {}) {
  return {
    apiKey: "test-key",
    apiBase: API,
    live: true,
    callbackUrl: "https://demos.staging.didit.me/fintech",
    consoleOrigin: "https://business.staging.didit.me",
    consoleIds: async () => ({ orgId: "org-1", appId: "app-1" }),
    fetch,
    now: () => NOW,
    newId: () => "6f0c2b1e-0000-4000-8000-000000000001",
    ...overrides,
  };
}

const ACCOUNT = {
  v: 1,
  id: NOT_STARTED.vendor_data,
  name: "Lena Fischer",
  email: "lena.fischer@example.com",
  country: "DEU",
  sid: NOT_STARTED.session_id,
  tx: [],
  at: NOW,
};

const decisionPath = `GET /v3/session/${NOT_STARTED.session_id}/decision/`;

test("outside staging every handler refuses with 503", async () => {
  const { fetch, calls } = didit({});
  const off = env(fetch, { live: false });

  for (const reply of [
    await getAccount(off, ACCOUNT),
    await createAccount(off, { name: "A B", email: "a@b.co", country: "ESP" }),
    await startVerification(off, ACCOUNT, {}),
    await readVerification(off, ACCOUNT),
    await listPayments(off, ACCOUNT),
    await createPayment(off, ACCOUNT, { kind: "deposit", amount: 10 }),
    await previewMonitoring(off, ACCOUNT),
  ]) {
    assert.equal(reply.status, 503);
    assert.equal(reply.body.error, "unavailable");
  }
  assert.equal(calls.length, 0);

  const keyless = await getAccount(env(fetch, { apiKey: "" }), null);

  assert.equal(keyless.status, 503);
});

test("sign-up opens the account in the cookie without calling Didit", async () => {
  const { fetch, calls } = didit({});
  const reply = await createAccount(env(fetch), {
    name: "Lena Fischer",
    email: "lena.fischer@example.com",
    country: "DEU",
  });

  assert.equal(reply.status, 201);
  assert.equal(reply.account.id, "fintech-demo-6f0c2b1e-0000-4000-8000-000000000001");
  assert.equal(reply.account.sid, null);
  assert.deepEqual(reply.account.tx, []);
  assert.equal(reply.body.account.hasSession, false);
  assert.equal(calls.length, 0);

  const invalid = await createAccount(env(fetch), { name: "", email: "x" });

  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.fields, ["name", "email", "country"]);
  assert.equal(invalid.account, undefined);
});

test("start over clears the cookie", async () => {
  const reply = await deleteAccount();

  assert.equal(reply.account, null);
});

test("starting verification creates the session with the fixed workflow", async () => {
  const { fetch, calls } = didit({
    "POST /v3/session/": { status: 201, body: SESSION },
  });
  const reply = await startVerification(
    env(fetch),
    { ...ACCOUNT, sid: null },
    { locale: "pt-PT" },
  );

  assert.equal(reply.status, 201);
  assert.equal(reply.body.sessionId, SESSION.session_id);
  assert.equal(reply.account.sid, SESSION.session_id);

  const sent = calls[0];

  assert.equal(sent.headers["x-api-key"], "test-key");
  assert.equal(sent.body.workflow_id, ONBOARDING_WORKFLOW_ID);
  assert.equal(sent.body.vendor_data, ACCOUNT.id);
  assert.equal(sent.body.callback, "https://demos.staging.didit.me/fintech");
  assert.equal(sent.body.language, "pt");
});

test("the client cannot pick the workflow or the return address", async () => {
  const { fetch, calls } = didit({
    "POST /v3/session/": { status: 201, body: SESSION },
  });

  const reply = await startVerification(env(fetch), { ...ACCOUNT, sid: null }, {
    origin: "https://evil.example",
    callback: "https://evil.example/phish",
    workflow_id: "00000000-0000-0000-0000-000000000000",
    vendor_data: "someone-else",
  });

  assert.equal(reply.status, 201);
  assert.equal(calls[0].body.workflow_id, ONBOARDING_WORKFLOW_ID);
  assert.equal(calls[0].body.callback, "https://demos.staging.didit.me/fintech");
  assert.equal(calls[0].body.vendor_data, ACCOUNT.id);
});

test("starting again resumes the same unfinished session", async () => {
  // Staging answers a second POST /v3/session/ for the same vendor_data with
  // the session it already has (checked 2026-10-14 against #8123).
  const { fetch, calls } = didit({
    [decisionPath]: { body: NOT_STARTED },
    "POST /v3/session/": { status: 201, body: SESSION },
  });
  const reply = await startVerification(env(fetch), ACCOUNT, {});

  assert.equal(reply.status, 201);
  assert.deepEqual(
    calls.map((c) => c.key),
    [decisionPath, "POST /v3/session/"],
  );
});

test("a settled onboarding is not restarted", async () => {
  const { fetch, calls } = didit({ [decisionPath]: { body: approved } });
  const reply = await startVerification(env(fetch), ACCOUNT, {});

  assert.equal(reply.status, 409);
  assert.equal(reply.body.error, "already_verified");
  assert.equal(calls.length, 1);
});

test("the verification route reads this browser's session, statuses only", async () => {
  const { fetch } = didit({ [decisionPath]: { body: NOT_STARTED } });
  const reply = await readVerification(env(fetch), ACCOUNT);

  assert.equal(reply.status, 200);
  assert.equal(reply.body.verification.status, "not_started");
  assert.equal(
    reply.body.verification.consoleUrl,
    `https://business.staging.didit.me/console/org-1/app-1/kyc/verifications/${NOT_STARTED.session_id}`,
  );
  assert.doesNotMatch(JSON.stringify(reply.body), /example\.com|<redacted>/);

  assert.equal((await readVerification(env(fetch), null)).status, 401);
  assert.equal(
    (await readVerification(env(fetch), { ...ACCOUNT, sid: null })).status,
    404,
  );
});

test("the account route returns the account and its onboarding", async () => {
  const { fetch } = didit({ [decisionPath]: { body: NOT_STARTED } });
  const reply = await getAccount(env(fetch), ACCOUNT);

  assert.equal(reply.body.account.name, "Lena Fischer");
  assert.equal(reply.body.account.hasSession, true);
  assert.equal(reply.body.verification.sessionNumber, NOT_STARTED.session_number);

  assert.deepEqual((await getAccount(env(fetch), null)).body, { account: null });
});

test("payments need an approved customer", async () => {
  const { fetch, calls } = didit({ [decisionPath]: { body: NOT_STARTED } });
  const reply = await createPayment(env(fetch), ACCOUNT, {
    kind: "deposit",
    amount: 1000,
  });

  assert.equal(reply.status, 409);
  assert.equal(reply.body.error, "not_approved");
  assert.equal(calls.some((c) => c.key === "POST /v3/transactions/"), false);

  const noSession = await createPayment(env(fetch), { ...ACCOUNT, sid: null }, {
    kind: "deposit",
    amount: 1000,
  });

  assert.equal(noSession.body.error, "not_approved");
});

test("a deposit posts to transaction monitoring and is remembered", async () => {
  const { fetch, calls } = didit({
    [decisionPath]: { body: approved },
    "POST /v3/transactions/": { status: 201, body: DEPOSIT },
  });
  const reply = await createPayment(env(fetch), ACCOUNT, {
    kind: "deposit",
    amount: 10000,
  });

  assert.equal(reply.status, 201);
  assert.equal(reply.body.payment.status, "cleared");
  assert.equal(
    reply.body.payment.consoleUrl,
    `https://business.staging.didit.me/console/org-1/app-1/transactions/detail/${DEPOSIT.uuid}`,
  );
  assert.deepEqual(reply.account.tx, [DEPOSIT.uuid]);

  const posted = calls.find((c) => c.key === "POST /v3/transactions/").body;

  assert.equal(posted.subject.vendor_data, ACCOUNT.id);
  assert.equal(posted.transaction_details.direction, "inbound");
  assert.match(posted.transaction_id, new RegExp(`^${ACCOUNT.id}-`));
});

test("a transfer over the threshold comes back held, with the rule", async () => {
  const state = { ...ACCOUNT, tx: [DEPOSIT.uuid, TRANSFER.uuid] };
  const { fetch } = didit({
    [decisionPath]: { body: approved },
    [`GET /v3/transactions/${DEPOSIT.uuid}/`]: { body: DEPOSIT },
    [`GET /v3/transactions/${TRANSFER.uuid}/`]: { body: TRANSFER },
    "POST /v3/transactions/": { status: 201, body: HELD },
  });
  const reply = await createPayment(env(fetch), state, {
    kind: "transfer",
    amount: 6000,
    counterparty: "Jonas Weber",
  });

  assert.equal(reply.status, 201);
  assert.equal(reply.body.payment.status, "held");
  assert.equal(reply.body.payment.rules.length, 1);
  assert.deepEqual(reply.account.tx, [DEPOSIT.uuid, TRANSFER.uuid, HELD.uuid]);
});

test("the bank never sends more than the customer has", async () => {
  const state = { ...ACCOUNT, tx: [DEPOSIT.uuid, TRANSFER.uuid, HELD.uuid] };
  const { fetch, calls } = didit({
    [decisionPath]: { body: approved },
    [`GET /v3/transactions/${DEPOSIT.uuid}/`]: { body: DEPOSIT },
    [`GET /v3/transactions/${TRANSFER.uuid}/`]: { body: TRANSFER },
    [`GET /v3/transactions/${HELD.uuid}/`]: { body: HELD },
  });
  const reply = await createPayment(env(fetch), state, {
    kind: "transfer",
    amount: 4000,
    counterparty: "Marta Ruiz",
  });

  assert.equal(reply.status, 409);
  assert.equal(reply.body.error, "insufficient_funds");
  assert.equal(reply.body.available, 3750);
  assert.equal(calls.some((c) => c.key === "POST /v3/transactions/"), false);
});

test("invalid input and the per-browser cap are refused before Didit", async () => {
  const { fetch, calls } = didit({});

  const invalid = await createPayment(env(fetch), ACCOUNT, {
    kind: "transfer",
    amount: -5,
  });

  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.fields, ["amount", "counterparty"]);

  const full = await createPayment(
    env(fetch),
    { ...ACCOUNT, tx: Array(MAX_PAYMENTS).fill(DEPOSIT.uuid) },
    { kind: "deposit", amount: 10 },
  );

  assert.equal(full.status, 409);
  assert.equal(full.body.error, "limit");
  assert.equal(calls.length, 0);
});

test("the payment list re-reads each payment and totals the balance", async () => {
  const state = { ...ACCOUNT, tx: [DEPOSIT.uuid, TRANSFER.uuid, HELD.uuid] };
  const { fetch } = didit({
    [`GET /v3/transactions/${DEPOSIT.uuid}/`]: { body: DEPOSIT },
    [`GET /v3/transactions/${TRANSFER.uuid}/`]: { body: TRANSFER },
    [`GET /v3/transactions/${HELD.uuid}/`]: { body: HELD },
  });
  const reply = await listPayments(env(fetch), state);

  assert.equal(reply.status, 200);
  assert.deepEqual(reply.body.balances, { available: 3750, held: 6000 });
  assert.deepEqual(
    reply.body.payments.map((p) => p.status),
    ["held", "cleared", "cleared"],
  );
  assert.equal(reply.body.limit, MAX_PAYMENTS);
});

test("an operator's decision shows up on the next read", async () => {
  const state = { ...ACCOUNT, tx: [HELD.uuid] };
  let status = "IN_REVIEW";
  const { fetch } = didit({
    [`GET /v3/transactions/${HELD.uuid}/`]: () => ({ body: { ...HELD, status } }),
  });

  assert.equal((await listPayments(env(fetch), state)).body.payments[0].status, "held");
  status = "APPROVED";
  assert.equal(
    (await listPayments(env(fetch), state)).body.payments[0].status,
    "cleared",
  );
});

test("the monitoring preview is an estimate for this customer only", async () => {
  const recorded = fixture("aml-monitoring-estimate");
  const { fetch, calls } = didit({
    "POST /v3/users/aml-monitoring/": { body: recorded.response },
  });
  const reply = await previewMonitoring(env(fetch), ACCOUNT);

  assert.equal(reply.status, 200);
  assert.equal(reply.body.estimate.profiles, 1);
  assert.deepEqual(calls[0].body, {
    is_enabled: true,
    estimate_only: true,
    vendor_data_list: [ACCOUNT.id],
  });
});

test("Didit failures come back as 502 with the API's reason", async () => {
  const { fetch } = didit({
    [decisionPath]: {
      status: 404,
      body: { detail: "Session not found." },
    },
    "POST /v3/users/aml-monitoring/": new TypeError("fetch failed"),
  });
  const notFound = await readVerification(env(fetch), ACCOUNT);

  assert.equal(notFound.status, 502);
  assert.deepEqual(notFound.body, {
    error: "didit",
    upstream: 404,
    detail: "Session not found.",
  });

  const offline = await previewMonitoring(env(fetch), ACCOUNT);

  assert.equal(offline.status, 502);
  assert.equal(offline.body.upstream, 0);
});

test("console ids come from the first transaction summary", async () => {
  const { fetch, calls } = didit({
    "GET /v3/transactions/?limit=1": {
      body: { results: [{ organization_id: "org-1", application_id: "app-1" }] },
    },
  });

  assert.deepEqual(await discoverConsoleIds(env(fetch)), {
    orgId: "org-1",
    appId: "app-1",
  });
  assert.equal(calls[0].headers["x-api-key"], "test-key");

  const empty = didit({ "GET /v3/transactions/?limit=1": { body: { results: [] } } });

  assert.equal(await discoverConsoleIds(env(empty.fetch)), null);

  const offline = didit({ "GET /v3/transactions/?limit=1": new TypeError("fetch failed") });

  assert.equal(await discoverConsoleIds(env(offline.fetch)), null);
});

test("without console ids the records still load, with no deep link", async () => {
  const { fetch } = didit({ [decisionPath]: { body: NOT_STARTED } });
  const reply = await readVerification(
    env(fetch, { consoleIds: async () => null }),
    ACCOUNT,
  );

  assert.equal(reply.status, 200);
  assert.equal(reply.body.verification.consoleUrl, null);

  const failing = await readVerification(
    env(fetch, { consoleIds: async () => Promise.reject(new Error("down")) }),
    ACCOUNT,
  );

  assert.equal(failing.status, 200);
  assert.equal(failing.body.verification.consoleUrl, null);
});
