// Signals and the monitoring-token route on a staging build without Didit
// Authentication. Run with `npm test`.
//
// DID-8995: `lib/didit/provider.tsx` configured the events queue with the
// SDK's defaults, so a staging build posted page views and sign-ins to the
// production API, and `app/api/didit/events-token` knew only Aurora Play's
// player cookie, so Alder's own sign-up got a 401 for every event.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

process.env.API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_IS_STAGING = "true";
delete process.env.DIDIT_PUBLISHABLE_KEY;

const config = await import("../lib/didit/config.ts");
const { NextRequest } = await import("next/server");
const { CUSTOMER_COOKIE, signCustomer } = await import(
  "../lib/fintech/customer.ts"
);
const { PLAYER_COOKIE, signPlayer } = await import("../lib/igaming/player.ts");
const route = await import("../app/api/didit/events-token/route.ts");

const source = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const CUSTOMER = "alder-0123456789abcdef01234567";
const PLAYER = "aurora-play-0123456789abcdef01234567";

let calls = [];

globalThis.fetch = async (url, init = {}) => {
  calls.push({
    url: String(url),
    method: init.method,
    body: init.body ? JSON.parse(init.body) : undefined,
  });

  return Response.json(
    { monitoring_token: "mt-1", expires_at: null },
    { status: 201 },
  );
};

function tokenRequest({ demo, cookie }) {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (cookie) headers.set("cookie", cookie);

  return new NextRequest("http://localhost:3000/api/didit/events-token", {
    method: "POST",
    headers,
    body: JSON.stringify({ demo }),
  });
}

test("a staging page points the events queue at the staging API, not the SDK default", async () => {
  const signals = await import("@didit-protocol/signals");

  assert.equal(signals.DEFAULT_EVENTS_BASE_URL, "https://verification.didit.me");
  assert.equal(config.diditUrls.api, "https://verification.staging.didit.me");

  const provider = source("lib/didit/provider.tsx");
  const configured = provider.match(/configureEvents\(\{([\s\S]*?)\}\)/);

  assert.ok(configured, "lib/didit/provider.tsx no longer calls configureEvents");
  assert.match(
    configured[1],
    /baseUrl:\s*diditUrls\.api/,
    "the SDK's default baseUrl is https://verification.didit.me, so a staging build must pass the staging API",
  );
});

test("without Authentication, Aurora Play's signed cookie still mints a token", async () => {
  calls = [];
  const response = await route.POST(
    tokenRequest({
      demo: "aurora-play",
      cookie: `${PLAYER_COOKIE}=${signPlayer(PLAYER, "test-api-key")}`,
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.token, "mt-1");
  assert.equal(body.vendorData, PLAYER);
  assert.equal(
    calls[0].url,
    "https://verification.staging.didit.me/v3/events/sdk-token/",
  );
});

test("without Authentication, Alder's signed cookie mints a token too", async () => {
  calls = [];
  const response = await route.POST(
    tokenRequest({
      demo: "alder",
      cookie: `${CUSTOMER_COOKIE}=${signCustomer(CUSTOMER, "test-api-key")}`,
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.token, "mt-1");
  assert.equal(body.vendorData, CUSTOMER);
  assert.equal(calls[0].body.vendor_data, CUSTOMER);
  assert.equal(
    calls[0].url,
    "https://verification.staging.didit.me/v3/events/sdk-token/",
  );
});

test("nobody to mint for is a clean skip, never a 401 on the page", async () => {
  for (const demo of ["aurora-play", "alder", "northmarket", "kestrel"]) {
    calls = [];
    const response = await route.POST(tokenRequest({ demo }));

    assert.equal(response.status, 200, demo);
    assert.equal((await response.json()).token, null, demo);
    assert.equal(calls.length, 0, demo);
  }
});
