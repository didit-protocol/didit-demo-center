// What the marketplace submits and installs: web SDK payloads, the KYB
// workflow and the rules (lib/marketplace/payloads.ts, setup.ts), plus the
// status copy, the console links and the "How this uses Didit" content.
import test from "node:test";
import assert from "node:assert/strict";

import { HIGH_VALUE_THRESHOLD, LISTINGS, SELLER_COUNTRIES, getListing } from "../lib/marketplace/catalog.ts";
import { consoleLink } from "../lib/marketplace/console-links.ts";
import { GUIDE, getChapter, isChapterId } from "../lib/marketplace/guide.ts";
import {
  parsePayoutAmount,
  payoutTransaction,
  purchaseTransaction,
  signupTransaction,
  transactionId,
} from "../lib/marketplace/payloads.ts";
import {
  ACTIONS,
  DEMO_APP,
  kybWorkflowDefinition,
  ruleDefinitions,
} from "../lib/marketplace/setup.ts";
import {
  kybDecidable,
  kybStatus,
  payoutsUnlocked,
  personStatus,
  transactionStatus,
} from "../lib/marketplace/status.ts";

const grant = (type, name) => ({
  token: "t",
  expiresAt: null,
  baseUrl: "https://verification.staging.didit.me",
  subject: { vendorData: "mkt-seller-0123456789ab", name, type },
});
const RANDOM = "3f2a9c1e-7b4d-4e8f-9a0b-1c2d3e4f5a6b";

test("every payload is tagged for this demo and typed for its rule", () => {
  const signup = signupTransaction(grant("company", "Acme"), "Atelier Nord", RANDOM);
  const order = purchaseTransaction(
    grant("individual", "Northmarket buyer"),
    getListing("dive-watch"),
    { id: "mkt-seller-0123456789ab", shop: "Atelier Nord" },
    RANDOM,
  );
  const payout = payoutTransaction(grant("company", "Acme"), 480, RANDOM);

  for (const payload of [signup, order, payout]) {
    assert.equal(payload.customProperties.demo_app, DEMO_APP);
    assert.equal(payload.details.currency, "EUR");
    assert.ok(payload.txnId.length <= 128);
    // The subject's vendor_data is the token's, never sent from the browser.
    assert.equal(payload.subject.externalUserId, undefined);
  }

  assert.equal(signup.category, "user_event");
  assert.equal(signup.details.actionType, ACTIONS.signup);
  assert.equal(signup.details.amount, 0);
  assert.equal(order.category, "finance");
  assert.equal(order.details.direction, "in");
  assert.equal(order.details.actionType, ACTIONS.purchase);
  assert.equal(order.details.amount, 2900);
  assert.equal(order.customProperties.listing, "dive-watch");
  assert.deepEqual(order.counterparty, {
    type: "company",
    externalUserId: "mkt-seller-0123456789ab",
    fullName: "Atelier Nord",
  });
  assert.equal(payout.details.direction, "out");
  assert.equal(payout.details.actionType, ACTIONS.payout);
  assert.equal(payout.subject.type, "company");
});

test("an order without a shop has no counterparty", () => {
  const order = purchaseTransaction(grant("individual", "b"), LISTINGS[0], null, RANDOM);

  assert.equal(order.counterparty, undefined);
});

test("transaction ids are unique per call and readable", () => {
  assert.equal(transactionId("order", RANDOM), "mkt-order-3f2a9c1e7b4d4e8f9a0b");
  assert.notEqual(
    transactionId("order", crypto.randomUUID()),
    transactionId("order", crypto.randomUUID()),
  );
});

test("payout amounts are bounded and rounded to cents", () => {
  assert.equal(parsePayoutAmount("480"), 480);
  assert.equal(parsePayoutAmount("€ 1,250.555"), 1250.56);
  assert.equal(parsePayoutAmount("5"), null);
  assert.equal(parsePayoutAmount("25000"), null);
  assert.equal(parsePayoutAmount("abc"), null);
});

test("the KYB workflow verifies the company, its people, documents and AML", () => {
  const definition = kybWorkflowDefinition(
    SELLER_COUNTRIES.map((country) => country.code),
    "2db28cd2-7713-405f-89ad-144613b7086e",
  );
  const features = definition.features.map((feature) => feature.feature);

  assert.deepEqual(features, ["KYB_REGISTRY", "KYB_KEY_PEOPLE", "KYB_DOCUMENTS", "AML"]);
  assert.equal(definition.status, "published");

  const registry = definition.features[0].config.kyb_registry_countries_config;

  assert.deepEqual(Object.keys(registry), SELLER_COUNTRIES.map((c) => c.code));
  assert.ok(Object.values(registry).every((c) => c.enabled && c.tier === "ubo"));

  const people = definition.features[1].config;

  // Required KYC needs a workflow named for it, or the API refuses the save.
  assert.equal(people.kyb_require_officer_kyc, true);
  assert.equal(people.kyb_officer_verification_workflow, "2db28cd2-7713-405f-89ad-144613b7086e");
  assert.equal(people.kyb_require_ubo_kyc, true);
  assert.equal(people.kyb_ubo_verification_workflow, "2db28cd2-7713-405f-89ad-144613b7086e");
  assert.deepEqual(definition.features[2].config.kyb_required_document_groups, ["LEGAL_PRESENCE"]);
});

test("every rule only ever matches this demo's own transactions", () => {
  const rules = ruleDefinitions("8482aee5-38b8-46fd-914b-e1bc6edcadca");

  assert.equal(rules.length, 3);
  for (const rule of rules) {
    assert.ok(
      rule.conditions.some(
        (c) => c.field === "custom_values.demo_app" && c.operator === "eq" && c.value === DEMO_APP,
      ),
      rule.title,
    );
    assert.equal(rule.evaluation_mode, "ALL");
  }
});

test("the high-value rule asks the buyer for the age check", () => {
  const [highValue] = ruleDefinitions("8482aee5-38b8-46fd-914b-e1bc6edcadca");

  assert.deepEqual(highValue.scope.action_types, [ACTIONS.purchase]);
  assert.ok(
    highValue.conditions.some(
      (c) => c.field === "amount" && c.operator === "gte" && c.value === HIGH_VALUE_THRESHOLD,
    ),
  );
  assert.deepEqual(highValue.actions[0], {
    type: "change_status",
    value: "AWAITING_USER",
    workflow_id: "8482aee5-38b8-46fd-914b-e1bc6edcadca",
  });
});

test("the device rules count shops that signed up from the same device", () => {
  const [, signup, payout] = ruleDefinitions("age");

  for (const rule of [signup, payout]) {
    assert.deepEqual(rule.aggregation, [
      {
        metric: "distinct_count",
        field: "subject_vendor_data",
        operator: "gte",
        // The window includes the transaction being evaluated: two shops.
        value: 2,
        window: "30d",
        filters: {
          action_type: ACTIONS.signup,
          subject_device_fingerprint: "__current__",
        },
      },
    ]);
    assert.ok(rule.actions.some((a) => a.type === "change_status" && a.value === "IN_REVIEW"));
  }
  assert.deepEqual(signup.scope, { action_types: [ACTIONS.signup] });
  assert.deepEqual(payout.scope, { directions: ["OUTBOUND"], action_types: [ACTIONS.payout] });
});

test("status copy never calls an undecided record approved", () => {
  assert.equal(kybStatus(null).label, "Not started");
  assert.equal(kybStatus("Approved").tone, "approved");
  assert.equal(kybStatus("Awaiting User").label, "Waiting on key people");
  assert.equal(kybStatus("In Review").tone, "review");
  assert.equal(kybStatus("Declined").tone, "declined");
  assert.equal(kybStatus("Kyc Expired").tone, "declined");
  assert.deepEqual(
    { tone: kybStatus("Something New").tone, label: kybStatus("Something New").label },
    { tone: "neutral", label: "Something New" },
  );

  assert.equal(transactionStatus("APPROVED").label, "Approved");
  assert.equal(transactionStatus("IN_REVIEW").label, "Held for review");
  assert.equal(transactionStatus("AWAITING_USER").label, "Waiting on the customer");
  assert.equal(transactionStatus("DECLINED").tone, "declined");
  assert.equal(transactionStatus(null).label, "Not submitted");

  assert.equal(personStatus("Not Started").label, "Not started");
  assert.equal(personStatus("Approved", true).label, "Skipped");
  assert.equal(personStatus(null).label, "No ID check");
});

test("payouts unlock on Approved only; analysts decide In Review only", () => {
  for (const status of [null, "Not Started", "In Progress", "Awaiting User", "In Review", "Declined"]) {
    assert.equal(payoutsUnlocked(status), false, String(status));
  }
  assert.equal(payoutsUnlocked("Approved"), true);
  assert.equal(kybDecidable("In Review"), true);
  for (const status of ["Awaiting User", "Approved", "Not Started", null]) {
    assert.equal(kybDecidable(status), false, String(status));
  }
});

test("console links land on the record, or honestly on the console home", () => {
  const target = { origin: "https://business.staging.didit.me/", orgId: "org", appId: "app" };

  assert.deepEqual(consoleLink(target, { kind: "transaction", id: "t 1" }), {
    href: "https://business.staging.didit.me/console/org/app/transactions/detail/t%201",
    direct: true,
  });
  assert.equal(
    consoleLink(target, { kind: "kyb", id: "s" }).href,
    "https://business.staging.didit.me/console/org/app/kyb/verifications/s",
  );
  assert.equal(
    consoleLink(target, { kind: "network", id: "n" }).href,
    "https://business.staging.didit.me/console/org/app/networks/n",
  );
  assert.deepEqual(consoleLink({ ...target, appId: null }, { kind: "transactions" }), {
    href: "https://business.staging.didit.me/",
    direct: false,
  });
});

test("every chapter documents its modules and calls, each linked to the docs", () => {
  assert.deepEqual(
    GUIDE.map((chapter) => chapter.id),
    ["seller", "buyer", "payouts", "fraud", "operator"],
  );
  for (const chapter of GUIDE) {
    assert.ok(chapter.modules.length > 0, chapter.id);
    assert.ok(chapter.calls.length > 0, chapter.id);
    for (const call of chapter.calls) {
      assert.match(call.docsPath, /^[a-z0-9-]+(\/[a-z0-9-]+)+$/, call.call);
    }
  }
  assert.equal(getChapter("nope").id, "seller");
  assert.equal(isChapterId("fraud"), true);
  assert.equal(isChapterId("admin"), false);
});

test("no copy uses an em dash", async () => {
  const fs = await import("node:fs");
  const files = [
    "lib/marketplace/catalog.ts",
    "lib/marketplace/guide.ts",
    "lib/marketplace/status.ts",
    "lib/marketplace/server.ts",
    "components/marketplace/seller-chapter.tsx",
    "components/marketplace/buyer-chapter.tsx",
    "components/marketplace/payouts-chapter.tsx",
    "components/marketplace/fraud-chapter.tsx",
    "components/marketplace/operator-chapter.tsx",
    "components/marketplace/marketplace-demo.tsx",
  ];

  for (const file of files) {
    assert.ok(!fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8").includes("—"), file);
  }
});
