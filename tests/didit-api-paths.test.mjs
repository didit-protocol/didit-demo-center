// Nothing a visitor sends can turn a call made with the API key into a call to
// a different Didit endpoint. Run with `npm test`.
//
// Regression for the 2026-11-11 report: GET /api/verification put `sessionId`
// straight into `/v3/session/${sessionId}/decision/`, so
// `..%2F..%2Fv3%2Fsessions%2F%3Flimit%3D100%23` read the session list (and
// users and billing) with the demo application's key.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

await import("./helpers/register.mjs");

process.env.NEXT_PUBLIC_IS_STAGING = "true";
process.env.API_KEY = "test-api-key";

const { apiPath, apiUrl, callDidit, didit, isUuid } = await import("../lib/didit/server.ts");
const catalogue = await import("../lib/didit/catalogue.ts");

const SESSION = "6f1c2a9e-4b7d-4c3e-9a10-2b5d8e7f0c11";
const OTHER = "fd4b5757-478f-426f-8cc0-787ed5ea70c6";

// The reporter's payloads, as `searchParams.get("sessionId")` hands them over.
const REPORTED = [
  "../../v3/sessions/?limit=100&offset=0#",
  "../../v3/users/#",
  "../../v3/billing/balance/#",
];

function recorder(answer = () => ({ status: 200, body: {} })) {
  const calls = [];
  const env = {
    apiBase: "https://api.test",
    apiKey: "k-123",
    fetch: async (url, init) => {
      const call = { url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined };
      const { status, body } = answer(call);

      calls.push(call);

      return new Response(JSON.stringify(body), { status });
    },
  };

  return { calls, env };
}

test("apiUrl refuses every path that would reach a different endpoint", () => {
  const refused = [
    "/v3/session/../../v3/sessions/?limit=100&offset=0#/decision/",
    "/v3/session/../../v3/billing/balance/#/decision/",
    "/v3/session/../decision/",
    "/v3/session/./decision/",
    "/v3/session/%2e%2e/decision/",
    "/v3/session/.%2E/decision/",
    "/v3/session/%2E/decision/",
    "/v3/session//decision/",
    "/v3/users/a%2Fb/",
    "/v3/users/a%5cb/",
    "/v3/users/a\\..\\b/",
    "/v3/session/x/decision/#",
    "v3/session/",
    "//evil.test/v3/session/",
  ];

  for (const path of refused) assert.equal(apiUrl("https://api.test", path), null, path);
});

test("apiUrl keeps plain paths and encoded queries as written", () => {
  for (const path of [
    `/v3/session/${SESSION}/decision/`,
    "/v3/session/",
    "/v3/transactions/?limit=1",
    "/v3/lists/?list_type=custom&limit=1000",
    "/v3/workflows/?limit=100&cursor=a%2Fb",
    "/v3/users/aurora-play-abc/",
  ]) {
    assert.equal(apiUrl("https://api.test", path), `https://api.test${path}`, path);
  }
});

test("apiPath encodes each value as one segment, and callDidit refuses dot segments", async () => {
  assert.equal(apiPath`/v3/users/${"a/b?c#d"}/`, "/v3/users/a%2Fb%3Fc%23d/");
  assert.equal(apiPath`/v3/session/${SESSION}/decision/`, `/v3/session/${SESSION}/decision/`);
  // A literal "%2e%2e" is encoded, so it stays one harmless segment.
  assert.equal(apiPath`/v3/users/${"%2e%2e"}/`, "/v3/users/%252e%252e/");

  for (const value of ["..", ".", "", "a/b"]) {
    const { calls, env } = recorder();
    const result = await callDidit("GET", apiPath`/v3/users/${value}/update-status/`, undefined, env);

    assert.equal(calls.length, 0, `no request for ${JSON.stringify(value)}`);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  }
});

test("a refused path never reaches fetch, and the API key never leaves", async () => {
  for (const sessionId of REPORTED) {
    const { calls, env } = recorder();
    const result = await didit.sessions.decision(sessionId, env);

    assert.equal(calls.length, 0, sessionId);
    assert.equal(result.status, 400);
    assert.deepEqual(result.call, { method: "GET", path: result.call.path, status: 400 });
  }
});

test("isUuid takes one UUID and nothing around it", () => {
  assert.equal(isUuid(SESSION), true);
  assert.equal(isUuid(SESSION.toUpperCase()), true);
  for (const value of [`${SESSION}/`, ` ${SESSION}`, `${SESSION}#`, "../x", "", null, 42]) {
    assert.equal(isUuid(value), false, String(value));
  }
});

test("there is no public read of a session's decision", async () => {
  const route = await import("../app/api/verification/route.ts");

  assert.equal(route.GET, undefined);
  assert.equal(typeof route.POST, "function");
  assert.equal(catalogue.readCatalogueDecision, undefined);
});

test("POST /api/verification: the server owns vendor_data and the callback origin", async () => {
  // Regression for the 2026-11-11 report: vendor_data and callback came from
  // the browser, so a caller naming another visitor's vendor_data got that
  // visitor's unfinished session token back and repointed its callback.
  const { calls, env } = recorder(() => ({ status: 201, body: { session_id: SESSION, url: "https://verify.test/x" } }));
  const answer = await catalogue.createCatalogueSession(
    {
      workflow_id: OTHER,
      vendor_data: "product-demo-3831798e90984c2684cb43ee00fe8207",
      callback: "https://attacker.example/after?x=1",
      portrait_image: "b64",
    },
    env,
    () => "fresh-id",
  );

  assert.equal(answer.status, 200);
  assert.equal(answer.body.session_id, SESSION);
  assert.equal(calls[0].url, "https://api.test/v3/session/");
  assert.deepEqual(calls[0].body, {
    workflow_id: OTHER,
    vendor_data: "demo-center-fresh-id",
    callback: "https://demos.staging.didit.me/after?x=1",
    callback_method: "both",
    portrait_image: "b64",
  });

  // Two visitors never share a session: each call gets its own vendor_data.
  const twice = recorder(() => ({ status: 201, body: {} }));

  await catalogue.createCatalogueSession({ workflow_id: OTHER, callback: "/verification/callback" }, twice.env);
  await catalogue.createCatalogueSession({ workflow_id: OTHER, callback: "/verification/callback" }, twice.env);
  assert.notEqual(twice.calls[0].body.vendor_data, twice.calls[1].body.vendor_data);
  assert.match(twice.calls[0].body.vendor_data, /^demo-center-[0-9a-f-]{36}$/);
  assert.equal(twice.calls[0].body.callback, "https://demos.staging.didit.me/verification/callback");

  for (const callback of [undefined, "", "javascript:alert(1)", "data:text/html,x"]) {
    const refused = await catalogue.createCatalogueSession({ workflow_id: OTHER, callback }, env);

    assert.equal(refused.status, 400, String(callback));
  }
  assert.equal(calls.length, 1, "refused requests never reach Didit");

  const apiRefusal = recorder(() => ({ status: 400, body: { workflow_id: ["Invalid workflow_id."] } }));
  const error = await catalogue.createCatalogueSession(
    { workflow_id: OTHER, callback: "https://demos.staging.didit.me/cb" },
    apiRefusal.env,
  );

  assert.equal(error.status, 400);
  assert.equal(error.body.error, "Invalid workflow_id.");
});

test("the CAPTCHA session is the server's: the same email never shares one", async () => {
  const { calls, env } = recorder(() => ({ status: 201, body: { session_id: SESSION, url: "https://verify.test/s" } }));
  const body = { email: "victim@example.com", vendorData: "victim@example.com", callback: "https://attacker.example/after" };

  const first = await catalogue.createCaptchaSession(body, env);
  await catalogue.createCaptchaSession(body, env);

  assert.deepEqual(first, { status: 200, body: { sessionId: SESSION, sessionUrl: "https://verify.test/s" } });
  assert.equal(calls[0].url, "https://api.test/v2/session/");
  assert.equal(calls[0].body.workflow_id, catalogue.CAPTCHA_WORKFLOW_ID);
  assert.match(calls[0].body.vendor_data, /^didit-captcha-[0-9a-f-]{36}$/);
  assert.notEqual(calls[0].body.vendor_data, calls[1].body.vendor_data);
  assert.equal(calls[0].body.callback, "https://demos.staging.didit.me/after");
  assert.deepEqual(calls[0].body.contact_details, { email: "victim@example.com", email_lang: "en" });

  const noCallback = recorder(() => ({ status: 201, body: { session_id: SESSION } }));

  await catalogue.createCaptchaSession({ email: "a@b.c" }, noCallback.env);
  assert.equal(noCallback.calls[0].body.callback, "https://demos.staging.didit.me/didit-captcha/callback");
  assert.equal((await catalogue.createCaptchaSession({ email: " " }, env)).status, 400);
});

test("siteCallback keeps the path and query on this site's origin only", () => {
  assert.equal(catalogue.siteCallback("/accs/callback?component=age"), "https://demos.staging.didit.me/accs/callback?component=age");
  assert.equal(catalogue.siteCallback("//attacker.example/x"), "https://demos.staging.didit.me/x");
  assert.equal(catalogue.siteCallback("https://attacker.example/x#frag"), "https://demos.staging.didit.me/x");
  for (const bad of [null, 42, "", "javascript:alert(1)", "mailto:a@b.c"]) {
    assert.equal(catalogue.siteCallback(bad), null, String(bad));
  }
});

test("the CAPTCHA decision read takes a session id only, and only its own decision", async () => {
  for (const sessionId of [...REPORTED, undefined, 12]) {
    const { calls, env } = recorder();

    assert.equal(await catalogue.captchaDecision(sessionId, env), null);
    assert.equal(calls.length, 0);
  }

  const own = recorder(() => ({ status: 200, body: { session_id: SESSION, status: "Approved" } }));
  const result = await catalogue.captchaDecision(SESSION, own.env);

  assert.equal(own.calls[0].url, `https://api.test/v2/session/${SESSION}/decision/`);
  assert.equal(result.ok, true);

  const other = recorder(() => ({ status: 200, body: { session_id: OTHER, status: "Approved" } }));

  assert.equal((await catalogue.captchaDecision(SESSION, other.env)).ok, false);
});

// --- The boundary, checked on the source itself ---------------------------

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(join(ROOT, path)).isDirectory()) return sourceFiles(path);

    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const SOURCES = [...sourceFiles("app"), ...sourceFiles("lib"), "middleware.ts"].map((path) => ({
  path: relative(ROOT, join(ROOT, path)),
  text: readFileSync(join(ROOT, path), "utf8"),
}));

test("only lib/didit reads the API key, and only callDidit sends it", () => {
  const readers = SOURCES.filter((file) => /process\.env\.API_KEY\b/.test(file.text)).map((file) => file.path);

  assert.deepEqual(readers, ["lib/didit/config.ts"]);

  // lib/demos.ts only shows the header inside code samples for developers.
  const senders = SOURCES.filter((file) => /["']x-api-key["']\s*:/i.test(file.text))
    .map((file) => file.path)
    .filter((path) => path !== "lib/demos.ts");

  assert.deepEqual(senders, ["lib/didit/server.ts"]);
});

test("every API path with a value in it is built with apiPath", () => {
  const raw = /\b(?:callDidit|didit|diditClient)(?:<[^>]*>)?\(\s*(?:env,\s*)?"(?:GET|POST|PATCH|DELETE)",\s*`[^`]*\$\{/g;
  const offenders = SOURCES.flatMap((file) =>
    [...file.text.matchAll(raw)].map((match) => `${file.path}: ${match[0].replace(/\s+/g, " ")}`),
  );

  assert.deepEqual(offenders, []);
});
