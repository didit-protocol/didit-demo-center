// What Northmarket (/marketplace) shows in the Didit live layer and the
// console view, built from Didit's recorded staging answers
// (tests/fixtures/marketplace). Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

import { fixture } from "./marketplace-helpers.mjs";

await import("./helpers/register.mjs");

const { summarizeKyb, summarizeTransaction } = await import("../lib/marketplace/summaries.ts");
const events = await import("../lib/marketplace/live-events.ts");
const { keyPeople, northmarketConsole } = await import("../lib/marketplace/console-pages.ts");
const { ORDER_LISTING, ORDER_TOTAL, eur } = await import("../lib/marketplace/northmarket.ts");
const { purchaseTransaction } = await import("../lib/marketplace/payloads.ts");

const tx = (name) => summarizeTransaction(fixture(`transaction-${name}`));
const kyb = (status) => summarizeKyb({ ...fixture("kyb-decision-docs-example"), status });

test("the order is the 1,497 EUR checkout: item, insured shipping and buyer protection", () => {
  assert.equal(ORDER_TOTAL, 1497);
  const payload = purchaseTransaction(
    { token: "t", expiresAt: null, baseUrl: "b", subject: { vendorData: "northmarket-user_1-buyer", name: "Northmarket buyer", type: "individual" } },
    ORDER_LISTING,
    { id: "northmarket-user_1", shop: "Ruiz Vintage" },
    "3f2a9c1e-7b4d-4e8f-9a0b-1c2d3e4f5a6b",
  );

  assert.equal(payload.details.amount, 1497);
  assert.equal(payload.details.actionType, "purchase");
  assert.equal(payload.counterparty.externalUserId, "northmarket-user_1");
  assert.equal(eur(1497), "1,497 EUR");
  assert.equal(eur(1450, true), "1,450.00 EUR");
});

test("a held order: the rule that hit, then on hold for the buyer's age check", () => {
  const [rule, held] = events.transactionEvents(tx("order-awaiting-user"), { shop: "Ruiz Vintage", previous: null });

  assert.equal(rule.tone, "txn");
  assert.equal(rule.title, "Rule hit: orders of 1,000 EUR or more");
  assert.equal(held.tone, "hold");
  assert.equal(held.title, "Order held for an age check");
  assert.equal(held.detail, "2,900 EUR · orders of 1,000 EUR or more wait");
  assert.match(held.code, /action_required/);
});

test("an approved order: paid, with its risk score", () => {
  const [paid] = events.transactionEvents(tx("order-approved"), { shop: "Ruiz Vintage", previous: null });

  assert.equal(paid.tone, "txn");
  assert.equal(paid.title, "Order paid");
  assert.equal(paid.detail, "180 EUR · Ruiz Vintage · risk 0 of 100");
});

test("a second shop on the same device: signals links it, payouts are paused", () => {
  const inputs = events.transactionEvents(tx("signup-held"), {
    shop: "Ruiz Vintage Outlet",
    previous: "Ruiz Vintage",
  });

  assert.deepEqual(
    inputs.map((input) => [input.tone, input.title]),
    [
      ["sig", "Device runs another shop"],
      ["stop", "Payouts paused"],
    ],
  );
  assert.equal(inputs[0].detail, "Same device as Ruiz Vintage");
  assert.match(inputs[1].code, /seller_signup.*IN_REVIEW/);

  const [first] = events.transactionEvents(tx("signup-approved"), { shop: "Ruiz Vintage", previous: null });

  assert.equal(first.title, "Seller sign-up checked");
});

test("the KYB in the feed: owners next, then approved with the owners verified", () => {
  const [waiting] = events.kybDecided(kyb("Awaiting User"), "Ruiz Vintage");

  assert.equal(waiting.tone, "hold");
  assert.equal(waiting.title, "Business found, owners next");
  assert.equal(waiting.detail, "Acme Corporation Limited · 1 owner checks their ID");

  const approved = kyb("Approved");

  approved.people = approved.people.map((person) => ({ ...person, kycStatus: "Approved" }));
  const [done] = events.kybDecided(approved, "Ruiz Vintage");

  assert.equal(done.tone, "ver");
  assert.equal(done.title, "Business approved");
  assert.equal(done.detail, "Acme Corporation Limited · 1 owner verified");
  assert.equal(events.ruleName("Marketplace demo: second shop on one device"), "Second shop on one device");
});

test("the console view's Business page: registry, key people and the linked shop", () => {
  const summary = kyb("Approved");
  const tabs = northmarketConsole({
    shops: [
      { id: "northmarket-user_1", shop: "Ruiz Vintage", company: "Ruiz Vintage", kyb: summary },
      { id: "northmarket-user_2", shop: "Ruiz Vintage Outlet", company: "Ruiz Vintage Outlet", kyb: null },
    ],
    transactions: [tx("signup-held"), tx("order-awaiting-user")],
    events: [],
    email: "marta@ruizvintage.example",
    device: { persistentId: "pid-0123456789abcdef", botScore: 0.04, browser: "Chrome", os: "macOS" },
    signIn: "Passkey",
    now: Date.UTC(2026, 9, 27),
  });

  assert.deepEqual(
    tabs.map((tab) => tab.id),
    ["business", "transaction", "verification", "device"],
  );
  const page = tabs[0].page;

  assert.equal(page.kind, "business");
  assert.equal(page.head.title, "Acme Corporation Limited");
  assert.deepEqual(page.head.tag, { label: "Approved", tone: "ok" });
  assert.deepEqual(
    page.kpis.map((kpi) => [kpi.label, kpi.value]),
    [
      ["Key people", "0 of 1"],
      ["Registry", "Active"],
      ["Documents", "1"],
      ["Linked shops", "1"],
    ],
  );
  const people = page.blocks.find((block) => block.kind === "people");

  assert.deepEqual(people.rows[0], {
    name: "Alice Chen",
    role: "CEO · 35% owner",
    // Their own ID check is open: in progress, never "Not started".
    status: { label: "In progress", tone: "rev" },
  });
  assert.equal(page.linked[0].title, "Ruiz Vintage Outlet");
  assert.equal(page.linked[0].detail, "Same device · payouts paused");
  assert.ok(page.side.pairs.some(([key, value]) => key === "Sign-in" && value === "Passkey · 1 device"));

  // The order page picks the held order and says what it waits for.
  const order = tabs[1].page;

  assert.equal(order.head.title, "2,900.00 EUR");
  assert.equal(order.blocks[0].kind, "note");
  // Words, never Didit's raw session status.
  assert.equal(
    order.blocks[0].text,
    "Waiting for the buyer's age check. The order goes through once it is approved.",
  );
  assert.doesNotMatch(JSON.stringify(order), /Not Started|Not started/);
  assert.equal(order.blocks[1].rows[0].title, "Orders of 1,000 EUR or more");
});

test("before any shop, every console tab says what to do instead of inventing a record", () => {
  const tabs = northmarketConsole({
    shops: [],
    transactions: [],
    events: [],
    email: null,
    device: null,
    signIn: null,
    now: 0,
  });

  for (const tab of tabs) {
    assert.equal(tab.page, null, tab.id);
    assert.ok(tab.empty, tab.id);
  }
  assert.deepEqual(keyPeople({ ...kyb("Approved"), people: [] }), []);
});

test("an open KYB reads as in progress with its start time on the Business and Verification pages", () => {
  const consoleInput = (summary) => ({
    shops: [{ id: "northmarket-user_1", shop: "Ruiz Vintage", company: "Ruiz Vintage", kyb: summary }],
    transactions: [],
    events: [],
    email: null,
    device: null,
    signIn: null,
    now: Date.UTC(2026, 9, 27),
  });

  for (const status of ["Not Started", "In Progress"]) {
    const summary = kyb(status);
    // Didit fills each step only as the session reaches it.
    summary.steps = [
      { key: "registry", status: "Approved" },
      { key: "people", status: "Not Started" },
      { key: "aml", status: "" },
    ];
    const tabs = northmarketConsole(consoleInput(summary));
    const business = tabs.find((tab) => tab.id === "business").page;
    const verification = tabs.find((tab) => tab.id === "verification").page;

    assert.deepEqual(business.head.tag, { label: "In progress", tone: "rev" }, status);
    assert.ok(business.head.meta.some((item) => /^KYB started /.test(item)), status);
    // A session exists: the page, never the "No verification yet" empty state.
    assert.ok(verification, status);
    assert.deepEqual(verification.head.tag, { label: "In progress", tone: "rev" });
    assert.deepEqual(verification.side.tag, { label: "In progress", tone: "rev" });
    assert.ok(verification.head.meta.some((item) => /^Started /.test(item)), status);
    const checks = verification.blocks.find((block) => block.kind === "checks").checks;

    for (const check of checks) {
      assert.equal(check.value, "In progress", `${status} ${check.label}`);
      assert.notEqual(check.ok, true, `${status} ${check.label}`);
    }
    assert.doesNotMatch(JSON.stringify([business, verification]), /Not started/i);
  }

  // Once Didit decides, the steps read as they are.
  const approved = kyb("Approved");

  approved.steps = [{ key: "registry", status: "Approved" }];
  const decided = northmarketConsole(consoleInput(approved)).find((tab) => tab.id === "verification").page;

  assert.deepEqual(decided.blocks[0].checks[0], { label: "Company registry", value: "Approved", ok: true });
  assert.equal(decided.head.meta[1], "Registry, owners, documents");
});
