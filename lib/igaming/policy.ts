/**
 * Aurora Play's risk policy: the fictional iGaming operator behind /igaming.
 *
 * One file holds every number the demo enforces (the deposit level that asks
 * for ID, the licensed markets, the welcome bonus), the Didit rules and lists
 * that enforce them, and how a Didit status reads to a player. The page, the
 * server routes and `scripts/igaming-setup.mjs` all read it from here, so the
 * rule installed in the console and the copy on screen can never disagree.
 *
 * Its only import is the shared demo config, by relative path: `npm test` and
 * the setup script load it straight from Node, which strips the types but does
 * not resolve `@/` paths.
 */

import { auroraPlay } from "../didit/demos.ts";

export const OPERATOR_NAME = auroraPlay.brand.name;

/**
 * Every player this demo creates has a `vendor_data` with this prefix. The
 * rules below only match it, so they never touch another demo's transactions
 * on the same application.
 */
export const PLAYER_PREFIX = auroraPlay.vendorPrefix;

export const CURRENCY = "EUR";

/** Cumulative deposits in the window that trigger the ID verification step-up. */
export const KYC_THRESHOLD = 2000;
export const KYC_WINDOW = "30d";

export const WELCOME_BONUS = 20;

/** The same adaptive age workflow the catalogue's "Adaptive age check" runs. */
export const AGE_WORKFLOW_ID = auroraPlay.workflows.age;

/** The catalogue's "Core KYC" workflow: ID, liveness, face match, IP. */
export const KYC_WORKFLOW_ID = auroraPlay.workflows.kyc;

export interface LicensedMarket {
  code: string;
  /** Didit stores country list entries as ISO-3. */
  iso3: string;
  name: string;
  regulator: string;
}

export const LICENSED_MARKETS: LicensedMarket[] = [
  { code: "ES", iso3: "ESP", name: "Spain", regulator: "DGOJ" },
  { code: "GB", iso3: "GBR", name: "United Kingdom", regulator: "UKGC" },
  { code: "IT", iso3: "ITA", name: "Italy", regulator: "ADM" },
  { code: "NL", iso3: "NLD", name: "Netherlands", regulator: "KSA" },
  { code: "DE", iso3: "DEU", name: "Germany", regulator: "GGL" },
  { code: "SE", iso3: "SWE", name: "Sweden", regulator: "Spelinspektionen" },
  { code: "DK", iso3: "DNK", name: "Denmark", regulator: "Spillemyndigheden" },
  { code: "MT", iso3: "MLT", name: "Malta", regulator: "MGA" },
];

export function licensedMarket(
  countryCode: string | null | undefined,
): LicensedMarket | null {
  if (!countryCode) return null;
  const code = countryCode.trim().toUpperCase();

  return LICENSED_MARKETS.find((market) => market.code === code) ?? null;
}

/* ── Player ids and transaction ids ─────────────────────────────────── */

export function isPlayerId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    new RegExp(`^${PLAYER_PREFIX}[A-Za-z0-9_-]{6,80}$`).test(value)
  );
}

export type CashierKind =
  "deposit" | "withdrawal" | "bet" | "bonus_claim" | "deposit_limit";

/** Unique per application, readable in the console's transaction list. */
export function newTxnId(playerId: string, kind: CashierKind, now: number) {
  const suffix = playerId.slice(PLAYER_PREFIX.length, PLAYER_PREFIX.length + 8);

  return `ap-${kind.replace("_", "-")}-${suffix}-${now.toString(36)}`;
}

/* ── What the SDK submits ───────────────────────────────────────────── */

export interface CashierRequest {
  kind: CashierKind;
  amount: number;
  playerName: string;
  /** A label for the bet or bonus, stored on the transaction's props. */
  detail?: string;
}

export interface SdkTransactionPayload {
  txnId: string;
  category: string;
  details: {
    direction: "in" | "out";
    amount: string;
    currency: string;
    actionType: string;
    paymentDetails?: string;
  };
  subject: { fullName: string };
  customProperties: Record<string, string>;
}

const CATEGORY: Record<CashierKind, string> = {
  deposit: "finance",
  withdrawal: "finance",
  bet: "gamblingBet",
  bonus_claim: "gamblingBonusChange",
  deposit_limit: "gamblingLimitChange",
};

const DIRECTION: Record<CashierKind, "in" | "out"> = {
  deposit: "in",
  withdrawal: "out",
  bet: "out",
  bonus_claim: "in",
  deposit_limit: "in",
};

/**
 * The `submitTransaction` payload for one cashier action.
 *
 * There is no `vendor_data` and no device data in here on purpose: the device
 * lane forces the subject from the transaction token and attaches the IP,
 * user agent and fingerprint server-side. No payment account id either - the
 * demo application has a "sender differs from receiver" rule that would hold
 * every one-sided payment.
 */
export function buildCashierPayload(
  request: CashierRequest,
  playerId: string,
  now: number,
): SdkTransactionPayload {
  return {
    txnId: newTxnId(playerId, request.kind, now),
    category: CATEGORY[request.kind],
    details: {
      direction: DIRECTION[request.kind],
      amount: request.amount.toFixed(2),
      currency: CURRENCY,
      actionType: request.kind,
      ...(request.kind === "deposit" || request.kind === "withdrawal"
        ? { paymentDetails: "Card (demo)" }
        : {}),
    },
    subject: { fullName: request.playerName },
    customProperties: {
      operator: OPERATOR_NAME,
      ...(request.detail ? { detail: request.detail } : {}),
    },
  };
}

/* ── Deposits towards the ID verification step-up ───────────────────── */

export interface DepositProgress {
  total: number;
  remaining: number;
  ratio: number;
  crossed: boolean;
}

export function depositProgress(total: number): DepositProgress {
  const safe = Math.max(0, total);

  return {
    total: safe,
    remaining: Math.max(0, KYC_THRESHOLD - safe),
    ratio: Math.min(1, safe / KYC_THRESHOLD),
    crossed: safe >= KYC_THRESHOLD,
  };
}

/** What is left of a daily deposit limit, or null when none is set. */
export function limitHeadroom(
  limit: number | null,
  depositedToday: number,
): number | null {
  if (limit === null) return null;

  return Math.max(0, limit - depositedToday);
}

/* ── Statuses, as a player reads them ───────────────────────────────── */

export type Tone = "approved" | "review" | "declined" | "neutral" | "info";

export interface StatusView {
  label: string;
  tone: Tone;
  message: string;
}

const KIND_NOUN: Record<CashierKind, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  bet: "Bet",
  bonus_claim: "Bonus",
  deposit_limit: "Deposit limit",
};

const APPROVED_MESSAGE: Partial<Record<CashierKind, string>> = {
  bet: "Bet placed. It settles when the match ends.",
  bonus_claim: "Bonus credited to your balance.",
  deposit_limit: "Your new limit applies from now.",
};

/**
 * A transaction status from `/v1/transactions/`, in the player's words. A
 * self-excluded player is never asked to verify a held deposit: it simply
 * stays uncredited.
 */
export function transactionView(
  kind: CashierKind,
  status: string,
  selfExcluded = false,
): StatusView {
  const noun = KIND_NOUN[kind];

  switch (status.trim().toUpperCase()) {
    case "APPROVED":
      return {
        label: "Approved",
        tone: "approved",
        message: APPROVED_MESSAGE[kind] ?? `${noun} approved.`,
      };
    case "AWAITING_USER":
      if (selfExcluded)
        return {
          label: "On hold",
          tone: "neutral",
          message: `${noun} on hold and never credited while you are self-excluded.`,
        };

      return {
        label: "Verify your ID",
        tone: "info",
        message: `${noun} on hold until you verify your identity.`,
      };
    case "IN_REVIEW":
      return {
        label: "In review",
        tone: "review",
        message:
          kind === "bonus_claim"
            ? "Bonus held: our team reviews it before it is credited."
            : `${noun} held for a quick review by our team.`,
      };
    case "DECLINED":
      return {
        label: "Declined",
        tone: "declined",
        message: `${noun} declined.`,
      };
    default:
      return {
        label: status || "Unknown",
        tone: "neutral",
        message: `${noun} status: ${status || "unknown"}.`,
      };
  }
}

export type CheckKind = "age" | "kyc";

/** A verification session status, in the player's words. */
export function sessionView(kind: CheckKind, status: string): StatusView {
  const subject = kind === "age" ? "age check" : "ID verification";
  const s = status.trim().toLowerCase();

  if (s === "approved")
    return {
      label: "Approved",
      tone: "approved",
      message:
        kind === "age"
          ? "You're 18 or over. Welcome in."
          : "Identity verified. Your deposit can go through.",
    };
  if (s === "declined")
    return {
      label: "Declined",
      tone: "declined",
      message:
        kind === "age"
          ? "We couldn't confirm you're 18 or over, so we can't open an account."
          : "We couldn't verify your identity. The deposit stays on hold.",
    };
  if (s === "in review")
    return {
      label: "In review",
      tone: "review",
      message: `Your ${subject} is with our team. We'll email you when it's done.`,
    };
  if (["not started", "in progress", "resubmitted"].includes(s))
    return {
      label: "Not finished",
      tone: "neutral",
      message: `Your ${subject} isn't finished yet. Pick it up where you left it.`,
    };
  if (["abandoned", "expired", "kyc expired"].includes(s))
    return {
      label: status,
      tone: "neutral",
      message: `This ${subject} closed before it finished. Start a new one.`,
    };

  return {
    label: status || "Unknown",
    tone: "neutral",
    message: `Your ${subject} returned "${status || "unknown"}".`,
  };
}

export function isFinalSessionStatus(status: string): boolean {
  return ["approved", "declined", "in review"].includes(
    status.trim().toLowerCase(),
  );
}

/* ── The operator side: Console v2 deep links ───────────────────────── */

export interface ConsoleContext {
  base: string;
  organizationId: string;
  applicationId: string;
}

export function consoleLinks(context: ConsoleContext) {
  const root = `${context.base.replace(/\/$/, "")}/console/${context.organizationId}/${context.applicationId}`;

  return {
    session: (sessionId: string) => `${root}/kyc/verifications/${sessionId}`,
    transaction: (uuid: string) => `${root}/transactions/detail/${uuid}`,
    /** The user detail page takes Didit's internal id, not `vendor_data`. */
    user: (diditInternalId: string) => `${root}/users/${diditInternalId}`,
    rules: () => `${root}/transactions/rules`,
    lists: () => `${root}/lists`,
    blocklist: () => `${root}/lists?kind=blocklist`,
  };
}

/* ── The Didit rules and lists that enforce all of the above ────────── */

export const LIST_NAMES = {
  markets: "Aurora Play demo: licensed markets",
  verified: "Aurora Play demo: ID-verified players",
} as const;

export const RULE_TITLES = {
  bonusSharedDevice: "Aurora Play demo: bonus claimed on a shared device",
  kycStepUp: "Aurora Play demo: ID verification at 2,000 EUR deposited",
  unlicensedMarket: "Aurora Play demo: cashier used outside licensed markets",
  withdrawalWithoutPlay: "Aurora Play demo: withdrawal with no play",
} as const;

/**
 * How the server and the setup script find those lists by name. `GET
 * /v3/lists/` pages with `limit` (50 by default, newest first), so on a shared
 * application with many lists an unfiltered first page can miss them.
 */
export const LISTS_QUERY = "?list_type=custom&limit=1000";

export interface ListDefinition {
  name: string;
  description: string;
  list_type: "custom";
  entry_type: "country" | "user";
  entries: { value: string; display_label: string }[];
}

export function listDefinitions(): ListDefinition[] {
  return [
    {
      name: LIST_NAMES.markets,
      description: `Countries ${OPERATOR_NAME} holds a licence in. The cashier rule adds risk score to activity from anywhere else.`,
      list_type: "custom",
      entry_type: "country",
      entries: LICENSED_MARKETS.map((market) => ({
        value: market.iso3,
        display_label: `${market.name} (${market.regulator})`,
      })),
    },
    {
      name: LIST_NAMES.verified,
      description: `Players who passed ID verification at the ${KYC_THRESHOLD} ${CURRENCY} deposit step-up. Added by the demo's server once the session is Approved.`,
      list_type: "custom",
      entry_type: "user",
      entries: [],
    },
  ];
}

export interface RuleDefinition {
  title: string;
  description: string;
  category: string;
  mode: "ACTIVE";
  evaluation_mode: "ALL";
  scope: Record<string, never>;
  conditions: Record<string, unknown>[];
  aggregation: Record<string, unknown>[];
  actions: Record<string, unknown>[];
}

export interface RuleContext {
  marketsListId: string;
  verifiedListId: string;
  kycWorkflowId: string;
}

const demoPlayersOnly = {
  field: "subject_vendor_data",
  operator: "contains",
  value: PLAYER_PREFIX,
};

/**
 * The four custom rules the demo installs (`npm run igaming:setup`).
 *
 * Their status actions target different action types, so they never compete
 * for the same transaction's status: deposits can only go to AWAITING_USER,
 * bonus claims and withdrawals only to IN_REVIEW. The licensed-market rule
 * only adds score.
 */
export function ruleDefinitions(context: RuleContext): RuleDefinition[] {
  const base = {
    category: "igaming",
    mode: "ACTIVE" as const,
    evaluation_mode: "ALL" as const,
    scope: {},
  };

  return [
    {
      ...base,
      title: RULE_TITLES.kycStepUp,
      description: `Once a player's deposits reach ${KYC_THRESHOLD} ${CURRENCY} in ${KYC_WINDOW}, hold the deposit and ask for ID verification. Players on "${LIST_NAMES.verified}" are skipped.`,
      conditions: [
        demoPlayersOnly,
        { field: "direction", operator: "eq", value: "INBOUND" },
        { field: "action_type", operator: "eq", value: "deposit" },
        {
          field: "subject_vendor_data",
          operator: "not_in",
          value: context.verifiedListId,
          value_type: "list",
        },
      ],
      aggregation: [
        {
          metric: "sum",
          field: "amount",
          operator: "gte",
          value: KYC_THRESHOLD,
          window: KYC_WINDOW,
          filters: {
            direction: "INBOUND",
            action_type: "deposit",
            subject_vendor_data: "__current__",
          },
        },
      ],
      actions: [
        {
          type: "change_status",
          value: "AWAITING_USER",
          workflow_id: context.kycWorkflowId,
        },
        { type: "add_tags", tag_name: "KYC_STEP_UP" },
      ],
    },
    {
      ...base,
      title: RULE_TITLES.bonusSharedDevice,
      description:
        "A welcome bonus claimed by a second player on the same device fingerprint within 30 days is held for review. The classic multi-accounting pattern.",
      conditions: [
        demoPlayersOnly,
        { field: "action_type", operator: "eq", value: "bonus_claim" },
        {
          field: "subject_device_fingerprint",
          operator: "exists",
          value: true,
        },
      ],
      aggregation: [
        {
          metric: "distinct_count",
          field: "subject_vendor_data",
          operator: "gte",
          value: 2,
          window: "30d",
          filters: {
            action_type: "bonus_claim",
            subject_device_fingerprint: "__current__",
          },
        },
      ],
      actions: [
        { type: "add_score", value: 60 },
        { type: "change_status", value: "IN_REVIEW" },
        { type: "add_tags", tag_name: "BONUS_ABUSE" },
      ],
    },
    {
      ...base,
      title: RULE_TITLES.unlicensedMarket,
      description: `Cashier activity from an IP outside "${LIST_NAMES.markets}" adds risk score. With other signals it crosses the review threshold.`,
      conditions: [
        demoPlayersOnly,
        { field: "subject_ip_country", operator: "exists", value: true },
        {
          field: "subject_ip_country",
          operator: "not_in",
          value: context.marketsListId,
          value_type: "list",
        },
      ],
      aggregation: [],
      actions: [
        { type: "add_score", value: 40 },
        { type: "add_tags", tag_name: "UNLICENSED_MARKET" },
      ],
    },
    {
      ...base,
      title: RULE_TITLES.withdrawalWithoutPlay,
      description:
        "A withdrawal from a player with no bets in the last 30 days is held for review: deposit-and-withdraw is a bonus abuse and money laundering pattern.",
      conditions: [
        demoPlayersOnly,
        { field: "direction", operator: "eq", value: "OUTBOUND" },
        { field: "action_type", operator: "eq", value: "withdrawal" },
      ],
      aggregation: [
        {
          metric: "count",
          field: "amount",
          operator: "lt",
          value: 1,
          window: "30d",
          filters: { action_type: "bet", subject_vendor_data: "__current__" },
        },
      ],
      actions: [
        { type: "add_score", value: 30 },
        { type: "change_status", value: "IN_REVIEW" },
        { type: "add_tags", tag_name: "NO_PLAY_WITHDRAWAL" },
      ],
    },
  ];
}

/** Self-exclusion as the operator records it on the Didit user. */
export const SELF_EXCLUSION_REASON =
  "Self-excluded for 6 months at the player's request (Aurora Play demo).";

/**
 * The withdrawal that pays a self-excluding player's balance back, stored on
 * the transaction's props so the operator sees why it was made. It has to go
 * before the block: Didit refuses every transaction of a BLOCKED user.
 */
export const SELF_EXCLUSION_PAYOUT = "Balance payout on self-exclusion";

export interface PayoutView extends StatusView {
  /** What happened to the money, after the amount: "payout in review". */
  headline: string;
}

const PAYOUT_KEPT =
  "The money stays in your account: contact support to have it paid back.";

/**
 * That payout, in the player's words. Only an approved withdrawal is paid
 * back: a declined or refused one leaves the money in an account whose cashier
 * is closed, so the player is sent to support.
 */
export function payoutView(
  status: string | null,
  error: string | null,
): PayoutView {
  if (!status)
    return {
      headline: "payout refused",
      label: "Refused",
      tone: "declined",
      message: `Refused by Didit: ${(error ?? "no answer").trim().replace(/\.?$/, ".")} ${PAYOUT_KEPT}`,
    };
  const view = transactionView("withdrawal", status);

  switch (status.trim().toUpperCase()) {
    case "APPROVED":
      return { ...view, headline: "paid back to your card" };
    case "IN_REVIEW":
      return { ...view, headline: "payout in review" };
    case "DECLINED":
      return {
        ...view,
        headline: "payout declined",
        message: `${view.message} ${PAYOUT_KEPT}`,
      };
    default:
      return { ...view, headline: "payout pending" };
  }
}

const MONEY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "2,000.00 EUR", the way the casino's cashier writes money. */
export function formatMoney(amount: number): string {
  return `${MONEY.format(amount)} ${CURRENCY}`;
}
