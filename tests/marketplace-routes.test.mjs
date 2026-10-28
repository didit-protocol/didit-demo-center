// The glue between Next's route handlers and the marketplace server
// (lib/marketplace/route.ts), and the browser's calls to those routes
// (lib/marketplace/client.ts).
import test from "node:test";
import assert from "node:assert/strict";

await import("./helpers/register.mjs");

const { NextRequest } = await import("next/server");
const { readState, respond } = await import("../lib/marketplace/route.ts");
const { api, API_TIMEOUT_MS } = await import("../lib/marketplace/client.ts");
const { sealState, stateKey } = await import("../lib/marketplace/state.ts");
const { TEST_KEY, makeEnv, seller, stateWith } = await import(
  "./marketplace-helpers.mjs"
);

const env = makeEnv();
const state = stateWith({ sellers: [seller("mkt-seller-9e7b751f882f")] });
const request = (url, headers = {}) => new NextRequest(url, { headers });

test("on https the state is a __Host- cookie: Secure, HttpOnly, Lax, Path=/", () => {
  const response = respond(
    request("https://demos.staging.didit.me/api/marketplace"),
    env,
    { status: 200, body: {}, state },
  );
  const cookie = response.headers.get("set-cookie");

  assert.match(cookie, /^__Host-northmarket_state=/);
  assert.match(cookie, /; Path=\/(;|$)/);
  assert.match(cookie, /; Secure/i);
  assert.match(cookie, /; HttpOnly/i);
  assert.match(cookie, /; SameSite=lax/i);
  assert.doesNotMatch(cookie, /Domain=/i);
});

test("behind an https proxy the cookie is the __Host- one too", () => {
  const response = respond(
    request("http://internal:3000/api/marketplace", {
      "x-forwarded-proto": "https",
    }),
    env,
    { status: 200, body: {}, state },
  );

  assert.match(response.headers.get("set-cookie"), /^__Host-northmarket_state=.*; Secure/i);
});

test("a plain-http dev server keeps the bare name, which it can set", () => {
  const response = respond(
    request("http://localhost:3000/api/marketplace"),
    env,
    { status: 200, body: {}, state },
  );
  const cookie = response.headers.get("set-cookie");

  assert.match(cookie, /^northmarket_state=/);
  assert.doesNotMatch(cookie, /Secure/i);
});

test("the state is read back from the cookie the scheme writes, and only a signed one", () => {
  // Written now: a state older than a week is expired.
  const sealed = sealState({ ...state, at: Date.now() }, stateKey(TEST_KEY));

  assert.deepEqual(
    readState(
      request("https://demos.staging.didit.me/api/marketplace", {
        cookie: `__Host-northmarket_state=${sealed}`,
      }),
      env,
    )?.sellers,
    state.sellers,
  );
  // Over https a bare-named cookie (one a subdomain could plant) is ignored.
  assert.equal(
    readState(
      request("https://demos.staging.didit.me/api/marketplace", {
        cookie: `northmarket_state=${sealed}`,
      }),
      env,
    ),
    null,
  );
});

test("clearing the state expires the same cookie", () => {
  const response = respond(
    request("https://demos.staging.didit.me/api/marketplace"),
    env,
    { status: 200, body: {}, state: null },
  );

  assert.match(response.headers.get("set-cookie"), /^__Host-northmarket_state=;.*Max-Age=0/i);
});

test("a browser call that never answers ends with a timeout the page can show", async (t) => {
  const seen = [];

  t.mock.method(globalThis, "fetch", async (_url, init) => {
    seen.push(init.signal);
    throw new DOMException("The operation timed out.", "TimeoutError");
  });

  const result = await api("/sellers", { method: "POST", body: { shop: "Atelier" } });

  assert.ok(seen[0] instanceof AbortSignal);
  assert.ok(API_TIMEOUT_MS > 20_000, "longer than one Didit call");
  assert.deepEqual(result, {
    ok: false,
    status: 0,
    error: "The demo's server took too long to answer. Try again.",
  });
});

test("a route's own error reaches the page as its sentence and code", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "Sign in to Northmarket first.", code: "signed_out" }, { status: 401 }),
  );

  assert.deepEqual(await api("/token", { method: "POST", body: {} }), {
    ok: false,
    status: 401,
    error: "Sign in to Northmarket first.",
    code: "signed_out",
  });
});
