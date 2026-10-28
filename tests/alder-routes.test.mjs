// The /api/fintech route handlers (Alder), end to end against a stubbed
// Didit API. Run with `npm test`.
//
// `fetch` is replaced by a recorder that answers each Didit endpoint, so these
// tests pin what each route sends to Didit and what it hands back, including
// that no payment token is minted before an approved onboarding and that a
// session owned by anyone else is never returned.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

process.env.API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_IS_STAGING = "true";
delete process.env.DIDIT_PUBLISHABLE_KEY;

const { NextRequest } = await import("next/server");
const { CUSTOMER_COOKIE, signCustomer } = await import("../lib/fintech/customer.ts");
const { ONBOARDING_WORKFLOW_ID } = await import("../lib/fintech/alder.ts");

const route = (name) => import(`../app/api/fintech/${name}/route.ts`);
const customerRoute = await route("customer");
const onboarding = await route("onboarding");
const sessions = await route("sessions/[sessionId]");
const token = await route("token");
const monitoring = await route("monitoring-token");

const CUSTOMER = "alder-0f3a9c21d4e85b7a6c19e2d0";
const SESSION = "c5c01e9c-461c-4726-b288-c16fb8ec41b1";

let calls = [];
let answers = {};

globalThis.fetch = async (url, init = {}) => {
  const target = new URL(String(url));
  const key = `${init.method ?? "GET"} ${target.pathname}${target.search}`;

  calls.push({
    key,
    apiKey: init.headers?.["x-api-key"],
    body: init.body ? JSON.parse(init.body) : undefined,
  });
  const answer = answers[key];

  if (!answer) return Response.json({ detail: `unexpected ${key}` }, { status: 500 });

  return Response.json(answer.body, { status: answer.status ?? 200 });
};

function reset(next = {}) {
  calls = [];
  answers = next;
}

function request(path, { method = "GET", body, cookie = CUSTOMER } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (cookie) headers.set("cookie", `${CUSTOMER_COOKIE}=${signCustomer(cookie, "test-api-key")}`);

  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const decision = (overrides = {}) => ({
  session_id: SESSION,
  vendor_data: CUSTOMER,
  workflow_id: ONBOARDING_WORKFLOW_ID,
  status: "Approved",
  id_verifications: [{ first_name: "Lena", last_name: "Fischer", document_type: "Identity Card", portrait_image: "https://signed/p.jpg" }],
  aml_screenings: [{ total_hits: 0 }],
  ...overrides,
});

const params = (sessionId) => ({ params: Promise.resolve({ sessionId }) });

test("opening an account sets a signed customer cookie; a forged one is nobody", async () => {
  reset();
  const response = await customerRoute.POST(request("/api/fintech/customer", { method: "POST", cookie: null }));
  const body = await response.json();

  assert.match(body.customerId, /^alder-[a-f0-9]{24}$/);
  assert.match(response.headers.get("set-cookie"), /alder_customer=alder-/);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);

  const forged = new NextRequest("http://localhost:3000/api/fintech/customer", {
    headers: { cookie: `${CUSTOMER_COOKIE}=${CUSTOMER}.forged` },
  });

  assert.equal((await (await customerRoute.GET(forged)).json()).customerId, null);
  assert.equal(calls.length, 0);
});

test("onboarding creates the KYC + AML session for this customer, returning to /fintech", async () => {
  reset({
    "POST /v3/session/": {
      status: 201,
      body: JSON.parse(fs.readFileSync(new URL("./fixtures/alder/session-create.json", import.meta.url), "utf8")).body,
    },
  });
  const response = await onboarding.POST(
    request("/api/fintech/onboarding", {
      method: "POST",
      body: { email: "lena.fischer@example.com", fullName: "Lena Fischer" },
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.sessionId, SESSION);
  assert.equal(calls[0].apiKey, "test-api-key");
  assert.equal(calls[0].body.workflow_id, ONBOARDING_WORKFLOW_ID);
  assert.equal(calls[0].body.vendor_data, CUSTOMER);
  assert.equal(calls[0].body.callback, "https://demos.staging.didit.me/fintech");
  assert.deepEqual(calls[0].body.contact_details, {
    email: "lena.fischer@example.com",
    send_notification_emails: false,
  });

  reset();
  const bad = await onboarding.POST(
    request("/api/fintech/onboarding", { method: "POST", body: { email: "nope" } }),
  );

  assert.equal(bad.status, 400);
  assert.equal(calls.length, 0);
  const nobody = await onboarding.POST(
    request("/api/fintech/onboarding", { method: "POST", body: { email: "a@b.co" }, cookie: null }),
  );

  assert.equal(nobody.status, 401);
});

test("a session read is cut down for its owner and a stranger's is a 404", async () => {
  reset({ [`GET /v3/session/${SESSION}/decision/`]: { body: decision() } });
  const mine = await sessions.GET(request(`/api/fintech/sessions/${SESSION}`), params(SESSION));
  const { session } = await mine.json();

  assert.equal(session.status, "Approved");
  assert.equal(session.fullName, "Lena Fischer");
  assert.equal(session.amlHits, 0);
  assert.ok(!JSON.stringify(session).includes("signed/p.jpg"));

  reset({ [`GET /v3/session/${SESSION}/decision/`]: { body: decision({ vendor_data: "alder-someone-else" }) } });
  const theirs = await sessions.GET(request(`/api/fintech/sessions/${SESSION}`), params(SESSION));

  assert.equal(theirs.status, 404);
});

test("no payment token before Didit approves this customer's onboarding", async () => {
  const mint = (sessionId) =>
    token.POST(request("/api/fintech/token", { method: "POST", body: { onboardingSessionId: sessionId } }));

  reset();
  assert.equal((await mint("not-a-session")).status, 403);
  assert.equal(calls.length, 0);

  for (const overrides of [
    { status: "In Review" },
    { vendor_data: "alder-someone-else" },
    { workflow_id: "2db28cd2-7713-405f-89ad-144613b7086e" },
  ]) {
    reset({ [`GET /v3/session/${SESSION}/decision/`]: { body: decision(overrides) } });
    assert.equal((await mint(SESSION)).status, 403, JSON.stringify(overrides));
    assert.deepEqual(calls.map((call) => call.key), [`GET /v3/session/${SESSION}/decision/`]);
  }

  reset({
    [`GET /v3/session/${SESSION}/decision/`]: { body: decision() },
    "POST /v3/transactions/sdk-token/": {
      status: 201,
      body: { sdk_token: "sdk-1", expires_at: "2026-10-27T14:00:00Z" },
    },
  });
  const minted = await mint(SESSION);
  const body = await minted.json();

  assert.equal(minted.status, 200);
  assert.equal(body.token, "sdk-1");
  assert.equal(body.baseUrl, "https://verification.staging.didit.me");
  assert.deepEqual(calls[1].body, { vendor_data: CUSTOMER, ttl_seconds: 900, max_uses: 30 });
});

test("the monitoring token is minted for this customer, and a disabled lane says so", async () => {
  reset({
    "POST /v3/events/sdk-token/": { status: 201, body: { monitoring_token: "mt-1", expires_at: null } },
  });
  const ok = await (await monitoring.POST(request("/api/fintech/monitoring-token", { method: "POST" }))).json();

  assert.equal(ok.token, "mt-1");
  assert.equal(ok.baseUrl, "https://verification.staging.didit.me");
  assert.equal(calls[0].body.vendor_data, CUSTOMER);
  assert.ok(calls[0].body.allowed_event_categories.includes("security"));

  reset({
    "POST /v3/events/sdk-token/": {
      status: 403,
      body: {
        detail: "Event monitoring is not enabled for this application.",
        code: "event_monitoring_disabled",
      },
    },
  });
  const off = await monitoring.POST(request("/api/fintech/monitoring-token", { method: "POST" }));

  assert.equal(off.status, 403);
  assert.equal((await off.json()).code, "event_monitoring_disabled");
});

test("the customer read says authenticated only for a signed-in visitor", async () => {
  reset();
  const cookie = await (await customerRoute.GET(request("/api/fintech/customer"))).json();

  assert.deepEqual(cookie, { customerId: CUSTOMER, authenticated: false });

  // Authentication on, nobody signed in: no customer, and not authenticated.
  process.env.DIDIT_PUBLISHABLE_KEY = "pk_test_alder";
  try {
    const visitor = await (await customerRoute.GET(request("/api/fintech/customer", { cookie: null }))).json();

    assert.deepEqual(visitor, { customerId: null, authenticated: false });
  } finally {
    delete process.env.DIDIT_PUBLISHABLE_KEY;
  }
  assert.equal(calls.length, 0);
});
