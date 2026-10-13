/**
 * Kestrel's money movement, expressed as Didit transactions.
 *
 * Kestrel is the fictional crypto exchange at /crypto-exchange. Every deposit
 * and withdrawal it shows is a real transaction on the Didit transactions API:
 *
 * - A deposit is reported by the exchange's BACKEND once the chain confirms it
 *   (`POST /v3/transactions/`, API key). No end user is present for that, so the
 *   SDK path would be the wrong integration.
 * - A withdrawal is requested by the user on their device, so it goes through
 *   the web SDK (`DiditSdk.shared.submitTransaction`, `POST /v1/transactions/`)
 *   with a token the backend minted for that user. Device intelligence comes
 *   along for free and the subject is bound to the token server-side.
 *
 * Both end up as the same camelCase wire payload and the same transaction
 * record. The module is self-contained (no local imports) so the unit tests
 * can load it with plain `node --test`.
 *
 * https://docs.didit.me/transaction-monitoring/sdk-transaction-submission
 */

import type { DiditTransactionPayload } from "@didit-protocol/sdk-web";

/** Stamped on every Kestrel transaction as `props.demo_app`, so the demo's rules
 * (see lib/crypto-exchange/policy.ts) can never touch another demo's traffic. */
export const CX_DEMO_APP = "crypto-exchange";

export const CX_ASSET = "ETH";
export const CX_CHAIN = "ETH";

/**
 * A wallet OFAC lists under the Lazarus Group (the 2022 Ronin bridge theft).
 * Public sanctions data, so it is safe to ship: on the staging application Merkle
 * Science scores it 95 / CRITICAL with a direct sanctions attribution.
 */
export const SANCTIONED_WALLET = "0x098B716B8Aaf21512996dC57EB0615e2383E2f96";

export const AMOUNT_MIN = 0.01;
export const AMOUNT_MAX = 5;

export type DepositSource = "own-wallet" | "unknown-sender";
export type WithdrawalDestination = "own-wallet" | "exchange" | "address";

export interface CxWallets {
  /** The user's own self-hosted wallet (MetaMask in the story). */
  ownWallet: string;
  /** The user's deposit address at another exchange. */
  exchangeDeposit: string;
}

/** A fresh 20-byte address: never seen on chain, so it screens as no risk. */
export function randomEvmAddress(randomBytes: (size: number) => Uint8Array) {
  const bytes = randomBytes(20);

  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
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

/** The camelCase wire payload `POST /v3/transactions/` and `/v1/` accept. */
export interface WireParticipant {
  type?: string;
  externalUserId?: string;
  fullName?: string;
  paymentMethod?: { type: string; accountId: string };
}

export interface WirePayload {
  txnId: string;
  type: string;
  info: {
    direction: "in" | "out";
    amount: string;
    currency: string;
    currencyType: "crypto";
    type: "deposit" | "withdrawal";
    cryptoParams: { crypto_chain: string };
    paymentDetails?: string;
  };
  subject: WireParticipant;
  counterparty?: WireParticipant;
  props: Record<string, string>;
  includeCryptoScreening: true;
}

/**
 * The deposit the exchange's backend reports once the chain confirms it.
 *
 * The sending wallet is the counterparty's payment method, which is the
 * address Didit screens on an inbound crypto transfer. `unknown-sender` is the
 * sanctioned wallet above; the sender's name is unknown, as it would be.
 */
export function buildDepositPayload(input: {
  txnId: string;
  vendorData: string;
  fullName: string;
  amount: string;
  source: DepositSource;
  ownWallet: string;
}): WirePayload {
  const own = input.source === "own-wallet";

  return {
    txnId: input.txnId,
    type: "finance",
    info: {
      direction: "in",
      amount: input.amount,
      currency: CX_ASSET,
      currencyType: "crypto",
      type: "deposit",
      cryptoParams: { crypto_chain: CX_CHAIN },
      paymentDetails: own ? "Deposit from own wallet" : "Deposit from unknown sender",
    },
    subject: {
      type: "individual",
      externalUserId: input.vendorData,
      fullName: input.fullName,
    },
    counterparty: {
      type: "individual",
      ...(own ? { fullName: input.fullName } : {}),
      paymentMethod: {
        type: own ? "unhosted_wallet" : "crypto_wallet",
        accountId: own ? input.ownWallet : SANCTIONED_WALLET,
      },
    },
    props: { demo_app: CX_DEMO_APP, deposit_source: input.source },
    includeCryptoScreening: true,
  };
}

/**
 * The withdrawal the user requests on their device, as a Travel Rule transfer,
 * in the web SDK's own payload shape (`submitTransaction` maps it onto the wire
 * format above).
 *
 * - `own-wallet` declares the destination self-hosted (`unhosted_wallet`), so
 *   Didit skips VASP routing and asks for proof that the wallet is the user's.
 * - `exchange` is the user's account at another exchange: Didit walks the
 *   Travel Rule rails to find that exchange. The beneficiary VASP is deliberately
 *   NOT named here - a name or LEI resolved in the directory can select the email
 *   rail, and a demo must never email a real exchange's compliance team.
 * - `address` is any address the user pastes, owned by `beneficiaryName`.
 *
 * The subject's identity is not in the payload: the SDK token binds it.
 */
export function buildWithdrawalPayload(input: {
  txnId: string;
  fullName: string;
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
      currency: CX_ASSET,
      currencyType: "crypto",
      actionType: "withdrawal",
      cryptoParams: { crypto_chain: CX_CHAIN },
    },
    subject: { type: "individual", fullName: input.fullName },
    counterparty: {
      type: "individual",
      fullName: beneficiary,
      paymentMethod: {
        type: input.destination === "own-wallet" ? "unhosted_wallet" : "crypto_wallet",
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
  value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
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

export function depositOutcome(view: Pick<TransactionView, "status">): DepositOutcome {
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
  return STATUS_LABEL[status] ?? (status ? status.replace(/_/g, " ").toLowerCase() : "Unknown");
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
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
