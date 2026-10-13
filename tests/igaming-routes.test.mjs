// The /api/igaming route handlers, end to end against a stubbed Didit API.
// Run with `npm test`.
//
// `fetch` is replaced by a recorder that answers each Didit endpoint with the
// shape staging returned during the integration dry run, so these tests pin
// what each route sends to Didit (endpoint, API key, body) and what it hands
// back to the browser - including that a record owned by another player is
// never returned.
import test from "node:test";
import assert from "node:assert/strict";

await import("./helpers/register.mjs");

process.env.API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_IS_STAGING = "true";

const { NextRequest } = await import("next/server");
const { PLAYER_COOKIE, signPlayer } = await import("../lib/igaming/player.ts");
const policy = await import("../lib/igaming/policy.ts");

const route = (name) => import(`../app/api/igaming/${name}/route.ts`);
const player = await route("player");
const ageCheck = await route("age-check");
const sessions = await route("sessions/[sessionId]");
const verified = await route("verified");
const token = await route("token");
const selfExclusion = await route("self-exclusion");
const operator = await route("operator");

const BASE = "https://verification.staging.didit.me";
const PLAYER = "aurora-play-0123456789abcdef01234567";
const SESSION = "11111111-2222-3333-4444-555555555555";

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

function request(path, { method = "GET", body, cookie = PLAYER } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (cookie) headers.set("cookie", `${PLAYER_COOKIE}=${signPlayer(cookie, "test-api-key")}`);

  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const decision = (overrides = {}) => ({
  session_id: SESSION,
  vendor_data: PLAYER,
  workflow_id: policy.AGE_WORKFLOW_ID,
  status: "Approved",
  liveness_checks: [{ age_estimation: 29.4, reference_image: "https://signed/x.jpg" }],
  id_verifications: [],
  ip_analyses: [{ ip_country: "Spain", ip_country_code: "ES", is_vpn_or_tor: false, is_data_center: false }],
  ...overrides,
});

test("POST /player issues a signed, httpOnly player cookie; GET reads it back", async () => {
  reset();
  const created = await player.POST(request("/api/igaming/player", { method: "POST", cookie: null }));
  const { playerId } = await created.json();
  const cookie = created.cookies.get(PLAYER_COOKIE);

  assert.equal(created.status, 200);
  assert.ok(policy.isPlayerId(playerId));
  assert.equal(cookie.value, signPlayer(playerId, "test-api-key"));
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(calls.length, 0, "creating a player calls nothing");

  const read = await player.GET(request("/api/igaming/player", { cookie: playerId }));

  assert.deepEqual(await read.json(), { playerId });
  const forged = new NextRequest("http://localhost:3000/api/igaming/player", {
    headers: { cookie: `${PLAYER_COOKIE}=${playerId}.not-the-signature` },
  });

  assert.deepEqual(await (await player.GET(forged)).json(), { playerId: null });
});

test("every player route refuses a request without the cookie and calls nothing", async () => {
  reset();
  const anonymous = { cookie: null, method: "POST", body: {} };
  const responses = [
    await ageCheck.POST(request("/api/igaming/age-check", anonymous)),
    await token.POST(request("/api/igaming/token", anonymous)),
    await verified.POST(request("/api/igaming/verified", anonymous)),
    await selfExclusion.POST(request("/api/igaming/self-exclusion", anonymous)),
    await operator.GET(request("/api/igaming/operator", { cookie: null })),
    await sessions.GET(request(`/api/igaming/sessions/${SESSION}`, { cookie: null }), {
      params: { sessionId: SESSION },
    }),
  ];

  assert.deepEqual(responses.map((response) => response.status), [401, 401, 401, 401, 401, 401]);
  assert.equal(calls.length, 0);
});

test("POST /age-check creates the adaptive age session for this player", async () => {
  reset({
    "POST /v3/session/": {
      status: 201,
      body: { session_id: SESSION, url: "https://verify.staging.didit.me/session/tok", status: "Not Started" },
    },
  });
  const response = await ageCheck.POST(
    request("/api/igaming/age-check", {
      method: "POST",
      body: { fullName: "Alex Demo", email: "alex@example.com", returnUrl: "https://demos.didit.me/igaming" },
    }),
  );
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.sessionId, SESSION);
  assert.equal(data.url, "https://verify.staging.didit.me/session/tok");
  assert.deepEqual(data.didit, [{ method: "POST", path: "/v3/session/", status: 201 }]);
  assert.equal(calls[0].apiKey, "test-api-key");
  assert.deepEqual(calls[0].body, {
    workflow_id: policy.AGE_WORKFLOW_ID,
    vendor_data: PLAYER,
    callback: "https://demos.didit.me/igaming",
    callback_method: "both",
    contact_details: { email: "alex@example.com", send_notification_emails: false },
    metadata: { operator: "Aurora Play", step: "registration", full_name: "Alex Demo" },
  });
});

test("POST /age-check validates before calling Didit and passes Didit's reason on", async () => {
  reset();
  const bad = [
    { fullName: "A", email: "alex@example.com", returnUrl: "https://demos.didit.me/igaming" },
    { fullName: "Alex", email: "not-an-email", returnUrl: "https://demos.didit.me/igaming" },
    { fullName: "Alex", email: "alex@example.com", returnUrl: "https://evil.example/elsewhere" },
    { fullName: "Alex", email: "alex@example.com", returnUrl: "javascript:alert(1)" },
  ];

  for (const body of bad) {
    const response = await ageCheck.POST(request("/api/igaming/age-check", { method: "POST", body }));

    assert.equal(response.status, 400, JSON.stringify(body));
  }
  assert.equal(calls.length, 0);

  reset({
    "POST /v3/session/": {
      status: 400,
      body: { vendor_data: "This user or business has been blocked and cannot create new verification sessions." },
    },
  });
  const blocked = await ageCheck.POST(
    request("/api/igaming/age-check", {
      method: "POST",
      body: { fullName: "Alex", email: "alex@example.com", returnUrl: "http://localhost:3000/igaming" },
    }),
  );

  assert.equal(blocked.status, 400);
  assert.match((await blocked.json()).error, /has been blocked/);
});

test("GET /sessions/{id} returns the projection only to the session's player", async () => {
  reset({ [`GET /v3/session/${SESSION}/decision/`]: { body: decision() } });
  const own = await sessions.GET(request(`/api/igaming/sessions/${SESSION}`), { params: { sessionId: SESSION } });
  const data = await own.json();

  assert.equal(own.status, 200);
  assert.equal(data.session.estimatedAge, 29);
  assert.equal(data.session.ip.countryCode, "ES");
  assert.doesNotMatch(JSON.stringify(data), /signed\/x\.jpg/);

  reset({ [`GET /v3/session/${SESSION}/decision/`]: { body: decision({ vendor_data: "someone-else" }) } });
  const foreign = await sessions.GET(request(`/api/igaming/sessions/${SESSION}`), { params: { sessionId: SESSION } });

  assert.equal(foreign.status, 404);
  assert.equal((await foreign.json()).session, undefined);

  reset();
  const malformed = await sessions.GET(request("/api/igaming/sessions/../../v3/users"), {
    params: { sessionId: "../../v3/users" },
  });

  assert.equal(malformed.status, 404);
  assert.equal(calls.length, 0, "a non-uuid id never reaches Didit");
});

test("POST /verified lists the player only after an approved ID verification", async () => {
  const listsPath = "GET /v3/lists/?page_size=200";
  const lists = { body: { results: [{ uuid: "verified-list", name: policy.LIST_NAMES.verified }] } };

  // The age check is not the ID workflow: nothing is written.
  reset({ [`GET /v3/session/${SESSION}/decision/`]: { body: decision() } });
  const wrongWorkflow = await verified.POST(request("/api/igaming/verified", { method: "POST", body: { sessionId: SESSION } }));

  assert.equal(wrongWorkflow.status, 409);
  assert.deepEqual(calls.map((call) => call.key), [`GET /v3/session/${SESSION}/decision/`]);

  // Declined ID verification: nothing is written.
  reset({
    [`GET /v3/session/${SESSION}/decision/`]: {
      body: decision({ workflow_id: policy.KYC_WORKFLOW_ID, status: "Declined" }),
    },
  });
  assert.equal((await verified.POST(request("/api/igaming/verified", { method: "POST", body: { sessionId: SESSION } }))).status, 409);

  // Approved: the player goes on the list the step-up rule skips.
  reset({
    [`GET /v3/session/${SESSION}/decision/`]: { body: decision({ workflow_id: policy.KYC_WORKFLOW_ID }) },
    [listsPath]: lists,
    "POST /v3/lists/verified-list/entries/": { status: 201, body: { uuid: "entry", value: PLAYER } },
  });
  const approved = await verified.POST(request("/api/igaming/verified", { method: "POST", body: { sessionId: SESSION } }));
  const data = await approved.json();

  assert.equal(approved.status, 200);
  assert.equal(data.verified, true);
  assert.deepEqual(calls.at(-1).body, {
    value: PLAYER,
    display_label: PLAYER,
    comment: `ID verified in session ${SESSION}`,
  });
  assert.deepEqual(
    data.didit.map((call) => `${call.method} ${call.path}`),
    [`GET /v3/session/${SESSION}/decision/`, "GET /v3/lists/?page_size=200", "POST /v3/lists/verified-list/entries/"],
  );

  // Already listed: Didit's duplicate answer counts as success, and the list
  // id is cached from the previous call.
  reset({
    [`GET /v3/session/${SESSION}/decision/`]: { body: decision({ workflow_id: policy.KYC_WORKFLOW_ID }) },
    "POST /v3/lists/verified-list/entries/": {
      status: 400,
      body: { value: ["An entry with this value already exists in this list."] },
    },
  });
  const again = await verified.POST(request("/api/igaming/verified", { method: "POST", body: { sessionId: SESSION } }));

  assert.equal(again.status, 200);
  assert.ok(!calls.some((call) => call.key === listsPath));

  // Anything that is not a session id never reaches Didit.
  reset();
  const malformed = await verified.POST(
    request("/api/igaming/verified", { method: "POST", body: { sessionId: "../users" } }),
  );

  assert.equal(malformed.status, 404);
  assert.equal(calls.length, 0);
});

test("POST /token mints a transaction token bound to this player", async () => {
  reset({
    "POST /v3/transactions/sdk-token/": {
      status: 201,
      body: { sdk_token: "sdk-tok", expires_at: "2026-10-13T22:00:00Z" },
    },
  });
  const response = await token.POST(request("/api/igaming/token", { method: "POST" }));
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].body, { vendor_data: PLAYER, ttl_seconds: 900, max_uses: 30 });
  assert.equal(calls[0].apiKey, "test-api-key");
  assert.equal(data.token, "sdk-tok");
  assert.equal(data.baseUrl, BASE);
  assert.doesNotMatch(JSON.stringify(data), /test-api-key/);
});

test("POST /self-exclusion blocks the player on Didit", async () => {
  reset({
    [`PATCH /v3/users/${PLAYER}/update-status/`]: {
      body: { vendor_data: PLAYER, didit_internal_id: "user-1", status: "BLOCKED", effective_name: "Alex Demo" },
    },
  });
  const response = await selfExclusion.POST(request("/api/igaming/self-exclusion", { method: "POST" }));
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].body, { status: "BLOCKED", reason: policy.SELF_EXCLUSION_REASON });
  assert.deepEqual(data.player, { internalId: "user-1", status: "BLOCKED", name: "Alex Demo" });
});

test("GET /operator returns Console ids and this player's Didit user", async () => {
  reset({
    "GET /v3/transactions/?limit=1": {
      body: { results: [{ organization_id: "org-1", application_id: "app-1" }] },
    },
    [`GET /v3/users/${PLAYER}/`]: {
      body: { vendor_data: PLAYER, didit_internal_id: "user-1", status: "ACTIVE", full_name: "Alex Demo" },
    },
  });
  const response = await operator.GET(request("/api/igaming/operator"));
  const data = await response.json();

  assert.deepEqual(data.console, {
    base: "https://business.staging.didit.me",
    organizationId: "org-1",
    applicationId: "app-1",
  });
  assert.equal(data.player.status, "ACTIVE");

  // The ids never change for an API key: the second read is served from cache.
  reset({ [`GET /v3/users/${PLAYER}/`]: { status: 404, body: { detail: "Not found." } } });
  const cached = await (await operator.GET(request("/api/igaming/operator"))).json();

  assert.equal(cached.console.organizationId, "org-1");
  assert.equal(cached.player, null);
  assert.deepEqual(calls.map((call) => call.key), [`GET /v3/users/${PLAYER}/`]);
});
