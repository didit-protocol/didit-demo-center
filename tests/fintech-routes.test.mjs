// The /api/fintech route handlers, end to end through Next's request and
// response objects. Run with `npm test`.
//
// `fetch` is replaced by a recorder that answers each Didit endpoint with a
// response recorded from staging (tests/fixtures/fintech), so these tests pin
// what the routes send to Didit and what they hand back, including the signed
// account cookie: written httpOnly on /api/fintech, ignored when forged.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

process.env.API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_IS_STAGING = "true";

const { NextRequest } = await import("next/server");
const { ACCOUNT_COOKIE, cookieKey, sealAccount } = await import(
  "../lib/fintech/account-cookie.ts"
);
const { ONBOARDING_WORKFLOW_ID } = await import("../lib/fintech/model.ts");

const route = (name) => import(`../app/api/fintech/${name}/route.ts`);
const account = await route("account");
const verification = await route("verification");
const payments = await route("payments");
const monitoring = await route("monitoring");

const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/fintech/${name}.json`, import.meta.url)),
  ).response;

const BASE = "https://verification.staging.didit.me";
const NOT_STARTED = fixture("decision-not-started");
const SESSION = fixture("session-create");
const DEPOSIT = fixture("transaction-deposit-approved");

let calls = [];
let answers = {};

globalThis.fetch = async (url, init = {}) => {
  const target = new URL(String(url));
  const key = `${init.method ?? "GET"} ${target.pathname}${target.search}`;

  assert.equal(target.origin, BASE);
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

const STATE = {
  v: 1,
  id: NOT_STARTED.vendor_data,
  name: "Lena Fischer",
  email: "lena.fischer@example.com",
  country: "DEU",
  sid: NOT_STARTED.session_id,
  tx: [],
  at: Date.now(),
};

const seal = (state, key = "test-api-key") => sealAccount(state, cookieKey(key));

function request(path, { method = "GET", body, cookie, locale } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const cookies = [];

  if (cookie) cookies.push(`${ACCOUNT_COOKIE}=${cookie}`);
  if (locale) cookies.push(`NEXT_LOCALE=${locale}`);
  if (cookies.length) headers.set("cookie", cookies.join("; "));

  return new NextRequest(`http://localhost:3000/api/fintech/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** The account cookie a response sets, parsed. */
function setCookie(response) {
  const header = response.headers.get("set-cookie") ?? "";
  const [pair, ...attributes] = header.split(/;\s*/);
  const [name, value] = pair.split("=");

  return {
    name,
    value,
    attributes: attributes.map((a) => a.toLowerCase()),
  };
}

test("sign-up writes a signed, httpOnly cookie scoped to the demo's routes", async () => {
  reset();
  const response = await account.POST(
    request("account", {
      method: "POST",
      body: { name: "Lena Fischer", email: "Lena.Fischer@example.com", country: "DEU" },
    }),
  );

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  const cookie = setCookie(response);

  assert.equal(cookie.name, ACCOUNT_COOKIE);
  assert.ok(cookie.attributes.includes("httponly"));
  assert.ok(cookie.attributes.includes("path=/api/fintech"));
  assert.ok(cookie.attributes.includes("samesite=lax"));
  assert.equal(calls.length, 0, "opening the account calls nobody");

  const body = await response.json();

  assert.match(body.account.id, /^fintech-demo-[0-9a-f-]{36}$/);
  assert.equal(body.account.email, "lena.fischer@example.com");

  // The same cookie reads the account back.
  const again = await account.GET(request("account", { cookie: cookie.value }));

  assert.deepEqual((await again.json()).account, body.account);
});

test("a forged or foreign cookie is no account at all", async () => {
  reset();
  const forged = `${seal(STATE).split(".")[0]}.not-the-signature`;
  const foreign = seal(STATE, "another-api-key");

  for (const cookie of [forged, foreign]) {
    const response = await account.GET(request("account", { cookie }));

    assert.deepEqual(await response.json(), { account: null });
    assert.equal(
      (await verification.GET(request("verification", { cookie }))).status,
      401,
    );
  }
  assert.equal(calls.length, 0);
});

test("the session goes back to this site's /fintech whatever the request says", async () => {
  reset({
    [`GET /v3/session/${STATE.sid}/decision/`]: { body: NOT_STARTED },
    "POST /v3/session/": { status: 201, body: SESSION },
    "GET /v3/transactions/?limit=1": {
      body: { results: [{ organization_id: "org-1", application_id: "app-1" }] },
    },
  });
  const response = await verification.POST(
    request("verification", {
      method: "POST",
      cookie: seal(STATE),
      locale: "de",
      body: { origin: "https://evil.example", callback: "https://evil.example/x" },
    }),
  );

  assert.equal(response.status, 201);
  const sent = calls.find((c) => c.key === "POST /v3/session/");

  assert.equal(sent.apiKey, "test-api-key");
  assert.equal(sent.body.callback, "https://demos.staging.didit.me/fintech");
  assert.equal(sent.body.workflow_id, ONBOARDING_WORKFLOW_ID);
  assert.equal(sent.body.vendor_data, STATE.id);
  assert.equal(sent.body.language, "de");
  assert.equal(setCookie(response).name, ACCOUNT_COOKIE);
});

test("console ids are looked up once and reused", async () => {
  reset({
    [`GET /v3/session/${STATE.sid}/decision/`]: { body: NOT_STARTED },
    "GET /v3/transactions/?limit=1": {
      body: { results: [{ organization_id: "org-1", application_id: "app-1" }] },
    },
  });
  const read = async () =>
    (await verification.GET(request("verification", { cookie: seal(STATE) }))).json();

  const first = await read();
  const second = await read();
  const expected = `https://business.staging.didit.me/console/org-1/app-1/kyc/verifications/${STATE.sid}`;

  assert.equal(first.verification.consoleUrl, expected);
  assert.equal(second.verification.consoleUrl, expected);
  // At most one lookup per server: 0 here when an earlier test cached them.
  assert.ok(
    calls.filter((c) => c.key === "GET /v3/transactions/?limit=1").length <= 1,
  );
});

test("payments re-read Didit and never leave the server's own records", async () => {
  reset({
    [`GET /v3/transactions/${DEPOSIT.uuid}/`]: { body: DEPOSIT },
  });
  const response = await payments.GET(
    request("payments", { cookie: seal({ ...STATE, tx: [DEPOSIT.uuid] }) }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(
    calls.map((c) => c.key),
    [`GET /v3/transactions/${DEPOSIT.uuid}/`],
  );
  assert.equal(body.payments[0].id, DEPOSIT.uuid);
  assert.equal(body.balances.available, Number(DEPOSIT.amount));
  assert.equal(response.headers.get("set-cookie"), null, "reads leave the cookie alone");
});

test("start over expires the cookie", async () => {
  reset();
  const response = await account.DELETE(
    request("account", { method: "DELETE", cookie: seal(STATE) }),
  );
  const cookie = setCookie(response);

  assert.equal(cookie.name, ACCOUNT_COOKIE);
  assert.equal(cookie.value, "");
  assert.ok(cookie.attributes.includes("max-age=0"));
});

test("off staging every route answers 503 and calls nobody", async () => {
  reset();
  process.env.NEXT_PUBLIC_IS_STAGING = "false";
  try {
    const cookie = seal(STATE);

    for (const response of [
      await account.GET(request("account", { cookie })),
      await verification.POST(request("verification", { method: "POST", cookie })),
      await payments.POST(
        request("payments", { method: "POST", cookie, body: { kind: "deposit", amount: 10 } }),
      ),
      await monitoring.POST(request("monitoring", { method: "POST", cookie })),
    ]) {
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error, "unavailable");
    }
    assert.equal(calls.length, 0);
  } finally {
    process.env.NEXT_PUBLIC_IS_STAGING = "true";
  }
});
