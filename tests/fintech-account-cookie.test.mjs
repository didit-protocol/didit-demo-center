// The fintech demo's signed account cookie. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_MAX_AGE,
  cookieKey,
  openAccount,
  sealAccount,
} from "../lib/fintech/account-cookie.ts";

const KEY = cookieKey("test-api-key");
const NOW = Date.UTC(2026, 9, 13, 21, 0, 0);
const STATE = {
  v: 1,
  id: "fintech-demo-6f0c",
  name: "Lena Fischer",
  email: "lena.fischer@example.com",
  country: "DEU",
  sid: "95b6c3a1-fca4-4006-bd90-933bd22b9ef0",
  tx: ["1d1fa3c1-6c0e-4c55-8a6f-0d3c8f5f1c10"],
  at: NOW,
};

test("a sealed account opens back to the same state", () => {
  assert.deepEqual(openAccount(sealAccount(STATE, KEY), KEY, NOW), STATE);
});

test("the cookie is signed: tampering or another key is rejected", () => {
  const token = sealAccount(STATE, KEY);
  const [payload, signature] = token.split(".");
  const forged = Buffer.from(
    JSON.stringify({ ...STATE, sid: "00000000-0000-0000-0000-000000000000" }),
  ).toString("base64url");

  assert.equal(openAccount(`${forged}.${signature}`, KEY, NOW), null);
  assert.equal(openAccount(`${payload}.${signature}x`, KEY, NOW), null);
  assert.equal(openAccount(token, cookieKey("another-key"), NOW), null);
  assert.equal(openAccount(`${token}.extra`, KEY, NOW), null);
});

test("missing, malformed and expired cookies open to nothing", () => {
  assert.equal(openAccount(undefined, KEY, NOW), null);
  assert.equal(openAccount("", KEY, NOW), null);
  assert.equal(openAccount("not-a-cookie", KEY, NOW), null);
  assert.equal(
    openAccount(sealAccount(STATE, KEY), KEY, NOW + ACCOUNT_MAX_AGE * 1000 + 1),
    null,
  );
});

test("a well-signed cookie with a bad shape is still rejected", () => {
  for (const bad of [
    { ...STATE, v: 2 },
    { ...STATE, sid: "../../admin" },
    { ...STATE, tx: ["not-a-uuid"] },
    { ...STATE, name: 42 },
  ]) {
    assert.equal(openAccount(sealAccount(bad, KEY), KEY, NOW), null);
  }
});

test("the signing key is derived, never the API key itself", () => {
  assert.equal(KEY.length, 32);
  assert.notEqual(KEY.toString("utf8"), "test-api-key");
});
