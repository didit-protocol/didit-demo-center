// Alder (/fintech): what the bank sends to Didit, the rules it installs, the
// live layer's lines and the console view's pages. Run with `npm test`.
//
// Transactions are the real staging answers in tests/fixtures/alder, recorded
// against the rules `npm run fintech:setup` installs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

process.env.NEXT_PUBLIC_IS_STAGING = "true";

const alder = await import("../lib/fintech/alder.ts");
const live = await import("../lib/fintech/live-events.ts");
const consolePages = await import("../lib/fintech/console-pages.ts");
const customer = await import("../lib/fintech/customer.ts");
const { projectTransaction, projectSession } = await import("../lib/igaming/records.ts");
const { balanceOf } = await import("../components/fintech/use-alder.ts");

const fixture = (name) =>
  JSON.parse(fs.readFileSync(new URL(`./fixtures/alder/${name}.json`, import.meta.url), "utf8"));

const held = projectTransaction(fixture("transfer-held").get);
const salary = projectTransaction(fixture("salary-approved").get);

test("Alder's workflows come from the shared demo config", () => {
  assert.equal(alder.ONBOARDING_WORKFLOW_ID, "c076a8bb-b0a1-482a-a257-c296391fac2f");
  assert.equal(alder.STEP_UP_WORKFLOW_ID, "9b610989-c77e-48ad-9c27-0668c6edd2be");
  assert.equal(alder.CUSTOMER_PREFIX, "alder-");
});

test("a transfer to a new payee carries what the step-up rule reads", () => {
  const payload = alder.paymentPayload(
    { kind: "transfer", amount: 5000, counterparty: "Jonas Koch", account: "DE44 •••• 4931", newPayee: true },
    { id: "alder-0f3a9c21d4e85b7a6c19e2d0", name: "Lena Fischer" },
    Date.UTC(2026, 9, 27),
  );

  assert.match(payload.txnId, /^al-transfer-6c19e2d0-/);
  assert.equal(payload.category, "finance");
  assert.deepEqual(payload.details, {
    direction: "out",
    amount: "5000.00",
    currency: "EUR",
    currencyType: "fiat",
    actionType: "transfer",
  });
  assert.deepEqual(payload.customProperties, { demo_app: "fintech", bank: "Alder", new_payee: true });
  assert.equal(payload.counterparty.paymentMethod.accountId, "DE44 •••• 4931");
  // The subject's vendor_data comes from the token, never the browser.
  assert.equal(payload.subject.externalUserId, undefined);
});

test("money in and out: the first week adds up to the balance on the boards", () => {
  const items = alder.FIRST_WEEK.map((seed, index) => ({
    ...seed,
    key: String(index),
    at: index,
    error: null,
    record: { ...salary, status: "APPROVED" },
  }));

  assert.equal(balanceOf(items), 12480.2);
  // A held transfer has not left the account; a released one has.
  const transfer = { kind: "transfer", amount: 5000, counterparty: "Jonas Koch", key: "t", at: 9, error: null };

  assert.equal(balanceOf([{ ...transfer, record: held }, ...items]), 12480.2);
  assert.equal(balanceOf([{ ...transfer, record: { ...held, status: "APPROVED" } }, ...items]), 7480.2);
  assert.equal(alder.formatMoney(7480.2), "7,480.20 EUR");
  assert.deepEqual(alder.splitMoney(12480.2), { whole: "12,480", cents: ".20" });
});

test("the rules match Alder's own customers only and hold or decline", () => {
  const rule = alder.newPayeeRule(alder.STEP_UP_WORKFLOW_ID);

  assert.equal(rule.title, "Alder demo: 5,000 EUR or more to a new payee");
  assert.deepEqual(rule.conditions[0], { field: "subject_vendor_data", operator: "contains", value: "alder-" });
  assert.ok(rule.conditions.some((c) => c.field === "custom_values.new_payee" && c.value === true));
  assert.ok(rule.conditions.some((c) => c.field === "amount" && c.operator === "gte" && c.value === 5000));
  assert.deepEqual(rule.actions[0], {
    type: "change_status",
    value: "AWAITING_USER",
    workflow_id: "9b610989-c77e-48ad-9c27-0668c6edd2be",
  });

  const takeover = alder.takeoverRule();

  assert.deepEqual(takeover.scope, { record_types: ["event"], event_categories: ["security"] });
  assert.ok(takeover.conditions.some((c) => c.field === "event.action_type" && c.value === "login_failed"));
  assert.ok(takeover.actions.some((a) => a.type === "change_status" && a.value === "DECLINED"));

  const event = alder.takeoverEvent(1);

  assert.equal(event.category, "security");
  assert.equal(event.actionType, "login_failed");
  assert.deepEqual(event.customValues, { demo_app: "fintech", passkey: "failed" });
});

test("the recorded staging hold is the new-payee rule with a step-up session", () => {
  assert.equal(held.status, "AWAITING_USER");
  assert.equal(held.action.type, "verification_session");
  assert.match(held.action.url, /^https:\/\/verify\.staging\.didit\.me\/session\//);
  const hit = held.ruleHits.find((rule) => rule.statusTarget);

  assert.equal(alder.ruleName(hit.title), "5,000 EUR or more to a new payee");
  assert.equal(alder.paymentState(held.status), "held");
  assert.equal(alder.paymentState("APPROVED"), "done");
});

test("the live layer says what Didit did with each payment", () => {
  const line = { kind: "transfer", amount: 5000, counterparty: "Jonas Koch", newPayee: true };
  const [hold, request] = live.paymentEvents(held, line);

  assert.equal(hold.tone, "hold");
  assert.equal(hold.detail, "Rule hit: 5,000 EUR or more to a new payee");
  assert.equal(request.title, "Step-up requested");
  assert.equal(request.detail, "5,000.00 EUR to Jonas Koch, a new payee");

  const [received] = live.paymentEvents(salary, {
    kind: "incoming_transfer",
    amount: 3200,
    counterparty: "Nordwerk GmbH",
    detail: "Salary",
  });

  assert.equal(received.title, "Salary received");
  assert.equal(received.detail, "3,200.00 EUR from Nordwerk GmbH · risk 0 of 100");
  assert.match(received.code, /^submitTransaction\(\{ type: "incoming_transfer"/);

  const released = live.stepUpDecided(
    { sessionId: held.action.sessionId, status: "Approved" },
    { ...held, status: "APPROVED" },
  );

  assert.deepEqual(released.map((event) => event.title), ["It's you: step-up approved", "Transfer released"]);
});

test("the takeover lines report Didit's decision, or why there is none", () => {
  const device = { browser: "Safari", os: "macOS", firstVisit: false };
  const declined = live.takeoverEvents({ status: "DECLINED", score: 90, error: null }, device);

  assert.equal(declined.at(-1).title, "Sign-in blocked");
  assert.equal(declined.at(-1).detail, "Passkey check failed · declined by a rule, score 90");
  assert.equal(declined[1].title, "Sign-in from Safari on macOS");

  const off = live.takeoverEvents(
    { status: null, score: null, error: "event monitoring is off for this application" },
    null,
  );

  assert.equal(off.at(-1).detail, "Passkey check failed · event monitoring is off for this application");
});

test("the console view opens the held transfer, then shows how it was released", () => {
  const onboarding = projectSession(
    {
      session_id: "c5c01e9c-461c-4726-b288-c16fb8ec41b1",
      vendor_data: "alder-0f3a9c21d4e85b7a6c19e2d0",
      status: "Approved",
      id_verifications: [{ first_name: "Lena", last_name: "Fischer", document_type: "Identity Card", issuing_state_name: "Germany" }],
      aml_screenings: [{ total_hits: 0 }],
    },
    "alder-0f3a9c21d4e85b7a6c19e2d0",
  );
  const at = Date.parse(held.createdAt);
  const input = (record, stepUp) => ({
    customer: { customerId: "alder-0f3a9c21d4e85b7a6c19e2d0", name: "Lena Fischer", email: "lena.fischer@example.com", createdAt: at },
    onboarding,
    stepUp,
    activity: [
      { key: "t", kind: "transfer", amount: 5000, counterparty: "Jonas Koch", account: "DE44 •••• 4931", newPayee: true, at, releasedAt: at + 67_000, record },
      { key: "s", kind: "incoming_transfer", amount: 3200, counterparty: "Nordwerk GmbH", at, record: salary },
    ],
    events: [],
    device: null,
    signIn: null,
    takeover: null,
    now: at,
  });

  const before = consolePages.alderConsole(input(held, null)).find((tab) => tab.id === "transaction");

  assert.equal(before.page.head.title, "5,000.00 EUR");
  assert.deepEqual(before.page.head.tag, { label: "On hold", tone: "rev" });
  assert.equal(before.page.blocks[0].tone, "hold");
  assert.equal(before.page.blocks[1].rows[0].detail, "action: step-up with a selfie");
  assert.match(before.note, /why it is held/);

  const after = consolePages
    .alderConsole(input({ ...held, status: "APPROVED", action: null }, { sessionId: held.action.sessionId, status: "Approved" }))
    .find((tab) => tab.id === "transaction");

  assert.deepEqual(after.page.head.tag, { label: "Approved", tone: "ok" });
  assert.match(after.page.blocks[0].text, /Didit released it automatically/);
  assert.deepEqual(after.page.side.pairs.at(-1), ["Time held", "67 seconds"]);
  assert.match(after.note, /how it was released/);

  const person = consolePages.alderConsole(input(held, null)).find((tab) => tab.id === "person");

  assert.equal(person.page.head.title, "Lena Fischer");
  assert.ok(person.page.blocks[0].checks.some((check) => check.label === "AML screening" && check.value === "No matches"));
});

test("the customer cookie is signed and only holds an Alder id", () => {
  const id = customer.newCustomerId();

  assert.match(id, /^alder-[a-f0-9]{24}$/);
  const cookie = customer.signCustomer(id, "secret");

  assert.equal(customer.verifyCustomer(cookie, "secret"), id);
  assert.equal(customer.verifyCustomer(cookie, "other"), null);
  assert.equal(customer.verifyCustomer(cookie.replace(id, "alder-000000000000000000000000"), "secret"), null);
  assert.equal(customer.verifyCustomer("aurora-play-0123.sig", "secret"), null);
});
