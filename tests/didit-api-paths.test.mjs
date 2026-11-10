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

test("GET /api/verification: the reported payloads are refused before any call", async () => {
  for (const sessionId of [...REPORTED, null, "", `${SESSION}/../../v3/users`]) {
    const { calls, env } = recorder();
    const answer = await catalogue.readCatalogueDecision(sessionId, env);

    assert.equal(answer.status, 400, String(sessionId));
    assert.equal(calls.length, 0);
  }
});

test("GET /api/verification returns only the decision of the session asked for", async () => {
  const now = Date.parse("2026-11-11T01:00:00Z");
  const decision = (overrides = {}) => ({
    session_id: SESSION,
    session_number: 7,
    status: "Approved",
    created_at: "2026-11-11T00:30:00Z",
    ...overrides,
  });

  {
    const { calls, env } = recorder(() => ({ status: 200, body: decision() }));
    const answer = await catalogue.readCatalogueDecision(SESSION, env, now);

    assert.equal(calls[0].url, `https://api.test/v3/session/${SESSION}/decision/`);
    assert.equal(answer.status, 200);
    assert.equal(answer.body.session_number, undefined);
    assert.equal(answer.body.status, "Approved");
  }
  {
    // Didit answered for a different session (or with a list): nothing passes.
    const { env } = recorder(() => ({ status: 200, body: decision({ session_id: OTHER }) }));

    assert.equal((await catalogue.readCatalogueDecision(SESSION, env, now)).status, 502);
  }
  {
    const { env } = recorder(() => ({ status: 200, body: { count: 100, results: [] } }));

    assert.equal((await catalogue.readCatalogueDecision(SESSION, env, now)).status, 502);
  }
  {
    // No readable created_at counts as expired, not as fresh.
    const { env } = recorder(() => ({ status: 200, body: decision({ created_at: undefined }) }));

    assert.equal((await catalogue.readCatalogueDecision(SESSION, env, now)).status, 410);
  }
  {
    const { env } = recorder(() => ({ status: 200, body: decision({ created_at: "2026-11-10T23:59:00Z" }) }));

    assert.equal((await catalogue.readCatalogueDecision(SESSION, env, now)).status, 410);
  }
  {
    const { env } = recorder(() => ({ status: 404, body: { detail: "Not found." } }));

    assert.equal((await catalogue.readCatalogueDecision(SESSION, env, now)).status, 404);
  }
});

test("POST /api/verification creates the session through the shared client", async () => {
  const { calls, env } = recorder(() => ({ status: 201, body: { session_id: SESSION, url: "https://verify.test/x" } }));
  const answer = await catalogue.createCatalogueSession(
    { workflow_id: OTHER, vendor_data: "v", callback: "https://demos.test/cb", portrait_image: "b64" },
    env,
  );

  assert.equal(answer.status, 200);
  assert.equal(answer.body.session_id, SESSION);
  assert.equal(calls[0].url, "https://api.test/v3/session/");
  assert.deepEqual(calls[0].body, {
    workflow_id: OTHER,
    vendor_data: "v",
    callback: "https://demos.test/cb",
    callback_method: "both",
    portrait_image: "b64",
  });

  const missing = await catalogue.createCatalogueSession({ workflow_id: OTHER }, env);

  assert.equal(missing.status, 400);

  const refused = recorder(() => ({ status: 400, body: { workflow_id: ["Invalid workflow_id."] } }));
  const error = await catalogue.createCatalogueSession(
    { workflow_id: OTHER, vendor_data: "v", callback: "https://demos.test/cb" },
    refused.env,
  );

  assert.equal(error.status, 400);
  assert.equal(error.body.error, "Invalid workflow_id.");
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
