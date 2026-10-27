// What Aurora Play shows in the Didit live layer and the console view, built
// from Didit's recorded staging answers (tests/fixtures/igaming). Run with
// `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

process.env.NEXT_PUBLIC_IS_STAGING = "true";

const { projectTransaction } = await import("../lib/igaming/records.ts");
const events = await import("../lib/igaming/live-events.ts");
const { auroraConsole, focusTransaction } = await import("../lib/igaming/console-pages.ts");

const recorded = (name) =>
  JSON.parse(fs.readFileSync(new URL(`./fixtures/igaming/${name}.json`, import.meta.url), "utf8"));
const record = (name) => projectTransaction(recorded(name).get);
const item = (name, kind, amount, at = 0) => ({
  key: `k-${name}`,
  kind,
  amount,
  detail: null,
  at,
  record: record(name),
  error: null,
});
const context = { person: "Sofia Marin", depositedBefore: 500, previous: null, accountsOnDevice: 1 };

test("an approved deposit: green, with its risk score and the call behind it", () => {
  const [event] = events.transactionEvents(item("deposit-approved", "deposit", 500), context);

  assert.equal(event.tone, "txn");
  assert.equal(event.title, "Deposit approved");
  assert.equal(event.detail, "500.00 EUR · risk 40 of 100");
  assert.equal(event.code, 'submitTransaction({ type: "deposit", amount: 500 })');
  assert.equal(event.key, `txn-${record("deposit-approved").id}`);
});

test("the deposit that crosses 2,000 EUR: on hold, the rule that hit and the ID check next", () => {
  const list = events.transactionEvents(item("deposit-held", "deposit", 1650), context);

  // Pushed oldest first, so the hold lands on top of the feed.
  assert.deepEqual(
    list.map((event) => [event.tone, event.title]),
    [
      ["ver", "Next: ID and selfie"],
      ["txn", "Rule hit: ID verification at 2,000 EUR deposited"],
      ["hold", "Deposit held for an ID check"],
    ],
  );
  assert.equal(list[2].detail, "1,650.00 EUR · 30-day total would be 2,150 EUR");
  assert.equal(list[0].detail, "Core KYC workflow, prefilled for Sofia Marin");
});

test("a second account's bonus on the same device: signals and the hold", () => {
  const list = events.transactionEvents(item("bonus-shared-device", "bonus_claim", 20), {
    ...context,
    previous: "Sofia Marin",
    accountsOnDevice: 2,
  });

  assert.deepEqual(
    list.map((event) => [event.tone, event.title, event.detail]),
    [
      ["sig", "Device seen before", "Same device as Sofia Marin · 2 accounts"],
      ["hold", "Bonus held for review", "Device already used by another player"],
    ],
  );
});

test("a refused transaction says Didit's own reason", () => {
  const [event] = events.transactionEvents(
    { key: "x", kind: "bet", amount: 10, detail: null, at: 0, record: null, error: "The player is blocked." },
    context,
  );

  assert.equal(event.tone, "stop");
  assert.equal(event.title, "Bet refused");
  assert.equal(event.detail, "The player is blocked.");
});

test("verification, signals and Authentication events", () => {
  assert.deepEqual(events.checkStarted("age").map((event) => event.title), ["First bet waits", "Age check started"]);
  const age = { sessionId: "8a1f6a52-2c39", status: "Approved", estimatedAge: 27, documentAge: null };

  assert.equal(events.checkDecided("age", age)[0].title, "Age check approved");
  assert.equal(events.checkDecided("age", age)[0].detail, "Estimated age 27");
  assert.equal(events.checkDecided("age", { ...age, status: "Declined" })[0].tone, "stop");
  assert.equal(
    events.checkDecided("kyc", { ...age, fullName: "Sofia Marin", documentType: "Passport", documentCountry: "Malta" })[0].detail,
    "Sofia Marin · Passport · Malta",
  );
  const [device, bot] = events.deviceEvents({ firstVisit: true, botScore: 0.02, browser: "Chrome", os: "macOS" });

  assert.equal(device.title, "New device fingerprinted");
  assert.equal(device.detail, "Chrome on macOS · first visit");
  assert.equal(bot.title, "Bot protection: human");
  assert.equal(bot.detail, "Bot score 0.02");
  assert.equal(events.deviceEvents({ firstVisit: false, botScore: 0.9, browser: "Chrome", os: "Linux" })[1].tone, "stop");
  const signUp = events.authEvent({ sessionId: "s1", email: "sofia.marin@example.com", methods: ["passkey"], signUp: true, device: null });

  assert.equal(signUp.title, "Passkey created");
  assert.equal(signUp.code, "<SignUp /> · @didit-protocol/auth-nextjs");
  assert.equal(
    events.authEvent({ sessionId: "s2", email: null, methods: ["code"], signUp: false, device: null }).title,
    "Signed in with an email code",
  );
});

test("the console view shows this visitor's records, and says so when there are none", () => {
  const empty = auroraConsole({
    player: null, age: null, kyc: null, activity: [], events: [], device: null, accounts: [], signIn: null,
    totals: { balance: 0, depositedTotal: 0, depositedToday: 0, bets: 0, bonusClaimed: false }, now: 0,
  });

  assert.deepEqual(empty.map((tab) => tab.label), ["Person", "Transaction", "Verification", "Device"]);
  assert.ok(empty.every((tab) => tab.page === null && tab.empty));

  const activity = [item("deposit-held", "deposit", 1650, 2), item("deposit-approved", "deposit", 500, 1)];
  const kyc = {
    sessionId: "583b0948-6217-4404-be90-be5fe3ac1a19", workflowId: null, status: "Approved", estimatedAge: null, documentAge: 27,
    ip: { country: "Malta", countryCode: "MT", isVpnOrTor: false, isDataCenter: false },
    fullName: "Sofia Marin", documentType: "Passport", documentCountry: "Malta", faceMatch: 98.1, liveness: 99.4, amlHits: null,
  };
  const tabs = auroraConsole({
    player: { playerId: "aurora-play-d1808cd5db4c84d057c140ac", name: "", email: "sofia.marin@example.com", createdAt: Date.UTC(2026, 9, 25) },
    age: { ...kyc, sessionId: "8a1f6a52", status: "Approved", estimatedAge: 27, documentAge: null, fullName: null, documentType: null },
    kyc,
    activity,
    events: [],
    device: { persistentId: "pid-1", botScore: 0.02, browser: "Chrome", os: "macOS" },
    accounts: [
      { playerId: "aurora-play-d1808cd5db4c84d057c140ac", label: "Sofia Marin", createdAt: 0 },
      { playerId: "aurora-play-f268a6123b269b6031ac0edf", label: "lucas.b@example.com", createdAt: 0 },
    ],
    signIn: "Passkey",
    totals: { balance: 500, depositedTotal: 2150, depositedToday: 2150, bets: 0, bonusClaimed: false },
    now: Date.UTC(2026, 9, 27),
  });
  const person = tabs[0].page;

  assert.equal(person.head.title, "Sofia Marin");
  assert.deepEqual(person.head.tag, { label: "Verified", tone: "ok" });
  assert.deepEqual(
    person.kpis.map((kpi) => `${kpi.label}: ${kpi.value}`),
    ["Sign-ins: 1", "Risk: Medium", "Deposits: 2,150 EUR", "Linked accounts: 1"],
  );
  const identity = person.blocks.find((block) => block.kind === "identity");

  assert.equal(identity.document, "MALTA · PASSPORT");
  assert.deepEqual(identity.checks.map((check) => check.label), ["Face match", "Liveness", "Age", "Document"]);
  assert.ok(person.linked.some((linked) => linked.title === "lucas.b@example.com"));

  // The held deposit is the one the team would open.
  assert.equal(focusTransaction(activity).kind, "deposit");
  const transaction = tabs[1].page;

  assert.equal(transaction.head.title, "1,650.00 EUR");
  assert.deepEqual(transaction.head.tag, { label: "On hold", tone: "rev" });
  assert.equal(transaction.blocks[0].kind, "note");
  assert.deepEqual(
    transaction.blocks.find((block) => block.kind === "rules").rows.map((row) => row.title),
    ["ID verification at 2,000 EUR deposited", "cashier used outside licensed markets"],
  );
  assert.equal(tabs[3].page.kpis[0].value, "2");
});
