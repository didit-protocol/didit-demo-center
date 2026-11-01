// lib/didit: the shared client every demo uses. Run with `npm test`.
//
// The server half is driven with a recording `fetch`, so these tests pin what
// each helper sends to Didit (method, path, API key, body) and what it hands
// back, including that an unreachable API never throws.
import test from "node:test";
import assert from "node:assert/strict";

await import("./helpers/register.mjs");

process.env.NEXT_PUBLIC_IS_STAGING = "true";
process.env.API_KEY = "test-api-key";

const config = await import("../lib/didit/config.ts");
const server = await import("../lib/didit/server.ts");
const live = await import("../lib/didit/live.ts");
const demos = await import("../lib/didit/demos.ts");
const { describeAgent, stepUpOf } = await import("../lib/didit/browser.ts");

function recorder(answer = () => ({ status: 200, body: {} })) {
  const calls = [];
  const env = {
    apiBase: "https://api.test",
    apiKey: "k-123",
    fetch: async (url, init) => {
      const call = { url, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined };
      const { status, body } = answer(call);

      calls.push(call);

      return new Response(JSON.stringify(body), { status });
    },
  };

  return { calls, env };
}

test("one config: environment, base URLs and pick(production, staging)", () => {
  assert.equal(config.environment, "staging");
  assert.equal(config.pick("prod", "stage"), "stage");
  assert.equal(config.diditUrls.api, "https://verification.staging.didit.me");
  assert.equal(config.diditUrls.site, "https://demos.staging.didit.me");
  assert.equal(config.apiKey(), "test-api-key");
});

test("the publishable key is read from DIDIT_PUBLISHABLE_KEY, and only a real one counts", () => {
  delete process.env.DIDIT_PUBLISHABLE_KEY;
  assert.equal(config.publishableKey(), null);
  process.env.DIDIT_PUBLISHABLE_KEY = "not-a-key";
  assert.equal(config.publishableKey(), null);
  process.env.DIDIT_PUBLISHABLE_KEY = " pk_live_aHR0cHM6Ly9leGFtcGxlLnRlc3Q ";
  assert.equal(config.publishableKey(), "pk_live_aHR0cHM6Ly9leGFtcGxlLnRlc3Q");
  delete process.env.DIDIT_PUBLISHABLE_KEY;
});

test("vendor_data is the demo's prefix plus the Didit user id", () => {
  assert.equal(
    config.vendorDataFor("aurora-play-", "6f1c2a9e-4b7d-4c3e-9a10-2b5d8e7f0c11"),
    "aurora-play-6f1c2a9e-4b7d-4c3e-9a10-2b5d8e7f0c11",
  );
  assert.equal(config.vendorDataFor("aurora-play-", "../admin"), null);
  assert.equal(config.vendorDataFor("aurora-play-", ""), null);
});

test("every demo is a defineDemo config with workflows for this environment", () => {
  assert.deepEqual(
    demos.DEMOS.map((demo) => demo.route),
    ["/igaming", "/fintech", "/marketplace", "/crypto-exchange"],
  );
  // Staging keeps the workflows the demos already ran.
  assert.equal(demos.auroraPlay.workflows.age, "8482aee5-38b8-46fd-914b-e1bc6edcadca");
  assert.equal(demos.auroraPlay.workflows.kyc, "2db28cd2-7713-405f-89ad-144613b7086e");
  assert.equal(demos.alder.workflows.onboarding, "c076a8bb-b0a1-482a-a257-c296391fac2f");
  assert.equal(demos.kestrel.workflows.stepUp, "9b610989-c77e-48ad-9c27-0668c6edd2be");
  for (const demo of demos.DEMOS) assert.match(demo.vendorPrefix, /^[a-z-]+-$/);
});

test("sessions.create sends the workflow, the visitor and the callback with the API key", async () => {
  const { calls, env } = recorder(() => ({ status: 201, body: { session_id: "s-1", url: "https://verify.test/s-1" } }));
  const result = await server.didit.sessions.create(
    { workflowId: "wf-1", vendorData: "aurora-play-u1", callback: "https://demos.test/igaming", email: "a@example.com", metadata: { step: "registration" } },
    env,
  );

  assert.equal(calls[0].url, "https://api.test/v3/session/");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers["x-api-key"], "k-123");
  assert.deepEqual(calls[0].body, {
    workflow_id: "wf-1",
    vendor_data: "aurora-play-u1",
    callback: "https://demos.test/igaming",
    callback_method: "both",
    contact_details: { email: "a@example.com", send_notification_emails: false },
    metadata: { step: "registration" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.url, "https://verify.test/s-1");
  assert.deepEqual(result.call, { method: "POST", path: "/v3/session/", status: 201 });
});

test("decisions, transaction tokens, monitoring tokens and users hit their endpoints", async () => {
  const { calls, env } = recorder();

  await server.didit.sessions.decision("a/b", env);
  await server.didit.transactions.sdkToken({ vendorData: "aurora-play-u1" }, env);
  await server.didit.events.sdkToken({ vendorData: "aurora-play-u1" }, env);
  await server.didit.users.get("aurora-play-u1", env);
  await server.didit.transactions.list({ limit: 1 }, env);

  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.url.replace("https://api.test", "")}`),
    [
      "GET /v3/session/a%2Fb/decision/",
      "POST /v3/transactions/sdk-token/",
      "POST /v3/events/sdk-token/",
      "GET /v3/users/aurora-play-u1/",
      "GET /v3/transactions/?limit=1",
    ],
  );
  assert.deepEqual(calls[1].body, { vendor_data: "aurora-play-u1", ttl_seconds: 900, max_uses: 30 });
  assert.equal(calls[2].body.vendor_data, "aurora-play-u1");
  assert.ok(calls[2].body.allowed_event_categories.includes("auth"));
});

test("an unreachable API is status 0 with the call, never an exception", async () => {
  const env = { apiBase: "https://api.test", apiKey: "k", fetch: async () => { throw new TypeError("offline"); } };
  const result = await server.callDidit("GET", "/v3/users/x/", undefined, env);

  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.deepEqual(result.call, { method: "GET", path: "/v3/users/x/", status: 0 });
  assert.equal(server.diditMessage(result, "fallback"), "The Didit API could not be reached.");
  assert.equal(
    server.diditMessage({ ok: false, status: 400, data: { vendor_data: ["x"], detail: "Bad workflow" }, call: result.call }, "fallback"),
    "Bad workflow",
  );
});

test("console ids are read once per API key", async () => {
  const { calls, env } = recorder(() => ({
    status: 200,
    body: { results: [{ organization_id: "org-1", application_id: "app-1" }] },
  }));
  const first = [];
  const second = [];

  assert.deepEqual(await server.consoleIds(first, env), { organizationId: "org-1", applicationId: "app-1" });
  assert.deepEqual(await server.consoleIds(second, env), { organizationId: "org-1", applicationId: "app-1" });
  assert.equal(calls.length, 1);
  assert.equal(second.length, 0);
});

test("the live feed: newest on top, keyed events replace, at most 40, persisted per demo", () => {
  const stored = new Map();
  const storage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key),
  };
  let now = 1_000;
  const store = live.createLiveStore("aurora-play", storage, () => now);
  let heard = 0;

  store.subscribe(() => (heard += 1));
  store.push({ key: "txn-1", tone: "hold", product: "transactions", title: "Deposit held for an ID check", detail: "1,650.00 EUR" });
  now = 2_000;
  store.push({ tone: "sig", product: "signals", title: "Known device", detail: "Chrome on macOS" });
  now = 3_000;
  store.push({ key: "txn-1", tone: "txn", product: "transactions", title: "Deposit approved", detail: "1,650.00 EUR" });

  const events = store.get().events;

  assert.deepEqual(events.map((event) => event.title), ["Deposit approved", "Known device"]);
  assert.equal(events[0].at, 3_000);
  assert.equal(heard, 3);
  // A new page for the same demo reads the same feed back.
  assert.equal(live.createLiveStore("aurora-play", storage).get().events.length, 2);
  for (let index = 0; index < 50; index += 1)
    store.push({ tone: "txn", product: "transactions", title: `Bet ${index}`, detail: "" });
  assert.equal(store.get().events.length, live.MAX_EVENTS);
  store.clear();
  assert.equal(stored.size, 0);
  assert.deepEqual(live.latestByProduct([]), {});
});

test("how long ago, as the feed shows it", () => {
  assert.equal(live.ago(0, 10_000), "now");
  assert.equal(live.ago(0, 120_000), "2 min");
  assert.equal(live.ago(0, 2 * 3_600_000), "2 h");
});

test("the browser helpers: step-ups and device names", () => {
  assert.deepEqual(stepUpOf({ actionRequired: { type: "verification_session", url: "https://verify.test/s" } }), {
    type: "verification_session",
    url: "https://verify.test/s",
  });
  assert.equal(stepUpOf({}), null);
  assert.deepEqual(
    describeAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"),
    { browser: "Chrome", os: "macOS" },
  );
  assert.deepEqual(
    describeAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"),
    { browser: "Safari", os: "iOS" },
  );
});
