/**
 * Kestrel's money movement, expressed as Didit transactions.
 *
 * Kestrel is the fictional crypto exchange at /crypto-exchange. Every deposit
 * and withdrawal it shows is a real transaction on the Didit transactions API,
 * submitted from the user's browser with the web SDK
 * (`submitTransaction`, `POST /v1/transactions/`) and a token Kestrel's
 * server minted for that user, so the signals device data rides along and
 * the subject is bound to the token server-side:
 *
 * - A deposit names the sending wallet, which Didit screens.
 * - A withdrawal is a Travel Rule transfer to the destination wallet.
 *
 * The module is self-contained (no local imports) so the unit tests can load
 * it with plain `node --test`.
 *
 * https://docs.didit.me/transaction-monitoring/sdk-transaction-submission
 */

import type { DiditTransactionPayload } from "@didit-protocol/sdk-web";

/** Stamped on every Kestrel transaction as `props.demo_app`, so the demo's rules
 * (see lib/crypto-exchange/policy.ts) can never touch another demo's traffic. */
export const CX_DEMO_APP = "crypto-exchange";

/** The two assets Kestrel moves, each on its own chain. */
export const ASSETS = {
  BTC: { name: "Bitcoin", chain: "BTC", network: "Bitcoin" },
  ETH: { name: "Ethereum", chain: "ETH", network: "Ethereum" },
} as const;

export type Asset = keyof typeof ASSETS;

export const isAsset = (value: unknown): value is Asset =>
  value === "BTC" || value === "ETH";

/**
 * A wallet OFAC lists under the Lazarus Group (the 2022 Ronin bridge theft).
 * Public sanctions data, so it is safe to ship: on the staging application
 * wallet screening scores it 95 / CRITICAL with a direct sanctions attribution.
 */
export const SANCTIONED_WALLET = "0x098B716B8Aaf21512996dC57EB0615e2383E2f96";

export const AMOUNT_MIN = 0.01;
export const AMOUNT_MAX = 5;

export type DepositSource = "own-wallet" | "unknown-sender";
export type WithdrawalDestination = "own-wallet" | "address";

/** The user's own self-hosted wallets, one per asset. */
export type CxWallets = Record<Asset, string>;

/** A fresh 20-byte address: never seen on chain, so it screens as no risk. */
export function randomEvmAddress(randomBytes: (size: number) => Uint8Array) {
  const bytes = randomBytes(20);

  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let check = 1;

  for (const value of values) {
    const top = check >>> 25;

    check = ((check & 0x1ffffff) << 5) ^ value;
    for (let bit = 0; bit < 5; bit++) {
      if ((top >>> bit) & 1) check ^= BECH32_GEN[bit];
    }
  }

  return check;
}

/**
 * A fresh native SegWit (P2WPKH, `bc1q…`) address from 20 random bytes, with
 * a valid bech32 checksum: never seen on chain, so it screens as no risk.
 */
export function randomBtcAddress(randomBytes: (size: number) => Uint8Array) {
  const words: number[] = [0];
  let accumulator = 0;
  let bits = 0;

  for (const byte of Array.from(randomBytes(20))) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      words.push((accumulator >> bits) & 31);
    }
  }
  if (bits > 0) words.push((accumulator << (5 - bits)) & 31);
  const prefix = [3, 3, 0, 2, 3]; // "bc" expanded for the checksum
  const mod = bech32Polymod([...prefix, ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = [0, 1, 2, 3, 4, 5].map(
    (index) => (mod >> (5 * (5 - index))) & 31,
  );

  return `bc1${[...words, ...checksum].map((word) => BECH32[word]).join("")}`;
}

export function randomWallets(
  randomBytes: (size: number) => Uint8Array,
): CxWallets {
  return {
    BTC: randomBtcAddress(randomBytes),
    ETH: randomEvmAddress(randomBytes),
  };
}

export function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export function isBtcAddress(value: string): boolean {
  return /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(
    value.trim(),
  );
}

/** Whether an address belongs on the asset's chain. */
export function isAddressFor(asset: Asset, value: string): boolean {
  return asset === "BTC" ? isBtcAddress(value) : isEvmAddress(value);
}

/** Normalises user input into an amount string, or null when out of range. */
export function parseAmount(value: string): string | null {
  const trimmed = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) return null;
  const amount = Number(trimmed);

  if (!Number.isFinite(amount) || amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    return null;
  }

  return String(amount);
}

export function newTxnId(kind: "dep" | "wd", uuid: string): string {
  return `kestrel-${kind}-${uuid}`;
}

/* ── Payloads ───────────────────────────────────────────────────────────── */

/**
 * A deposit, in the web SDK's payload shape.
 *
 * The sending wallet is the counterparty's payment method, which is the
 * address Didit screens on an inbound crypto transfer. `unknown-sender` is
 * the sanctioned wallet above (an ETH address, so ETH only); the sender's
 * name is unknown, as it would be. The subject's identity is not in the
 * payload: the SDK token binds it.
 */
export function buildDepositPayload(input: {
  txnId: string;
  fullName: string;
  asset: Asset;
  amount: string;
  source: DepositSource;
  ownWallet: string;
}): DiditTransactionPayload {
  const own = input.source === "own-wallet" || input.asset !== "ETH";

  return {
    txnId: input.txnId,
    category: "finance",
    details: {
      direction: "in",
      amount: input.amount,
      currency: input.asset,
      currencyType: "crypto",
      actionType: "deposit",
      cryptoParams: { crypto_chain: ASSETS[input.asset].chain },
      paymentDetails: own
        ? "Deposit from own wallet"
        : "Deposit from unknown sender",
    },
    subject: { type: "individual", fullName: input.fullName },
    counterparty: {
      type: "individual",
      ...(own ? { fullName: input.fullName } : {}),
      paymentMethod: {
        type: own ? "unhosted_wallet" : "crypto_wallet",
        accountId: own ? input.ownWallet : SANCTIONED_WALLET,
      },
    },
    customProperties: {
      demo_app: CX_DEMO_APP,
      deposit_source: own ? "own-wallet" : "unknown-sender",
    },
    includeCryptoScreening: true,
  };
}

/**
 * The withdrawal the user requests on their device, as a Travel Rule transfer,
 * in the web SDK's own payload shape.
 *
 * - `own-wallet` declares the destination self-hosted (`unhosted_wallet`), so
 *   Didit skips VASP routing and asks for proof that the wallet is the user's.
 * - `address` is any address the user pastes. The beneficiary VASP is
 *   deliberately never named: a name or LEI resolved in the directory can
 *   select the email rail, and a demo must never email a real exchange's
 *   compliance team.
 *
 * The subject's identity is not in the payload: the SDK token binds it.
 */
export function buildWithdrawalPayload(input: {
  txnId: string;
  fullName: string;
  asset: Asset;
  amount: string;
  destination: WithdrawalDestination;
  address: string;
  beneficiaryName: string;
}): DiditTransactionPayload {
  const beneficiary = input.beneficiaryName.trim() || input.fullName;
  const address = input.address.trim();

  return {
    txnId: input.txnId,
    category: "travelRule",
    details: {
      direction: "out",
      amount: input.amount,
      currency: input.asset,
      currencyType: "crypto",
      actionType: "withdrawal",
      cryptoParams: { crypto_chain: ASSETS[input.asset].chain },
    },
    subject: { type: "individual", fullName: input.fullName },
    counterparty: {
      type: "individual",
      fullName: beneficiary,
      paymentMethod: {
        type:
          input.destination === "own-wallet"
            ? "unhosted_wallet"
            : "crypto_wallet",
        accountId: address,
      },
    },
    customProperties: {
      demo_app: CX_DEMO_APP,
      withdrawal_destination: input.destination,
    },
    travelRule: {
      // Ignored once Travel Rule is enabled: Didit drives the exchange itself.
      status: "AWAITING_COUNTERPARTY",
      originatorData: { name: input.fullName },
      beneficiaryData: { name: beneficiary, wallet_address: address },
    },
    includeCryptoScreening: true,
  };
}

/* ── The trimmed view the demo's own API routes return ─────────────────── */

export interface ScreeningView {
  provider: string;
  riskScore: number | null;
  severity: string | null;
  status: string | null;
  summary: string | null;
  riskFactors: string[];
  sanctionsHit: boolean;
  walletSanctioned: boolean;
}

export interface RuleRunView {
  title: string;
  isTest: boolean;
  statusTarget: string | null;
  actions: string | null;
  scoreDelta: number;
}

export interface TravelRuleView {
  status: string;
  required: boolean;
}

export interface ActionView {
  type: "wallet_ownership" | "verification_session";
  url: string;
  sessionId: string | null;
  expiresAt: string | null;
}

export interface TimelineEntry {
  title: string;
  status: string | null;
  at: string;
}

export interface TransactionView {
  id: string;
  txnId: string;
  kind: "deposit" | "withdrawal";
  category: string;
  status: string;
  amount: string;
  currency: string;
  usdValue: string | null;
  score: number;
  decisionReason: string | null;
  wallet: string | null;
  walletType: string | null;
  screening: ScreeningView | null;
  rules: RuleRunView[];
  travelRule: TravelRuleView | null;
  action: ActionView | null;
  stepUp: { sessionId: string; status: string } | null;
  timeline: TimelineEntry[];
}

type Raw = Record<string, unknown>;

const record = (value: unknown): Raw =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Raw)
    : {};
const list = (value: unknown): Raw[] =>
  Array.isArray(value) ? value.map(record) : [];
const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Reduces a Didit transaction detail (`GET /v3/transactions/{id}/`) to what
 * the demo renders.
 *
 * The full record carries the subject's device fingerprint, IP context and
 * session tokens. None of that is needed on screen, and none of it should sit
 * in a browser just because the demo could fetch it, so the view is an
 * allow-list: anything not copied here never leaves the server.
 */
export function toTransactionView(raw: Raw): TransactionView {
  const props = record(raw.props);
  const direction = text(raw.direction);
  const methods = list(raw.payment_methods);
  // The other side's wallet: the source of a deposit, the destination of a
  // withdrawal. It is the address the screening ran on.
  const otherSide = methods.find(
    (method) =>
      method.role === (direction === "INBOUND" ? "SOURCE" : "DESTINATION"),
  );
  const provider = list(raw.provider_results)[0];
  const travelRule = raw.travel_rule ? record(raw.travel_rule) : null;
  const action = raw.action_required ? record(raw.action_required) : null;
  const remediation = raw.remediation ? record(raw.remediation) : null;
  const actionType = text(action?.type);

  return {
    id: String(raw.uuid ?? ""),
    txnId: String(raw.txn_id ?? ""),
    kind: direction === "INBOUND" ? "deposit" : "withdrawal",
    category: String(raw.transaction_type ?? ""),
    status: String(raw.status ?? ""),
    amount: String(raw.amount ?? ""),
    currency: String(raw.currency ?? ""),
    usdValue:
      text(raw.preferred_currency_code) === "USD"
        ? text(raw.preferred_currency_amount)
        : null,
    score: num(raw.score) ?? 0,
    decisionReason: text(raw.decision_reason_label),
    wallet: text(otherSide?.account_id),
    walletType: text(otherSide?.payment_method_type),
    screening: provider
      ? {
          provider: String(provider.provider ?? ""),
          riskScore: num(provider.score) ?? num(props.wallet_risk_score),
          severity: text(provider.severity),
          status: text(provider.status),
          summary: text(provider.summary),
          riskFactors: Array.isArray(props.aml_risk_factors)
            ? props.aml_risk_factors.filter(
                (factor): factor is string => typeof factor === "string",
              )
            : [],
          sanctionsHit: props.sanctions_hit === true,
          walletSanctioned: props.wallet_sanctioned === true,
        }
      : null,
    rules: list(raw.rule_runs)
      .filter((run) => run.matched !== false)
      .map((run) => ({
        title: String(run.rule_title ?? ""),
        isTest: run.is_test === true,
        statusTarget: text(run.status_target),
        actions: text(run.action_summary),
        scoreDelta: num(run.score_delta) ?? 0,
      })),
    travelRule: travelRule
      ? {
          status: String(travelRule.status ?? ""),
          required: travelRule.required === true,
        }
      : null,
    action:
      action &&
      (actionType === "wallet_ownership" ||
        actionType === "verification_session") &&
      text(action.url)
        ? {
            type: actionType,
            url: String(action.url),
            sessionId: text(action.session_id),
            expiresAt: text(action.expires_at),
          }
        : null,
    stepUp:
      remediation && text(remediation.session_id)
        ? {
            sessionId: String(remediation.session_id),
            status: String(remediation.status ?? ""),
          }
        : null,
    timeline: list(raw.activities)
      .map((activity) => ({
        title: activityTitle(activity),
        status: text(activity.status),
        at: String(activity.occurred_at ?? ""),
      }))
      .sort((a, b) => a.at.localeCompare(b.at)),
  };
}

const ACTIVITY_TITLES: Record<string, string> = {
  TRANSACTION_CREATED: "Transaction received",
  TRANSACTION_STATUS_UPDATED: "Status changed",
  TRANSACTION_BLOCKLIST_HIT: "Blocklist match",
};

function activityTitle(activity: Raw): string {
  const type = String(activity.activity_type ?? "");

  return (
    ACTIVITY_TITLES[type] ??
    text(activity.title) ??
    type.toLowerCase().replace(/_/g, " ")
  );
}

/* ── What the exchange does with a decision ─────────────────────────────── */

export type Tone = "approved" | "review" | "declined" | "neutral";

/** Travel Rule outcomes after which the exchange may broadcast the transfer. */
const TRAVEL_RULE_CLEARED = ["COMPLETED", "FINISHED", "NOT_APPLICABLE"];

export type DepositOutcome = "credited" | "frozen" | "review" | "pending";

export function depositOutcome(
  view: Pick<TransactionView, "status">,
): DepositOutcome {
  switch (view.status) {
    case "APPROVED":
      return "credited";
    case "DECLINED":
      return "frozen";
    case "IN_REVIEW":
      return "review";
    default:
      return "pending";
  }
}

export type WithdrawalStage =
  | "blocked"
  | "review"
  | "prove-ownership"
  | "step-up"
  | "step-up-unavailable"
  | "awaiting-counterparty"
  | "travel-rule-stuck"
  | "ready";

/**
 * Where a withdrawal stands, from the exchange's point of view.
 *
 * Order matters. A declined or reviewed transfer stops there: Didit may still
 * have minted a wallet-ownership widget for it, but asking a user to prove they
 * own a wallet the exchange already refused is the wrong prompt, so the demo
 * submits with `autoLaunchAction: false` and decides here instead.
 */
export function withdrawalStage(
  view: Pick<TransactionView, "status" | "action" | "travelRule">,
): WithdrawalStage {
  if (view.status === "DECLINED") return "blocked";
  if (view.status === "IN_REVIEW") return "review";
  if (view.action?.type === "wallet_ownership") return "prove-ownership";
  if (view.status === "AWAITING_USER") {
    return view.action?.type === "verification_session"
      ? "step-up"
      : "step-up-unavailable";
  }

  const travelRule = view.travelRule?.status;

  if (!travelRule || TRAVEL_RULE_CLEARED.includes(travelRule)) return "ready";
  if (travelRule === "AWAITING_COUNTERPARTY") return "awaiting-counterparty";

  return "travel-rule-stuck";
}

/** Funds a withdrawal still holds: everything but a blocked transfer. */
export function withdrawalHoldsFunds(stage: WithdrawalStage): boolean {
  return stage !== "blocked";
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "DECLINED":
      return "declined";
    case "IN_REVIEW":
    case "AWAITING_USER":
      return "review";
    default:
      return "neutral";
  }
}

export const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Approved",
  IN_REVIEW: "In review",
  DECLINED: "Declined",
  AWAITING_USER: "Awaiting user",
};

export function statusLabel(status: string): string {
  return (
    STATUS_LABEL[status] ??
    (status ? status.replace(/_/g, " ").toLowerCase() : "Unknown")
  );
}

/** Merkle Science-style 0-100 score into the band the UI colours. */
export function riskBand(score: number | null): { label: string; tone: Tone } {
  if (score === null) return { label: "Not screened", tone: "neutral" };
  if (score >= 75) return { label: "Severe risk", tone: "declined" };
  if (score >= 40) return { label: "Elevated risk", tone: "review" };

  return { label: "Low risk", tone: "approved" };
}

export const TRAVEL_RULE_LABEL: Record<string, string> = {
  AWAITING_COUNTERPARTY: "Waiting for the other exchange",
  UNCONFIRMED_OWNERSHIP: "Wallet ownership not proven yet",
  COUNTERPARTY_VASP_NOT_FOUND: "Receiving exchange not found",
  COUNTERPARTY_VASP_NOT_REACHABLE: "Receiving exchange not reachable",
  COUNTERPARTY_MISMATCHED_DATA: "Beneficiary name mismatch",
  COUNTERPARTY_VASP_GENERAL_DECLINE: "Declined by the other exchange",
  NOT_ENOUGH_COUNTERPARTY_DATA: "Not enough beneficiary data",
  ON_HOLD: "On hold",
  COMPLETED: "Exchange completed",
  FINISHED: "Finished",
  NOT_APPLICABLE: "Below threshold",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export function travelRuleLabel(status: string): string {
  return TRAVEL_RULE_LABEL[status] ?? status.replace(/_/g, " ").toLowerCase();
}

export function shortAddress(address: string): string {
  return address.length > 14
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}
