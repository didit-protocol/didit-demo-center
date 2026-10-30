// What Kestrel shows in the Didit live layer and the console view, built from
// Didit's recorded staging answers (tests/fixtures/crypto-exchange). Run with
// `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

await import("./helpers/register.mjs");

const { toTransactionView } = await import("../lib/crypto-exchange/transactions.ts");
const { toAccountView } = await import("../lib/crypto-exchange/onboarding.ts");
const events = await import("../lib/crypto-exchange/live-events.ts");
const { kestrelConsole, focusTransaction } = await import(
  "../lib/crypto-exchange/console-pages.ts"
);

const recorded = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/crypto-exchange/${name}.json`, import.meta.url), "utf8"),
  );
const item = (name, kind, asset, createdAt = "2026-10-27T10:00:00.000Z") => ({
  id: recorded(name).uuid,
  kind,
  asset,
  wallet: "",
  createdAt,
  view: toTransactionView(recorded(name)),
});

// A finished KYC, in the decision fields docs.didit.me documents.
const account = toAccountView({
  session_id: recorded("decision-not-started").session_id,
  status: "Approved",
  id_verifications: [
    {
      status: "Approved",
      first_name: "Avery",
      last_name: "Quinn",
      document_type: "PASSPORT",
      issuing_state_name: "Portugal",
    },
  ],
  liveness_checks: [{ status: "Approved" }],
  face_matches: [{ status: "Approved" }],
  aml_screenings: [{ status: "Approved", total_hits: 0 }],
});

const all = (inputs) => JSON.stringify(inputs);

test("the KYC: deposits wait for it, then the decision with the document", () => {
  const started = events.verificationStarted();

  assert.deepEqual(
    started.map((input) => input.title),
    ["Deposits wait for an approved KYC", "Verification started"],
  );
  const [decided] = events.verificationDecided(account);

  assert.equal(account.document, "Passport · Portugal");
  assert.equal(decided.title, "KYC and AML approved");
  assert.equal(decided.detail, "Passport · Portugal · no matches");
  assert.equal(decided.tone, "ver");
  assert.deepEqual(events.verificationDecided({ ...account, stage: "processing" }), []);
});

test("a deposit is screened by its sending wallet; the sanctioned one is frozen", () => {
  const [clean] = events.transactionEvents(item("deposit-own-wallet-btc", "deposit", "BTC"));

  assert.equal(clean.title, "Deposit screened");
  assert.equal(clean.detail, "0.25 BTC · sending wallet risk 0 of 100, low");
  assert.match(clean.code, /submitTransaction/);

  const frozen = events.transactionEvents(item("deposit-unknown-sender", "deposit", "ETH"));

  assert.deepEqual(
    frozen.map((input) => [input.tone, input.title]),
    [
      ["txn", "Rule hit: sanctioned wallet"],
      ["stop", "Deposit frozen"],
    ],
  );
  assert.equal(frozen[1].detail, "0.8 ETH · sending wallet risk 95 of 100, severe · sanctions");
});

test("a Travel Rule withdrawal: the wallet proof, the selfie, then sent", () => {
  const proof = events.transactionEvents(item("withdrawal-own-wallet", "withdrawal", "ETH"));

  assert.deepEqual(
    proof.map((input) => input.title),
    ["Travel Rule: self-hosted wallet", "Withdrawal held"],
  );
  const selfie = events.transactionEvents(item("withdrawal-own-wallet-owned", "withdrawal", "ETH"));

  assert.deepEqual(
    selfie.map((input) => [input.product, input.title]),
    [
      ["transactions", "Travel Rule: self-hosted wallet"],
      ["transactions", "Withdrawal held"],
      ["authentication", "Step-up: selfie requested"],
    ],
  );
  // The selfie replaces the held event under the same key, so the feed moves on.
  assert.equal(selfie[2].key, proof[1].key);
  const [sent] = events.transactionEvents(
    item("withdrawal-own-wallet-approved.derived", "withdrawal", "ETH"),
  );

  assert.equal(sent.title, "Withdrawal sent");
});

test("a withdrawal to a sanctioned wallet is declined with its risk", () => {
  const declined = events.transactionEvents(item("withdrawal-sanctioned", "withdrawal", "ETH"));

  assert.deepEqual(
    declined.map((input) => [input.tone, input.title]),
    [
      ["txn", "Rule hit: sanctioned wallet"],
      ["stop", "Withdrawal declined"],
    ],
  );
  assert.equal(declined[1].detail, "0.2 ETH · destination wallet risk 95 of 100, severe · sanctions");
  assert.equal(declined[1].code, 'submitTransaction(…) → "declined"');
});

test("the console view opens the declined withdrawal with the wallet risk and the rules", () => {
  const activity = [
    item("withdrawal-sanctioned", "withdrawal", "ETH", "2026-10-27T10:05:00.000Z"),
    item("deposit-own-wallet", "deposit", "ETH"),
  ];
  const tabs = kestrelConsole({
    userId: "kestrel-0f6c2a51-3c4e-4d7b-9a1f-2b8e5d6c7a90",
    email: "avery.quinn@example.com",
    account,
    activity,
    events: [],
    device: { persistentId: "d_9b20aa11", firstVisit: false, botScore: 0.05, browser: "Chrome", os: "macOS" },
    signIn: null,
    now: Date.parse("2026-10-27T12:00:00.000Z"),
  });

  assert.deepEqual(
    tabs.map((tab) => tab.id),
    ["person", "transaction", "verification", "device"],
  );
  assert.equal(focusTransaction(activity), activity[0]);
  const page = tabs[1].page;

  assert.equal(page.head.title, "0.2 ETH");
  assert.equal(page.head.aside, "Outbound");
  assert.deepEqual(page.head.tag, { label: "Declined", tone: "no" });
  assert.deepEqual(
    page.kpis.map((kpi) => [kpi.label, kpi.value]),
    [
      ["Wallet risk", "95 / 100"],
      ["Amount", "0.2 ETH"],
      ["Rules triggered", "2"],
      ["Exposure", "Sanctions"],
    ],
  );
  const rules = page.blocks.find((block) => block.kind === "rules");

  assert.deepEqual(
    rules.rows.map((row) => [row.state, row.title]),
    [
      ["declined", "Sanctioned wallet"],
      ["hit", "High-risk exposure"],
      ["passed", "Travel Rule"],
      ["passed", "Customer risk"],
      ["passed", "Device"],
    ],
  );
  assert.match(page.blocks[0].text, /scores 95 of 100, with direct exposure to a sanctioned entity/);
  assert.match(page.blocks[0].text, /No ETH left the platform\./);
  assert.match(tabs[1].note, /The ETH withdrawal Kestrel just declined is here/);
  assert.equal(tabs[0].page.head.title, "Avery Quinn");
  assert.equal(tabs[2].page.head.title, "KYC and AML");
});

test("an open KYC session reads as in progress with its started time, never as not started", () => {
  // The real decision of a session Didit opened and nobody finished yet.
  const open = toAccountView(recorded("decision-not-started"));
  const tabs = kestrelConsole({
    userId: "kestrel-0f6c2a51-3c4e-4d7b-9a1f-2b8e5d6c7a90",
    email: "avery.quinn@example.com",
    account: open,
    activity: [],
    events: [],
    device: null,
    signIn: null,
    now: Date.parse("2026-10-13T22:00:00.000Z"),
  });
  const [person, , verification] = tabs.map((tab) => tab.page);
  const started = /^Started 13 Oct, \d\d:32$/;

  assert.ok(person && verification, "both pages exist once a session does");
  assert.deepEqual(person.head.tag, { label: "In progress", tone: "rev" });
  assert.ok(person.head.meta.some((line) => /^KYC started 13 Oct, \d\d:32$/.test(line)));
  assert.equal(person.kpis.find((kpi) => kpi.label === "KYC and AML").value, "In progress");
  const identity = person.blocks.find((block) => block.kind === "identity");

  assert.ok(identity.checks.every((check) => check.value === "In progress" && check.ok === null));

  assert.deepEqual(verification.head.tag, { label: "In progress", tone: "rev" });
  assert.deepEqual(verification.side.tag, { label: "In progress", tone: "rev" });
  assert.ok(verification.head.meta.some((line) => started.test(line)));
  const checks = verification.blocks.find((block) => block.kind === "checks").checks;

  assert.deepEqual(
    checks.map((check) => check.label),
    ["ID document", "Liveness", "Face match", "AML screening"],
  );
  assert.ok(checks.every((check) => check.value === "In progress" && check.ok === null));
  assert.doesNotMatch(JSON.stringify([person, verification]), /Not started|Not run|Not verified/);

  // Didit's other open status, with a check already through: still nothing reads as passed.
  const inProgress = toAccountView({
    ...recorded("decision-not-started"),
    status: "In Progress",
    id_verifications: [{ status: "Approved" }],
    aml_screenings: [{ status: "Approved", total_hits: 0 }],
  });
  const page = kestrelConsole({
    userId: "kestrel-1",
    email: null,
    account: inProgress,
    activity: [],
    events: [],
    device: null,
    signIn: null,
    now: 0,
  })[2].page;

  assert.ok(
    page.blocks
      .find((block) => block.kind === "checks")
      .checks.every((check) => check.value === "In progress" && check.ok === null),
  );
  assert.doesNotMatch(JSON.stringify(page), /No matches|Approved/);
});

test("with nothing yet, every tab says what to do instead of showing a made-up record", () => {
  const tabs = kestrelConsole({
    userId: null,
    email: null,
    account: null,
    activity: [],
    events: [],
    device: null,
    signIn: null,
    now: 0,
  });

  assert.ok(tabs.every((tab) => tab.page === null && tab.empty));
});

test("Kestrel's copy has no em dashes and never names a screening provider", () => {
  const inputs = [
    ...events.verificationStarted(),
    ...events.verificationDecided(account),
    ...["deposit-own-wallet", "deposit-unknown-sender"].flatMap((name) =>
      events.transactionEvents(item(name, "deposit", "ETH")),
    ),
    ...[
      "withdrawal-own-wallet",
      "withdrawal-own-wallet-owned",
      "withdrawal-own-wallet-approved.derived",
      "withdrawal-sanctioned",
      "withdrawal-exchange",
    ].flatMap((name) => events.transactionEvents(item(name, "withdrawal", "ETH"))),
  ];

  assert.equal(all(inputs).includes("—"), false);
  assert.doesNotMatch(all(inputs), /merkle|chainalysis|elliptic|trm/i);
});

test("a signed-in visitor with no email and no name yet is still the Person, in plain running text", () => {
  // A passkey sign-up: Didit knows the visitor, their session carries no email.
  const open = toAccountView(recorded("decision-not-started"));
  const tabs = kestrelConsole({
    userId: "kestrel-0f6c2a51-3c4e-4d7b-9a1f-2b8e5d6c7a90",
    email: null,
    account: open,
    activity: [],
    events: [],
    device: { persistentId: "d_9b20aa11", firstVisit: true, botScore: 0.05, browser: "Chrome", os: "macOS" },
    signIn: "Passkey",
    now: Date.parse("2026-10-13T22:00:00.000Z"),
  });
  const person = tabs[0];

  assert.ok(person.page, "the Person page, never 'Sign up in Kestrel first'");
  assert.deepEqual(person.page.head.tag, { label: "In progress", tone: "rev" });
  assert.deepEqual(
    person.page.kpis.find((kpi) => kpi.label === "Sign-in"),
    { label: "Sign-in", value: "Passkey", unit: "Didit" },
  );
  assert.ok(person.page.side.pairs.some(([key]) => key === "Device"));
  assert.ok(person.page.linked.some((record) => /KYC$/.test(record.title) && /^In progress/.test(record.detail)));
  assert.equal(
    person.note,
    "This is your Didit console. Everything this customer just did in Kestrel is already here, for your team.",
  );
  assert.doesNotMatch(JSON.stringify(tabs.map((tab) => tab.note)), /Everything This/);

  // With an email, the note names them.
  const named = kestrelConsole({
    userId: "kestrel-1",
    email: "avery.quinn@example.com",
    account: null,
    activity: [],
    events: [],
    device: null,
    signIn: "Email code",
    now: 0,
  })[0];

  assert.match(named.note, /Everything avery\.quinn@example\.com just did in Kestrel/);
  assert.equal(named.page.head.title, "avery.quinn@example.com");
});
