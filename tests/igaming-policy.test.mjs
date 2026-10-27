// Aurora Play's policy, wallet and player cookie (/igaming). Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_IS_STAGING = "true";

const policy = await import("../lib/igaming/policy.ts");
const { ledger, openItems } = await import("../lib/igaming/ledger.ts");
const { newPlayerId, signPlayer, verifyPlayer } = await import(
  "../lib/igaming/player.ts"
);

const PLAYER = "aurora-play-0123456789abcdef01234567";

test("player ids are prefixed, random and recognised", () => {
  const a = newPlayerId();
  const b = newPlayerId();

  assert.notEqual(a, b);
  assert.ok(policy.isPlayerId(a));
  assert.ok(a.startsWith(policy.PLAYER_PREFIX));
  assert.ok(!policy.isPlayerId("aurora-play-XYZ"));
  assert.ok(!policy.isPlayerId("someone-else"));
});

test("the player cookie only verifies with the right signature", () => {
  const cookie = signPlayer(PLAYER, "secret-a");

  assert.equal(verifyPlayer(cookie, "secret-a"), PLAYER);
  assert.equal(verifyPlayer(cookie, "secret-b"), null);
  assert.equal(verifyPlayer(`${PLAYER}.forged`, "secret-a"), null);
  // A valid signature for one id does not carry over to another id.
  const other = "aurora-play-ffffffffffffffffffffffff";

  assert.equal(
    verifyPlayer(`${other}.${cookie.split(".").pop()}`, "secret-a"),
    null,
  );
  assert.equal(verifyPlayer(undefined, "secret-a"), null);
  assert.equal(verifyPlayer(cookie, ""), null);
});

test("cashier payloads carry no vendor_data, device data or account id", () => {
  const deposit = policy.buildCashierPayload(
    { kind: "deposit", amount: 250, playerName: "Alex Demo" },
    PLAYER,
    Date.UTC(2026, 9, 13),
  );

  assert.deepEqual(deposit.details, {
    direction: "in",
    amount: "250.00",
    currency: "EUR",
    actionType: "deposit",
    paymentDetails: "Card (demo)",
  });
  assert.equal(deposit.category, "finance");
  assert.deepEqual(deposit.subject, { fullName: "Alex Demo" });
  assert.match(deposit.txnId, /^ap-deposit-01234567-/);
  assert.ok(deposit.txnId.length <= 128);
  assert.doesNotMatch(JSON.stringify(deposit), /vendor_data|accountId|device/);
});

test("each cashier kind maps to the Didit category and direction", () => {
  const cases = {
    deposit: ["finance", "in"],
    withdrawal: ["finance", "out"],
    bet: ["gamblingBet", "out"],
    bonus_claim: ["gamblingBonusChange", "in"],
    deposit_limit: ["gamblingLimitChange", "in"],
  };

  for (const [kind, [category, direction]] of Object.entries(cases)) {
    const payload = policy.buildCashierPayload(
      { kind, amount: 10, playerName: "A", detail: "x" },
      PLAYER,
      1,
    );

    assert.equal(payload.category, category, kind);
    assert.equal(payload.details.direction, direction, kind);
    assert.equal(payload.details.actionType, kind, kind);
    assert.equal(payload.customProperties.detail, "x");
  }
});

test("deposit progress and the daily limit", () => {
  assert.deepEqual(policy.depositProgress(500), {
    total: 500,
    remaining: 1500,
    ratio: 0.25,
    crossed: false,
  });
  assert.equal(policy.depositProgress(2000).crossed, true);
  assert.equal(policy.depositProgress(5000).ratio, 1);
  assert.equal(policy.depositProgress(-5).total, 0);
  assert.equal(policy.limitHeadroom(null, 400), null);
  assert.equal(policy.limitHeadroom(250, 100), 150);
  assert.equal(policy.limitHeadroom(250, 400), 0);
});

test("licensed markets match on ISO-2, any case", () => {
  assert.equal(policy.licensedMarket("es")?.regulator, "DGOJ");
  assert.equal(policy.licensedMarket("GB")?.name, "United Kingdom");
  assert.equal(policy.licensedMarket("US"), null);
  assert.equal(policy.licensedMarket(null), null);
  for (const market of policy.LICENSED_MARKETS) {
    assert.match(market.code, /^[A-Z]{2}$/);
    assert.match(market.iso3, /^[A-Z]{3}$/);
  }
});

test("transaction statuses read in the player's words", () => {
  assert.equal(policy.transactionView("deposit", "APPROVED").tone, "approved");
  const held = policy.transactionView("deposit", "AWAITING_USER");

  assert.equal(held.label, "Verify your ID");
  assert.match(held.message, /until you verify your identity/);
  assert.match(
    policy.transactionView("bonus_claim", "IN_REVIEW").message,
    /Bonus held/,
  );
  assert.equal(policy.transactionView("bet", "DECLINED").tone, "declined");
  assert.equal(policy.transactionView("bet", "SOMETHING").tone, "neutral");
  assert.equal(policy.transactionView("bet", "APPROVED").message, "Bet placed. It settles when the match ends.");
  assert.equal(policy.transactionView("withdrawal", "APPROVED").message, "Withdrawal approved.");
});

test("a self-excluded player is never asked to verify a held deposit", () => {
  const held = policy.transactionView("deposit", "AWAITING_USER", true);

  assert.equal(held.label, "On hold");
  assert.equal(held.tone, "neutral");
  assert.doesNotMatch(held.message, /verify/i);
  // Every other status reads the same.
  assert.deepEqual(
    policy.transactionView("withdrawal", "IN_REVIEW", true),
    policy.transactionView("withdrawal", "IN_REVIEW"),
  );
});

test("the self-exclusion payout only says paid back once Didit approved it", () => {
  assert.equal(policy.payoutView("APPROVED", null).headline, "paid back to your card");
  for (const status of ["IN_REVIEW", "DECLINED", "AWAITING_USER", "SOMETHING"])
    assert.doesNotMatch(policy.payoutView(status, null).headline, /paid back/);

  const review = policy.payoutView("IN_REVIEW", null);

  assert.equal(review.headline, "payout in review");
  assert.equal(review.label, "In review");
  assert.equal(review.message, "Withdrawal held for a quick review by our team.");

  // Declined or refused, the money is still in the closed account.
  const declined = policy.payoutView("DECLINED", null);

  assert.equal(declined.headline, "payout declined");
  assert.equal(declined.tone, "declined");
  assert.match(declined.message, /^Withdrawal declined\. .*contact support/);

  const refused = policy.payoutView(null, "The individual is in the blocklist");

  assert.equal(refused.headline, "payout refused");
  assert.equal(refused.label, "Refused");
  assert.match(refused.message, /^Refused by Didit: The individual is in the blocklist\. .*contact support/);
  assert.match(policy.payoutView(null, "Not allowed.").message, /^Refused by Didit: Not allowed\. The/);
});

test("session statuses read in the player's words", () => {
  assert.match(policy.sessionView("age", "Approved").message, /18 or over/);
  assert.equal(policy.sessionView("kyc", "Declined").tone, "declined");
  assert.equal(policy.sessionView("age", "In Review").tone, "review");
  assert.equal(policy.sessionView("age", "Not Started").label, "Not finished");
  assert.equal(policy.sessionView("age", "Abandoned").label, "Abandoned");
  assert.ok(policy.isFinalSessionStatus("Approved"));
  assert.ok(!policy.isFinalSessionStatus("In Progress"));
});

test("console links point at the Console v2 routes", () => {
  const links = policy.consoleLinks({
    base: "https://business.staging.didit.me/",
    organizationId: "org",
    applicationId: "app",
  });

  assert.equal(
    links.transaction("t1"),
    "https://business.staging.didit.me/console/org/app/transactions/detail/t1",
  );
  assert.equal(
    links.session("s1"),
    "https://business.staging.didit.me/console/org/app/kyc/verifications/s1",
  );
  assert.equal(
    links.user("u1"),
    "https://business.staging.didit.me/console/org/app/users/u1",
  );
  assert.match(links.rules(), /\/transactions\/rules$/);
  assert.match(links.blocklist(), /\/lists\?kind=blocklist$/);
});

test("the rules only ever match this demo's players", () => {
  const rules = policy.ruleDefinitions({
    marketsListId: "markets",
    verifiedListId: "verified",
    kycWorkflowId: policy.KYC_WORKFLOW_ID,
  });

  assert.equal(rules.length, 4);
  assert.equal(new Set(rules.map((rule) => rule.title)).size, 4);
  for (const rule of rules) {
    assert.deepEqual(rule.conditions[0], {
      field: "subject_vendor_data",
      operator: "contains",
      value: policy.PLAYER_PREFIX,
    });
    assert.equal(rule.mode, "ACTIVE");
    assert.doesNotMatch(JSON.stringify(rule), /\u2014/);
  }
});

test("the step-up rule holds deposits for ID once the total reaches the threshold", () => {
  const [stepUp] = policy.ruleDefinitions({
    marketsListId: "markets",
    verifiedListId: "verified",
    kycWorkflowId: "kyc-workflow",
  });

  assert.equal(stepUp.title, policy.RULE_TITLES.kycStepUp);
  assert.deepEqual(stepUp.conditions.at(-1), {
    field: "subject_vendor_data",
    operator: "not_in",
    value: "verified",
    value_type: "list",
  });
  assert.deepEqual(stepUp.aggregation[0], {
    metric: "sum",
    field: "amount",
    operator: "gte",
    value: policy.KYC_THRESHOLD,
    window: policy.KYC_WINDOW,
    filters: {
      direction: "INBOUND",
      action_type: "deposit",
      subject_vendor_data: "__current__",
    },
  });
  assert.deepEqual(stepUp.actions[0], {
    type: "change_status",
    value: "AWAITING_USER",
    workflow_id: "kyc-workflow",
  });
});

test("status-changing rules never compete for the same action type", () => {
  const rules = policy.ruleDefinitions({
    marketsListId: "m",
    verifiedListId: "v",
    kycWorkflowId: "k",
  });
  const targets = rules
    .filter((rule) => rule.actions.some((action) => action.type === "change_status"))
    .map(
      (rule) =>
        rule.conditions.find((condition) => condition.field === "action_type")
          .value,
    );

  assert.deepEqual(targets.sort(), ["bonus_claim", "deposit", "withdrawal"]);
  const market = rules.find(
    (rule) => rule.title === policy.RULE_TITLES.unlicensedMarket,
  );

  assert.ok(market.actions.every((action) => action.type !== "change_status"));
});

test("lists: licensed markets as ISO-3 entries, verified players empty", () => {
  const [markets, verified] = policy.listDefinitions();

  assert.equal(markets.entry_type, "country");
  assert.deepEqual(
    markets.entries.map((entry) => entry.value),
    policy.LICENSED_MARKETS.map((market) => market.iso3),
  );
  assert.equal(verified.entry_type, "user");
  assert.deepEqual(verified.entries, []);
});

const record = (status, overrides = {}) => ({ id: overrides.id ?? status, status });
const item = (kind, amount, status, at = new Date(2026, 9, 13, 12).getTime()) => ({
  key: `${kind}-${amount}-${status}`,
  kind,
  amount,
  detail: null,
  at,
  record: status ? record(status) : null,
  error: status ? null : "refused",
});

test("the wallet only counts what Didit approved", () => {
  const now = new Date(2026, 9, 13, 18).getTime();
  const totals = ledger(
    [
      item("deposit", 250, "APPROVED"),
      item("deposit", 2000, "AWAITING_USER"),
      item("deposit", 10, null),
      item("bonus_claim", 20, "IN_REVIEW"),
      item("bet", 10, "APPROVED"),
      item("withdrawal", 50, "IN_REVIEW"),
      item("withdrawal", 30, "DECLINED"),
      item("deposit_limit", 100, "APPROVED"),
    ],
    now,
  );

  // 250 approved in, the held 2,000 and the held bonus are not spendable,
  // the bet and the withdrawal in review are already out.
  assert.equal(totals.balance, 190);
  // The step-up rule sums every recorded deposit, whatever its status.
  assert.equal(totals.depositedTotal, 2250);
  assert.equal(totals.depositedToday, 2250);
  assert.equal(totals.bets, 1);
  assert.equal(totals.bonusClaimed, true);
});

test("yesterday's and declined deposits do not use today's limit", () => {
  const now = new Date(2026, 9, 13, 18).getTime();
  const totals = ledger(
    [
      item("deposit", 100, "APPROVED", now - 86400000),
      item("deposit", 40, "DECLINED", now),
      item("deposit", 60, "APPROVED", now),
    ],
    now,
  );

  assert.equal(totals.depositedToday, 60);
  assert.equal(totals.depositedTotal, 200);
});

test("only held and in-review transactions are re-read", () => {
  const open = openItems([
    item("deposit", 1, "AWAITING_USER"),
    item("bonus_claim", 1, "IN_REVIEW"),
    item("bet", 1, "APPROVED"),
    item("deposit", 1, null),
  ]);

  assert.deepEqual(
    open.map((entry) => entry.kind),
    ["deposit", "bonus_claim"],
  );
});

test("money is formatted in euros", () => {
  assert.equal(policy.formatMoney(2000), "2,000.00 EUR");
  assert.equal(policy.formatMoney(12.5), "12.50 EUR");
});
