// Fintech demo domain logic (lib/fintech/model.ts). Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  CURRENCY,
  DEMO_PROPERTY,
  MAX_AMOUNT,
  ONBOARDING_WORKFLOW_ID,
  REVIEW_RULE,
  REVIEW_THRESHOLD,
  balances,
  consoleLinks,
  isSettled,
  onboardingStatus,
  parsePayment,
  parseSignUp,
  paymentStatus,
  reduceDecision,
  reduceMonitoringEstimate,
  reduceTransaction,
  sessionLanguage,
  sessionPayload,
  sortPayments,
  transactionPayload,
  triggersReview,
} from "../lib/fintech/model.ts";

const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/fintech/${name}.json`, import.meta.url)),
  );

const ACCOUNT = {
  id: "fintech-demo-6f0c",
  name: "Lena Fischer",
  email: "lena.fischer@example.com",
  country: "DEU",
};

test("sign-up accepts a clean form and normalises it", () => {
  const parsed = parseSignUp({
    name: "  Lena   Fischer ",
    email: " Lena.Fischer@Example.com ",
    country: "deu",
  });

  assert.deepEqual(parsed, {
    ok: true,
    value: {
      name: "Lena Fischer",
      email: "lena.fischer@example.com",
      country: "DEU",
    },
  });
});

test("sign-up reports every invalid field at once", () => {
  assert.deepEqual(parseSignUp({ name: "L", email: "nope", country: "XXX" }), {
    ok: false,
    errors: ["name", "email", "country"],
  });
  assert.deepEqual(parseSignUp(null), {
    ok: false,
    errors: ["name", "email", "country"],
  });
  // A name needs at least one letter: "12" is not a name.
  assert.deepEqual(
    parseSignUp({ name: "12", email: "a@b.co", country: "ESP" }).errors,
    ["name"],
  );
});

test("session statuses map onto account states", () => {
  const cases = {
    Approved: "approved",
    Declined: "declined",
    "In Review": "review",
    in_review: "review",
    Expired: "expired",
    Abandoned: "expired",
    "Kyc Expired": "expired",
    "Not Started": "not_started",
    "In Progress": "in_progress",
    Resubmitted: "in_progress",
    Something: "unknown",
    "": "unknown",
  };

  for (const [raw, expected] of Object.entries(cases)) {
    assert.equal(onboardingStatus(raw), expected, raw);
  }

  assert.equal(isSettled("approved"), true);
  assert.equal(isSettled("declined"), true);
  assert.equal(isSettled("expired"), true);
  // In review is not settled: an operator can still approve it.
  assert.equal(isSettled("review"), false);
  assert.equal(isSettled("in_progress"), false);
});

test("a fresh staging decision reduces to pending checks and nothing else", () => {
  const { response } = fixture("decision-not-started");
  const view = reduceDecision(response);

  assert.deepEqual(view, {
    sessionId: response.session_id,
    sessionNumber: response.session_number,
    rawStatus: "Not Started",
    status: "not_started",
    checks: [
      { key: "id", status: "pending" },
      { key: "liveness", status: "pending" },
      { key: "face", status: "pending" },
      { key: "aml", status: "pending" },
    ],
  });
  // Statuses only: no contact details, vendor data or links leave the server.
  assert.doesNotMatch(JSON.stringify(view), /example\.com|vendor|http/);
});

test("an AML possible match surfaces as a check in review", () => {
  const view = reduceDecision(fixture("decision-aml-in-review").response);

  assert.equal(view.status, "review");
  assert.deepEqual(
    view.checks.find((c) => c.key === "aml"),
    { key: "aml", status: "review" },
  );
  assert.equal(view.checks.find((c) => c.key === "id").status, "pending");
});

test("the last attempt of each check wins", () => {
  const view = reduceDecision({
    session_id: "s",
    status: "Approved",
    id_verifications: [{ status: "Declined" }, { status: "Approved" }],
    liveness_checks: [{ status: "Approved" }],
    face_matches: [{ status: "Approved" }],
    aml_screenings: [{ status: "Approved" }],
  });

  assert.deepEqual(
    view.checks.map((c) => c.status),
    ["passed", "passed", "passed", "passed"],
  );
});

test("the session payload pins the workflow and links the customer", () => {
  const body = sessionPayload(ACCOUNT, "https://demos.staging.didit.me/fintech", "es");

  assert.equal(body.workflow_id, ONBOARDING_WORKFLOW_ID);
  assert.equal(body.vendor_data, ACCOUNT.id);
  assert.equal(body.callback_method, "both");
  assert.deepEqual(body.contact_details, { email: ACCOUNT.email });
  assert.equal(body.language, "es");
  assert.equal("language" in sessionPayload(ACCOUNT, "x"), false);
  // The recorded request is exactly what the builder produces.
  const recorded = fixture("session-create").request;

  assert.deepEqual(
    Object.keys(recorded).sort(),
    Object.keys(sessionPayload(ACCOUNT, "x", "en")).sort(),
  );
});

test("locales map onto hosted-flow languages", () => {
  assert.equal(sessionLanguage("pt-PT"), "pt");
  assert.equal(sessionLanguage("pt-BR"), "pt-BR");
  assert.equal(sessionLanguage("zh"), "zh");
  assert.equal(sessionLanguage("sw"), undefined);
});

test("payment input: amounts, recipients and kinds", () => {
  assert.deepEqual(parsePayment({ kind: "deposit", amount: 1000 }), {
    ok: true,
    value: { kind: "deposit", amount: 1000, counterparty: null },
  });
  assert.deepEqual(
    parsePayment({ kind: "transfer", amount: "250.50", counterparty: " Marta  Ruiz " }),
    {
      ok: true,
      value: { kind: "transfer", amount: 250.5, counterparty: "Marta Ruiz" },
    },
  );

  const bad = (body) => parsePayment(body).errors;

  assert.deepEqual(bad({ kind: "deposit", amount: 0 }), ["amount"]);
  assert.deepEqual(bad({ kind: "deposit", amount: MAX_AMOUNT + 1 }), ["amount"]);
  assert.deepEqual(bad({ kind: "deposit", amount: 10.555 }), ["amount"]);
  assert.deepEqual(bad({ kind: "deposit", amount: "1e3" }), ["amount"]);
  assert.deepEqual(bad({ kind: "transfer", amount: 10 }), ["counterparty"]);
  assert.deepEqual(bad({ kind: "refund", amount: 10 }), ["kind"]);
});

test("the transaction payload matches what was posted to staging", () => {
  const recorded = fixture("transaction-transfer-held").request;
  const body = transactionPayload(
    { ...ACCOUNT, id: recorded.subject.vendor_data },
    { kind: "transfer", amount: 6000, counterparty: "Jonas Weber" },
    recorded.transaction_id,
  );

  assert.deepEqual(body, recorded);
  assert.equal(body.transaction_details.currency, CURRENCY);
  assert.deepEqual(body.custom_properties, {
    [DEMO_PROPERTY.key]: DEMO_PROPERTY.value,
  });
});

test("a deposit is inbound from the customer's own account", () => {
  const body = transactionPayload(
    ACCOUNT,
    { kind: "deposit", amount: 10000, counterparty: null },
    "t-1",
  );

  assert.equal(body.transaction_details.direction, "inbound");
  assert.equal(body.transaction_details.action_type, "deposit");
  assert.equal(body.transaction_details.amount, "10000.00");
  assert.equal(body.counterparty.full_name, ACCOUNT.name);
});

test("transaction statuses map onto what the customer sees", () => {
  assert.equal(paymentStatus("APPROVED"), "cleared");
  assert.equal(paymentStatus("IN_REVIEW"), "held");
  assert.equal(paymentStatus("DECLINED"), "declined");
  assert.equal(paymentStatus("AWAITING_USER"), "action");
});

test("a held staging transfer names the rule that held it", () => {
  const view = reduceTransaction(fixture("transaction-transfer-held").response);

  assert.equal(view.status, "held");
  assert.equal(view.rawStatus, "IN_REVIEW");
  assert.equal(view.direction, "out");
  assert.equal(view.kind, "transfer");
  assert.equal(view.amount, 6000);
  assert.equal(view.counterparty, "Jonas Weber");
  assert.equal(view.score, 40);
  assert.deepEqual(view.rules, [
    {
      title: REVIEW_RULE.title,
      actions: "score +40; change_status:IN_REVIEW",
      statusTarget: "IN_REVIEW",
    },
  ]);
});

test("cleared staging payments carry no rule hits", () => {
  const deposit = reduceTransaction(
    fixture("transaction-deposit-approved").response,
  );
  const transfer = reduceTransaction(
    fixture("transaction-transfer-approved").response,
  );

  assert.equal(deposit.status, "cleared");
  assert.equal(deposit.kind, "deposit");
  assert.equal(deposit.direction, "in");
  assert.deepEqual(deposit.rules, []);
  assert.equal(transfer.status, "cleared");
  assert.equal(transfer.counterparty, "Marta Ruiz");
});

test("a rule in TEST mode is not reported as having held anything", () => {
  const view = reduceTransaction(
    fixture("transaction-transfer-test-mode").response,
  );

  assert.equal(view.status, "cleared");
  assert.deepEqual(view.rules, []);
});

test("balances: cleared money in, everything out but declined, held tracked", () => {
  const p = (direction, amount, status) => ({ direction, amount, status });

  assert.deepEqual(
    balances([
      p("in", 10000, "cleared"),
      p("in", 500, "held"),
      p("out", 250, "cleared"),
      p("out", 6000, "held"),
      p("out", 900, "declined"),
    ]),
    { available: 3750, held: 6000 },
  );
  assert.deepEqual(balances([]), { available: 0, held: 0 });
  assert.deepEqual(balances([p("in", 0.1, "cleared"), p("in", 0.2, "cleared")]), {
    available: 0.3,
    held: 0,
  });
});

test("the recorded staging account adds up", () => {
  const payments = [
    "transaction-deposit-approved",
    "transaction-transfer-approved",
    "transaction-transfer-held",
  ].map((name) => reduceTransaction(fixture(name).response));

  assert.deepEqual(balances(payments), { available: 3750, held: 6000 });
  assert.deepEqual(
    sortPayments(payments).map((p) => p.amount),
    [6000, 250, 10000],
  );
});

test("only outbound transfers at the threshold go to review", () => {
  assert.equal(
    triggersReview({ kind: "transfer", amount: REVIEW_THRESHOLD, counterparty: "x" }),
    true,
  );
  assert.equal(
    triggersReview({ kind: "transfer", amount: REVIEW_THRESHOLD - 0.01, counterparty: "x" }),
    false,
  );
  assert.equal(
    triggersReview({ kind: "deposit", amount: 20000, counterparty: null }),
    false,
  );
});

test("the review rule only matches this demo's EUR transfers", () => {
  assert.equal(REVIEW_RULE.scope.directions[0], "OUTBOUND");
  assert.deepEqual(
    REVIEW_RULE.conditions.map((c) => [c.field, c.operator, c.value]),
    [
      ["currency", "eq", "EUR"],
      ["amount", "gte", REVIEW_THRESHOLD],
      ["custom_values.demo_app", "eq", "fintech"],
    ],
  );
  assert.ok(
    REVIEW_RULE.actions.some(
      (a) => a.type === "change_status" && a.value === "IN_REVIEW",
    ),
  );
});

test("the monitoring estimate reduces the real staging answer", () => {
  assert.deepEqual(
    reduceMonitoringEstimate(fixture("aml-monitoring-estimate").response),
    {
      profiles: 1,
      alreadyMonitored: 0,
      withScreening: 0,
      needsScreening: 0,
      missingIdentity: 1,
      screeningCostUsd: 0,
      annualCostUsd: 0,
    },
  );
  assert.equal(fixture("aml-monitoring-estimate").request.estimate_only, true);
});

test("console links need both ids, and fall back to the console home", () => {
  const linked = consoleLinks({
    origin: "https://business.staging.didit.me",
    orgId: "org-1",
    appId: "app 2",
  });

  assert.equal(
    linked.session("s-1"),
    "https://business.staging.didit.me/console/org-1/app%202/kyc/verifications/s-1",
  );
  assert.equal(
    linked.transaction("t-1"),
    "https://business.staging.didit.me/console/org-1/app%202/transactions/detail/t-1",
  );

  const bare = consoleLinks({
    origin: "https://business.staging.didit.me",
    orgId: "org-1",
    appId: null,
  });

  assert.equal(bare.session("s-1"), null);
  assert.equal(bare.transaction("t-1"), null);
  assert.equal(bare.home, "https://business.staging.didit.me/console");
});
