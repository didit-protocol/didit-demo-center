// The /api/crypto-exchange route handlers (Kestrel), end to end against a
// stubbed Didit API. Run with `npm test`.
//
// `fetch` is replaced by a recorder that answers each Didit endpoint with a
// response recorded on staging (tests/fixtures/crypto-exchange) or the shape
// staging returned, so these tests pin what each route sends to Didit and what
// it hands back to the browser: a forged cookie reads nothing, no money moves
// before the KYC is approved, and another user's transaction is never
// returned. Every request comes from another host, to show that nothing the
// routes send Didit is built from the request's address.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

process.env.API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_IS_STAGING = "true";

const { NextRequest } = await import("next/server");
const { ACCOUNT_COOKIE, signAccountCookie } = await import(
  "../lib/crypto-exchange/server.ts"
);
const { CX_WORKFLOWS } = await import("../lib/crypto-exchange/policy.ts");

const route = (name) => import(`../app/api/crypto-exchange/${name}/route.ts`);
const account = await route("account");
const token = await route("token");
const deposits = await route("deposits");
const transactions = await route("transactions/[id]");

const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/crypto-exchange/${name}.json`, import.meta.url)),
  );

const BASE = "https://verification.staging.didit.me";
const USER = "kestrel-0f6c2a51-3c4e-4d7b-9a1f-2b8e5d6c7a90";
const SESSION = fixture("decision-not-started").session_id;
const OWN = "0x40f0b0f45e4cda6726eaea66d113096fa5d44944";
const DECISION = `GET /v3/session/${SESSION}/decision/`;
const SUMMARY = "GET /v3/transactions/?limit=1";

let calls = [];
let answers = {};

globalThis.fetch = async (url, init = {}) => {
  const target = new URL(String(url));
  const key = `${init.method ?? "GET"} ${target.pathname}${target.search}`;

  calls.push({
    key,
    origin: target.origin,
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

function request(
  path,
  { method = "GET", body, cookie = signAccountCookie({ vendorData: USER, sessionId: SESSION }, "test-api-key") } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (cookie) headers.set("cookie", `${ACCOUNT_COOKIE}=${cookie}`);

  return new NextRequest(`https://attacker.example${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// The recorded decision of a session nobody started, as this user's.
const notStarted = () => ({ ...fixture("decision-not-started"), vendor_data: USER });
// The same session once the KYC passed (field names as docs.didit.me lists them).
const approved = () => ({
  ...notStarted(),
  status: "Approved",
  id_verifications: [{ status: "Approved", first_name: "Avery", last_name: "Quinn" }],
});

test("POST /account opens the KYC + AML session with this site's return URL and a signed cookie", async () => {
  reset({
    "POST /v3/session/": {
      status: 201,
      body: { session_id: SESSION, url: "https://verify.staging.didit.me/session/tok" },
    },
  });
  const response = await account.POST(request("/api/crypto-exchange/account", { method: "POST", cookie: null }));
  const data = await response.json();
  const [call] = calls;

  assert.equal(response.status, 201);
  assert.deepEqual(data, { sessionId: SESSION, url: "https://verify.staging.didit.me/session/tok" });
  assert.equal(call.origin, BASE);
  assert.equal(call.apiKey, "test-api-key");
  assert.equal(call.body.workflow_id, CX_WORKFLOWS.onboarding);
  assert.match(call.body.vendor_data, /^kestrel-[0-9a-f-]{36}$/);
  // Never the caller's host: a return URL the request chose would turn a
  // genuine Didit link into a redirect to any site.
  assert.equal(call.body.callback, "https://demos.staging.didit.me/crypto-exchange");

  const cookie = response.cookies.get(ACCOUNT_COOKIE);

  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(
    cookie.value,
    signAccountCookie({ vendorData: call.body.vendor_data, sessionId: SESSION }, "test-api-key"),
  );
  assert.doesNotMatch(JSON.stringify(data), /test-api-key/);
});

test("a forged or tampered cookie reads nothing and moves nothing", async () => {
  const mine = signAccountCookie({ vendorData: USER, sessionId: SESSION }, "test-api-key");
  const victim = { vendorData: "kestrel-11111111-2222-3333-4444-555555555555", sessionId: SESSION };
  const forged = {
    // The old, unsigned cookie: anyone who knew a user id could write it.
    unsigned: Buffer.from(JSON.stringify({ v: victim.vendorData, s: victim.sessionId })).toString("base64url"),
    "signed with another key": signAccountCookie(victim, "not-the-api-key"),
    // Someone else's account under this browser's own signature.
    tampered: `${signAccountCookie(victim, "test-api-key").split(".")[0]}.${mine.split(".")[1]}`,
    "no signature": `${mine.split(".")[0]}.`,
  };

  for (const [label, cookie] of Object.entries(forged)) {
    reset();
    const read = await account.GET(request("/api/crypto-exchange/account", { cookie }));
    const statuses = [
      (await token.POST(request("/api/crypto-exchange/token", { method: "POST", cookie }))).status,
      (
        await deposits.POST(
          request("/api/crypto-exchange/deposits", {
            method: "POST",
            cookie,
            body: { source: "own-wallet", amount: "1.25", ownWallet: OWN },
          }),
        )
      ).status,
      (
        await transactions.GET(request("/api/crypto-exchange/transactions/x", { cookie }), {
          params: { id: fixture("deposit-own-wallet").uuid },
        })
      ).status,
    ];

    assert.deepEqual(await read.json(), { account: null }, label);
    assert.deepEqual(statuses, [401, 401, 401], label);
    assert.equal(calls.length, 0, `${label}: no Didit call`);
  }
});

test("GET /account reads the decision and adds the Console ids from a transaction summary", async () => {
  // No transaction on the application yet: the links fall back to the Console.
  reset({ [DECISION]: { body: approved() }, [SUMMARY]: { body: { results: [] } } });
  const first = await (await account.GET(request("/api/crypto-exchange/account"))).json();

  assert.equal(first.account.console, null);
  assert.equal(first.account.stage, "approved");
  assert.equal(first.account.fullName, "Avery Quinn");
  assert.equal(first.account.userId, USER);

  reset({
    [DECISION]: { body: approved() },
    [SUMMARY]: { body: { results: [{ organization_id: "org-1", application_id: "app-1" }] } },
  });
  const second = await (await account.GET(request("/api/crypto-exchange/account"))).json();

  assert.deepEqual(second.account.console, { organizationId: "org-1", applicationId: "app-1" });
  assert.deepEqual(
    calls.map((call) => call.key),
    [DECISION, SUMMARY],
  );

  // The ids never change for an API key: later reads skip the list call.
  reset({ [DECISION]: { body: approved() } });
  const third = await (await account.GET(request("/api/crypto-exchange/account"))).json();

  assert.deepEqual(third.account.console, { organizationId: "org-1", applicationId: "app-1" });
  assert.deepEqual(
    calls.map((call) => call.key),
    [DECISION],
  );
});

test("GET /account drops a cookie whose session belongs to someone else", async () => {
  reset({ [DECISION]: { body: { ...approved(), vendor_data: "kestrel-someone-else" } } });
  const response = await account.GET(request("/api/crypto-exchange/account"));

  assert.deepEqual(await response.json(), { account: null });
  assert.equal(response.cookies.get(ACCOUNT_COOKIE).value, "");
});

test("no money moves until the onboarding KYC is approved", async () => {
  reset({ [DECISION]: { body: notStarted() } });
  const minted = await token.POST(request("/api/crypto-exchange/token", { method: "POST" }));
  const deposited = await deposits.POST(
    request("/api/crypto-exchange/deposits", {
      method: "POST",
      body: { source: "own-wallet", amount: "1.25", ownWallet: OWN },
    }),
  );

  assert.equal(minted.status, 403);
  assert.equal(deposited.status, 403);
  assert.deepEqual(
    calls.map((call) => call.key),
    [DECISION, DECISION],
  );
});

test("POST /token mints a one-use transaction token bound to this user", async () => {
  reset({
    [DECISION]: { body: approved() },
    "POST /v3/transactions/sdk-token/": {
      status: 201,
      body: { sdk_token: "sdk-tok", expires_at: "2026-10-14T09:00:00Z" },
    },
  });
  const response = await token.POST(request("/api/crypto-exchange/token", { method: "POST" }));
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(calls[1].body, { vendor_data: USER, ttl_seconds: 600, max_uses: 1 });
  assert.equal(calls[1].apiKey, "test-api-key");
  assert.deepEqual(data, { token: "sdk-tok", expiresAt: "2026-10-14T09:00:00Z", baseUrl: BASE });
});

test("POST /deposits reports the deposit for this user and returns the trimmed record", async () => {
  const recorded = fixture("deposit-own-wallet");

  reset({
    [DECISION]: { body: approved() },
    "POST /v3/transactions/": { status: 201, body: recorded },
  });
  const response = await deposits.POST(
    request("/api/crypto-exchange/deposits", {
      method: "POST",
      body: { source: "own-wallet", amount: "1.25", ownWallet: OWN },
    }),
  );
  const data = await response.json();
  const sent = calls[1].body;

  assert.equal(response.status, 201);
  assert.equal(sent.subject.externalUserId, USER);
  assert.equal(sent.counterparty.fullName, "Avery Quinn");
  assert.equal(sent.counterparty.paymentMethod.accountId, OWN);
  assert.equal(data.id, recorded.uuid);
  assert.equal(data.status, "APPROVED");
  assert.doesNotMatch(JSON.stringify(data), /ip_address|device|session_token/i);
});

test("GET /transactions/{id} returns the user's own transaction and 404s anyone else's", async () => {
  const recorded = fixture("deposit-own-wallet");
  const path = `GET /v3/transactions/${recorded.uuid}/`;
  const owner = signAccountCookie({ vendorData: recorded.vendor_data, sessionId: SESSION }, "test-api-key");

  reset({ [path]: { body: recorded } });
  const theirs = await transactions.GET(request("/api/crypto-exchange/transactions/x"), {
    params: { id: recorded.uuid },
  });

  assert.equal(theirs.status, 404);
  assert.deepEqual(await theirs.json(), { error: "Not found." });

  reset({ [path]: { body: recorded } });
  const own = await transactions.GET(request("/api/crypto-exchange/transactions/x", { cookie: owner }), {
    params: { id: recorded.uuid },
  });

  assert.equal(own.status, 200);
  assert.equal((await own.json()).id, recorded.uuid);

  reset();
  const malformed = await transactions.GET(request("/api/crypto-exchange/transactions/x", { cookie: owner }), {
    params: { id: "../users" },
  });

  assert.equal(malformed.status, 400);
  assert.equal(calls.length, 0);
});
