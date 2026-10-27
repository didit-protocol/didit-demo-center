// The /crypto-exchange demo (Kestrel): payloads, the trimmed transaction view,
// the exchange's stage logic and its Didit policy. Run with `npm test`.
//
// tests/fixtures/crypto-exchange/*.json are real responses recorded from the
// staging application for a synthetic user, with device data and session
// tokens removed. The one `.derived.json` file is labelled inside.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  SANCTIONED_WALLET,
  buildDepositPayload,
  buildWithdrawalPayload,
  depositOutcome,
  isEvmAddress,
  parseAmount,
  providerName,
  randomEvmAddress,
  riskBand,
  toTransactionView,
  withdrawalHoldsFunds,
  withdrawalStage,
} from "../lib/crypto-exchange/transactions.ts";
import {
  accountCopy,
  accountStage,
  toAccountView,
} from "../lib/crypto-exchange/onboarding.ts";
import {
  TRAVEL_RULE_SETTINGS,
  cryptoExchangeRules,
} from "../lib/crypto-exchange/policy.ts";
import { PANEL_STEPS } from "../lib/crypto-exchange/panel.ts";

const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/crypto-exchange/${name}.json`, import.meta.url)),
  );
const view = (name) => toTransactionView(fixture(name));

const OWN = "0x40f0b0f45e4cda6726eaea66d113096fa5d44944";

test("a deposit screens the sending wallet and carries the demo scope", () => {
  const own = buildDepositPayload({
    txnId: "kestrel-dep-1",
    vendorData: "kestrel-user",
    fullName: "Avery Quinn",
    amount: "1.25",
    source: "own-wallet",
    ownWallet: OWN,
  });

  assert.equal(own.type, "finance");
  assert.equal(own.info.direction, "in");
  assert.equal(own.info.currencyType, "crypto");
  assert.deepEqual(own.info.cryptoParams, { crypto_chain: "ETH" });
  assert.equal(own.subject.externalUserId, "kestrel-user");
  assert.deepEqual(own.counterparty.paymentMethod, {
    type: "unhosted_wallet",
    accountId: OWN,
  });
  assert.equal(own.counterparty.fullName, "Avery Quinn");
  assert.equal(own.props.demo_app, "crypto-exchange");
  assert.equal(own.includeCryptoScreening, true);

  const unknown = buildDepositPayload({
    txnId: "kestrel-dep-2",
    vendorData: "kestrel-user",
    fullName: "Avery Quinn",
    amount: "0.8",
    source: "unknown-sender",
    ownWallet: OWN,
  });

  assert.equal(unknown.counterparty.paymentMethod.accountId, SANCTIONED_WALLET);
  // Nobody knows who sent it, so the payload does not invent a name.
  assert.equal(unknown.counterparty.fullName, undefined);
});

test("a withdrawal is a Travel Rule transfer that never names the receiving exchange", () => {
  const ownWallet = buildWithdrawalPayload({
    txnId: "kestrel-wd-1",
    fullName: "Avery Quinn",
    amount: "0.4",
    destination: "own-wallet",
    address: ` ${OWN} `,
    beneficiaryName: "",
  });

  assert.equal(ownWallet.category, "travelRule");
  assert.equal(ownWallet.details.direction, "out");
  assert.equal(ownWallet.counterparty.paymentMethod.type, "unhosted_wallet");
  assert.equal(ownWallet.counterparty.paymentMethod.accountId, OWN);
  // An empty beneficiary means the user themself.
  assert.equal(ownWallet.counterparty.fullName, "Avery Quinn");
  assert.deepEqual(ownWallet.travelRule.originatorData, { name: "Avery Quinn" });
  assert.equal(ownWallet.customProperties.demo_app, "crypto-exchange");
  assert.equal(ownWallet.includeCryptoScreening, true);

  const exchange = buildWithdrawalPayload({
    txnId: "kestrel-wd-2",
    fullName: "Avery Quinn",
    amount: "0.3",
    destination: "exchange",
    address: OWN,
    beneficiaryName: "Avery Quinn",
  });

  assert.equal(exchange.counterparty.paymentMethod.type, "crypto_wallet");
  // A VASP name, LEI or email could route the transfer over the email rail to
  // a real exchange's compliance inbox. The demo must never send any of them.
  for (const key of ["counterparty_vasp_name", "counterparty_vasp_lei", "counterparty_vasp_email"]) {
    assert.equal(key in exchange.travelRule.beneficiaryData, false);
  }
});

test("amounts and addresses are validated before anything is sent", () => {
  assert.equal(parseAmount("1.25"), "1.25");
  assert.equal(parseAmount("0,5"), "0.5");
  assert.equal(parseAmount("5"), "5");
  for (const bad of ["", "0", "0.001", "5.01", "-1", "1e3", "abc"]) {
    assert.equal(parseAmount(bad), null, bad);
  }
  assert.equal(isEvmAddress(SANCTIONED_WALLET), true);
  assert.equal(isEvmAddress("0x123"), false);

  const address = randomEvmAddress((size) => new Uint8Array(size).fill(171));

  assert.equal(address, `0x${"ab".repeat(20)}`);
  assert.equal(isEvmAddress(address), true);
});

test("a clean deposit is credited and the sanctioned one is frozen", () => {
  const clean = view("deposit-own-wallet");

  assert.equal(clean.kind, "deposit");
  assert.equal(depositOutcome(clean), "credited");
  assert.equal(clean.screening.riskScore, 0);
  assert.equal(clean.wallet, clean.wallet.toLowerCase());

  const risky = view("deposit-unknown-sender");

  assert.equal(depositOutcome(risky), "frozen");
  assert.equal(risky.wallet, SANCTIONED_WALLET);
  assert.equal(risky.screening.provider, "merklescience");
  assert.equal(providerName(risky.screening.provider), "Merkle Science");
  assert.equal(providerName("someone-new"), "someone-new");
  assert.equal(risky.screening.riskScore, 95);
  assert.equal(risky.screening.severity, "CRITICAL");
  assert.equal(risky.screening.walletSanctioned, true);
  assert.ok(risky.screening.riskFactors.some((factor) => factor.startsWith("Sanctions")));
  assert.ok(
    risky.rules.some(
      (rule) =>
        rule.title === "Wallet risk: sanctioned wallet (crypto exchange demo)" &&
        rule.statusTarget === "DECLINED",
    ),
  );
  assert.equal(riskBand(risky.screening.riskScore).tone, "declined");
  assert.equal(riskBand(0).tone, "approved");
  assert.equal(riskBand(null).label, "Not screened");
});

test("a self-hosted withdrawal asks for wallet proof, then for the selfie, then clears", () => {
  const submitted = view("withdrawal-own-wallet");

  assert.equal(submitted.status, "AWAITING_USER");
  assert.equal(submitted.travelRule.status, "UNCONFIRMED_OWNERSHIP");
  assert.equal(submitted.action.type, "wallet_ownership");
  assert.equal(withdrawalStage(submitted), "prove-ownership");

  const owned = view("withdrawal-own-wallet-owned");

  assert.equal(owned.travelRule.status, "COMPLETED");
  assert.equal(owned.action.type, "verification_session");
  assert.equal(owned.action.sessionId, owned.stepUp.sessionId);
  assert.equal(withdrawalStage(owned), "step-up");

  const approved = view("withdrawal-own-wallet-approved.derived");

  assert.equal(withdrawalStage(approved), "ready");
  assert.equal(approved.decisionReason, "User verification approved");
});

test("a withdrawal to another exchange shows the Travel Rule routing outcome", () => {
  const exchange = view("withdrawal-exchange");

  assert.equal(exchange.travelRule.status, "COUNTERPARTY_VASP_NOT_FOUND");
  // On staging no network is connected, so Didit falls back to wallet proof.
  assert.equal(withdrawalStage(exchange), "prove-ownership");
  assert.ok(exchange.usdValue);
});

test("a sanctioned withdrawal is blocked even though Didit minted a wallet widget", () => {
  const blocked = view("withdrawal-sanctioned");

  // The real response carries a wallet_ownership action for a DECLINED
  // transfer; the exchange must not ask the user to prove that wallet.
  assert.equal(blocked.status, "DECLINED");
  assert.equal(blocked.action.type, "wallet_ownership");
  assert.equal(withdrawalStage(blocked), "blocked");
  assert.equal(withdrawalHoldsFunds("blocked"), false);
  assert.equal(withdrawalHoldsFunds("step-up"), true);
});

test("the remaining withdrawal stages follow the documented statuses", () => {
  const base = { status: "APPROVED", action: null, travelRule: null };

  assert.equal(withdrawalStage(base), "ready");
  assert.equal(withdrawalStage({ ...base, status: "IN_REVIEW" }), "review");
  assert.equal(withdrawalStage({ ...base, status: "AWAITING_USER" }), "step-up-unavailable");
  assert.equal(
    withdrawalStage({ ...base, travelRule: { status: "AWAITING_COUNTERPARTY", required: true } }),
    "awaiting-counterparty",
  );
  assert.equal(
    withdrawalStage({ ...base, travelRule: { status: "COUNTERPARTY_MISMATCHED_DATA", required: true } }),
    "travel-rule-stuck",
  );
  assert.equal(
    withdrawalStage({ ...base, travelRule: { status: "NOT_APPLICABLE", required: false } }),
    "ready",
  );
});

test("the trimmed view never carries device data, IPs or session tokens", () => {
  for (const name of [
    "deposit-own-wallet",
    "deposit-unknown-sender",
    "withdrawal-own-wallet",
    "withdrawal-own-wallet-owned",
    "withdrawal-exchange",
    "withdrawal-sanctioned",
  ]) {
    const raw = fixture(name);

    // Even when the record carries them, the view drops them.
    raw.parties = [{ device: { network_context: { ip_address: "203.0.113.7" } } }];
    raw.remediation = raw.remediation && { ...raw.remediation, session_token: "secret" };
    const serialized = JSON.stringify(toTransactionView(raw));

    for (const leak of ["203.0.113.7", "network_context", "session_token", "secret", "device"]) {
      assert.equal(serialized.includes(leak), false, `${name} leaks ${leak}`);
    }
  }
});

test("the onboarding decision maps to the account the exchange opens", () => {
  const notStarted = toAccountView(fixture("decision-not-started"));

  assert.equal(notStarted.stage, "processing");
  assert.equal(notStarted.fullName, null);
  assert.deepEqual(
    notStarted.checks.map((check) => check.label),
    ["ID document", "Liveness", "Face match", "AML screening"],
  );

  // Field names as documented in docs.didit.me/sessions-api/retrieve-session.
  const approved = toAccountView({
    session_id: "s-1",
    status: "Approved",
    id_verifications: [{ status: "Approved", first_name: "Avery", last_name: "Quinn" }],
    liveness_checks: [{ status: "Approved" }],
    face_matches: [{ status: "Approved" }],
    aml_screenings: [{ status: "Approved", total_hits: 0 }],
  });

  assert.equal(approved.stage, "approved");
  assert.equal(approved.fullName, "Avery Quinn");
  assert.equal(approved.amlHits, 0);

  assert.equal(accountStage("In Review"), "review");
  assert.equal(accountStage("in_review"), "review");
  assert.equal(accountStage("Declined"), "declined");
  assert.equal(accountStage("Not Started"), "processing");
  assert.equal(accountStage("Abandoned"), "unknown");

  const review = accountCopy({ stage: "review", status: "In Review", amlHits: 2 });

  assert.match(review.body, /2 possible matches/);
  assert.match(review.body, /locked/);
  assert.match(accountCopy({ stage: "review", status: "In Review", amlHits: 1 }).body, /1 possible match\b/);
});

test("every rule is scoped to the demo and the step-up names its workflow", () => {
  const rules = cryptoExchangeRules("9b610989-c77e-48ad-9c27-0668c6edd2be");

  for (const rule of rules) {
    assert.ok(
      rule.conditions.some(
        (condition) =>
          condition.field === "custom_values.demo_app" &&
          condition.operator === "eq" &&
          condition.value === "crypto-exchange",
      ),
      rule.title,
    );
    // Runs after a generic rule such as "Sender != Receiver (verify)": the
    // engine orders custom rules by title and the last explicit status wins.
    assert.ok(rule.title.localeCompare("Sender != Receiver (verify)") > 0, rule.title);
  }

  const stepUp = rules.find((rule) => rule.title.startsWith("Withdrawal step-up"));

  assert.deepEqual(stepUp.scope, { directions: ["OUTBOUND"] });
  assert.deepEqual(stepUp.actions, [
    {
      type: "change_status",
      value: "AWAITING_USER",
      workflow_id: "9b610989-c77e-48ad-9c27-0668c6edd2be",
    },
  ]);

  assert.equal(TRAVEL_RULE_SETTINGS.is_enabled, true);
  assert.equal(TRAVEL_RULE_SETTINGS.is_discoverable, false);
  assert.equal(TRAVEL_RULE_SETTINGS.vasp_attribution_enabled, false);
});

test("the side panel links every call to a docs page and avoids em dashes", () => {
  assert.deepEqual(
    PANEL_STEPS.map((step) => step.id),
    ["onboarding", "deposit", "withdrawal", "review"],
  );
  for (const step of PANEL_STEPS) {
    assert.ok(step.calls.length > 0);
    for (const call of step.calls) {
      assert.match(call.docsPath, /^[a-z0-9-]+(\/[a-z0-9-]+)+$/);
    }
    assert.equal(JSON.stringify(step).includes("\u2014"), false, step.id);
  }
});
