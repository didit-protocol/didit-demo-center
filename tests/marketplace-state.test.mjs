// The marketplace's signed browser state (lib/marketplace/state.ts).
import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_TRANSACTIONS,
  STATE_MAX_AGE,
  openState,
  ownedVendors,
  sealState,
  stateKey,
  vendorId,
  withSeller,
  withTransaction,
} from "../lib/marketplace/state.ts";

import { RECORDED, seller, stateWith } from "./marketplace-helpers.mjs";

const key = stateKey("test-api-key-not-a-real-one");
const now = Date.UTC(2026, 9, 13, 22, 0, 0);

const sample = () =>
  stateWith({
    buyer: RECORDED.buyer,
    sellers: [seller(RECORDED.firstShop, { signup: RECORDED.signupApproved })],
    tx: [RECORDED.signupApproved],
  });

test("a sealed state opens back to the same value", () => {
  const state = sample();

  assert.deepEqual(openState(sealState(state, key), key, now), state);
});

test("a tampered, re-signed or foreign cookie is rejected", () => {
  const sealed = sealState(sample(), key);
  const [payload, signature] = sealed.split(".");

  // Swap in another visitor's transaction without re-signing.
  const forged = Buffer.from(
    JSON.stringify({ ...sample(), tx: [RECORDED.signupHeld] }),
  ).toString("base64url");

  assert.equal(openState(`${forged}.${signature}`, key, now), null);
  // Signed with a different key (another environment's API key).
  assert.equal(openState(sealed, stateKey("another-key"), now), null);
  assert.equal(openState(`${payload}.${signature}.extra`, key, now), null);
  assert.equal(openState("not-a-cookie", key, now), null);
  assert.equal(openState(undefined, key, now), null);
});

test("a validly signed but malformed state is still rejected", () => {
  const bad = [
    { ...sample(), sellers: [{ ...seller("someone-else") }] },
    { ...sample(), tx: ["not-a-uuid"] },
    { ...sample(), buyer: "mkt-buyer-UPPERCASE00" },
    { ...sample(), v: 2 },
  ];

  for (const state of bad) {
    assert.equal(openState(sealState(state, key), key, now), null);
  }
});

test("state expires after a week", () => {
  const sealed = sealState(sample(), key);
  const created = sample().at;

  assert.ok(openState(sealed, key, created + (STATE_MAX_AGE - 60) * 1000));
  assert.equal(openState(sealed, key, created + (STATE_MAX_AGE + 60) * 1000), null);
});

test("owned vendors are the buyer and every shop, nothing else", () => {
  const state = {
    ...sample(),
    sellers: [seller(RECORDED.firstShop), seller(RECORDED.secondShop)],
  };

  assert.deepEqual(ownedVendors(state), [
    RECORDED.buyer,
    RECORDED.firstShop,
    RECORDED.secondShop,
  ]);
  assert.deepEqual(ownedVendors(stateWith()), []);
});

test("transactions are remembered once and the oldest fall off", () => {
  let state = stateWith();

  state = withTransaction(state, RECORDED.signupApproved);
  state = withTransaction(state, RECORDED.signupApproved);
  assert.deepEqual(state.tx, [RECORDED.signupApproved]);

  for (let i = 0; i < MAX_TRANSACTIONS + 3; i += 1) {
    state = withTransaction(
      state,
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
  }
  assert.equal(state.tx.length, MAX_TRANSACTIONS);
  assert.ok(!state.tx.includes(RECORDED.signupApproved));
});

test("withSeller patches one shop only", () => {
  const state = stateWith({
    sellers: [seller(RECORDED.firstShop), seller(RECORDED.secondShop)],
  });
  const next = withSeller(state, RECORDED.secondShop, {
    signup: RECORDED.signupHeld,
  });

  assert.equal(next.sellers[0].signup, null);
  assert.equal(next.sellers[1].signup, RECORDED.signupHeld);
});

test("vendor ids are short, lowercase and typed", () => {
  const id = vendorId("seller", "9E7B751F-882F-4c0d-8e1a-0b2c3d4e5f60");

  assert.equal(id, "mkt-seller-9e7b751f882f");
  assert.match(vendorId("buyer", crypto.randomUUID()), /^mkt-buyer-[a-f0-9]{12}$/);
});
