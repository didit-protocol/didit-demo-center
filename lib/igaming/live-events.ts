import type { ActivityItem } from "./ledger";
import type { SessionSummary, TransactionRecord } from "./records";
import type { LiveInput } from "../didit/live";

import { CURRENCY, KYC_THRESHOLD, formatMoney } from "./policy";

/**
 * What Aurora Play pushes to the Didit live layer, built from the answers
 * Didit just gave: a verification decision, a transaction result, the
 * signals device read-out or an Authentication session. Pure, so `npm test`
 * pins every line the visitor reads.
 */

const NOUN: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  bet: "Bet",
  bonus_claim: "Bonus claim",
  deposit_limit: "Deposit limit",
};

/** "Aurora Play demo: ID verification at 2,000 EUR deposited" → the rule. */
export function ruleName(title: string): string {
  return title.replace(/^Aurora Play demo:\s*/i, "");
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function ageText(summary: SessionSummary): string {
  if (summary.estimatedAge !== null && summary.documentAge !== null)
    return `Estimated ${summary.estimatedAge}, ${summary.documentAge} on the ID`;
  if (summary.estimatedAge !== null) return `Estimated age ${summary.estimatedAge}`;
  if (summary.documentAge !== null) return `${summary.documentAge} on the ID`;

  return "Age confirmed";
}

export function checkStarted(check: "age" | "kyc"): LiveInput[] {
  if (check === "kyc") {
    return [
      {
        key: "kyc-start",
        tone: "ver",
        product: "verification",
        title: "ID check started",
        detail: "Core KYC workflow · web SDK modal",
        code: "startVerification({ url: action_required.url })",
      },
    ];
  }

  return [
    {
      key: "age-rule",
      tone: "txn",
      product: "transactions",
      title: "First bet waits",
      detail: "Rule: no bet before an approved age check",
      code: "POST /v3/transactions/sdk-token/ after the age check",
    },
    {
      key: "age-start",
      tone: "ver",
      product: "verification",
      title: "Age check started",
      detail: "Age estimation workflow · web SDK modal",
      code: "startVerification({ url }) · @didit-protocol/sdk-web",
    },
  ];
}

export function checkDecided(
  check: "age" | "kyc",
  summary: SessionSummary,
): LiveInput[] {
  const approved = summary.status === "Approved";
  const declined = summary.status === "Declined";
  const subject = check === "age" ? "Age check" : "ID check";
  const code = `GET /v3/session/${summary.sessionId.slice(0, 8)}…/decision/`;

  if (check === "kyc" && approved) {
    return [
      {
        key: "kyc-decided",
        tone: "ver",
        product: "verification",
        title: "ID verified",
        detail:
          [summary.fullName, summary.documentType, summary.documentCountry]
            .filter(Boolean)
            .join(" · ") || "ID, selfie and face match approved",
        code,
      },
    ];
  }

  return [
    {
      key: `${check}-decided`,
      tone: approved ? "ver" : declined ? "stop" : "hold",
      product: "verification",
      title: `${subject} ${summary.status.toLowerCase()}`,
      detail: approved
        ? ageText(summary)
        : declined
          ? "The account stays closed to deposits and bets"
          : "Nothing moves until it is finished",
      code,
    },
  ];
}

export interface TransactionContext {
  /** The player's name or email, as the feed names them. */
  person: string;
  /** Deposits Didit recorded before this one, for the 30-day total. */
  depositedBefore: number;
  /** The other account on this device, when there is one. */
  previous: string | null;
  accountsOnDevice: number;
}

/** A transaction result from `submitTransaction`, in the feed's words. */
export function transactionEvents(
  item: ActivityItem,
  context: TransactionContext,
): LiveInput[] {
  const noun = NOUN[item.kind] ?? capital(item.kind);
  const record = item.record;
  const code = `submitTransaction({ type: "${item.kind}", amount: ${item.amount} })`;

  if (!record) {
    return [
      {
        key: `txn-${item.key}`,
        tone: "stop",
        product: "transactions",
        title: `${noun} refused`,
        detail: item.error ?? "Didit did not accept the transaction",
        code,
      },
    ];
  }

  return recordEvents(record, item, context);
}

/** Every event one transaction record produces, keyed so updates replace them. */
export function recordEvents(
  record: TransactionRecord,
  item: Pick<ActivityItem, "kind" | "amount">,
  context: TransactionContext,
): LiveInput[] {
  const noun = NOUN[item.kind] ?? capital(item.kind);
  const key = `txn-${record.id}`;
  const money = formatMoney(record.amount || item.amount);
  const code = `submitTransaction({ type: "${item.kind}", amount: ${item.amount} })`;
  const hit = record.ruleHits[0];

  switch (record.status) {
    case "APPROVED":
      return [
        {
          key,
          tone: "txn",
          product: "transactions",
          title: `${noun} approved`,
          detail: `${money} · risk ${Math.round(record.score)} of 100`,
          code,
        },
      ];
    case "AWAITING_USER": {
      const total = context.depositedBefore + item.amount;

      return [
        {
          key: `${key}-next`,
          tone: "ver",
          product: "verification",
          title: "Next: ID and selfie",
          detail: `Core KYC workflow, prefilled for ${context.person}`,
        },
        {
          key: `${key}-rule`,
          tone: "txn",
          product: "transactions",
          title: hit ? `Rule hit: ${ruleName(hit.title)}` : "Rule hit",
          detail: `Deposits in 30 days reach ${KYC_THRESHOLD.toLocaleString("en-US")} ${CURRENCY}`,
        },
        {
          key,
          tone: "hold",
          product: "transactions",
          title: `${noun} held for an ID check`,
          detail: `${money} · 30-day total would be ${total.toLocaleString("en-US")} ${CURRENCY}`,
          code: `submitTransaction(…) → "action_required"`,
        },
      ];
    }
    case "IN_REVIEW":
    case "DECLINED": {
      const declined = record.status === "DECLINED";
      const sharedDevice =
        item.kind === "bonus_claim" &&
        (record.tags.includes("BONUS_ABUSE") ||
          record.ruleHits.some((rule) => /shared device/i.test(rule.title)));
      const events: LiveInput[] = [];

      if (sharedDevice) {
        events.push({
          key: `${key}-device`,
          tone: "sig",
          product: "signals",
          title: "Device seen before",
          detail: context.previous
            ? `Same device as ${context.previous} · ${context.accountsOnDevice} accounts`
            : "Another player claimed the offer on this device",
        });
      }
      events.push({
        key,
        tone: declined ? "stop" : "hold",
        product: "transactions",
        title: sharedDevice
          ? declined
            ? "Bonus declined"
            : "Bonus held for review"
          : `${noun} ${declined ? "declined" : "in review"}`,
        detail: sharedDevice
          ? "Device already used by another player"
          : hit
            ? `Rule: ${ruleName(hit.title)}`
            : (record.reason ?? `Risk ${Math.round(record.score)} of 100`),
        code,
      });

      return events;
    }
    default:
      return [
        {
          key,
          tone: "txn",
          product: "transactions",
          title: `${noun} ${record.status.toLowerCase().replace(/_/g, " ")}`,
          detail: money,
          code,
        },
      ];
  }
}

export interface DeviceRead {
  firstVisit: boolean;
  botScore: number;
  browser: string;
  os: string;
}

/** The signals read-out of this device, once per page load. */
export function deviceEvents(device: DeviceRead): LiveInput[] {
  const human = device.botScore < 0.5;

  return [
    {
      key: "sig-device",
      tone: "sig",
      product: "signals",
      title: device.firstVisit ? "New device fingerprinted" : "Known device",
      detail: `${device.browser} on ${device.os} · ${device.firstVisit ? "first visit" : "seen before"}`,
      code: "getDeviceFingerprintPayload() · @didit-protocol/signals",
    },
    {
      key: "sig-bot",
      tone: human ? "sig" : "stop",
      product: "signals",
      title: human ? "Bot protection: human" : "Bot protection: likely automated",
      detail: `Bot score ${device.botScore.toFixed(2)}`,
    },
  ];
}

/** A Didit Authentication session, as the feed reports it. */
export function authEvent(input: {
  sessionId: string;
  email: string | null;
  methods: string[];
  signUp: boolean;
  device: string | null;
}): LiveInput {
  const passkey = input.methods.includes("passkey");
  const code = input.methods.includes("code");
  const who = input.email ?? "New account";

  return {
    key: `auth-${input.sessionId}`,
    tone: "auth",
    product: "authentication",
    title: input.signUp
      ? passkey
        ? "Passkey created"
        : code
          ? "New sign-up with an email code"
          : "New sign-up"
      : passkey
        ? "Signed in with the passkey"
        : code
          ? "Signed in with an email code"
          : "Signed in",
    detail: [who, input.device].filter(Boolean).join(" · "),
    code: input.signUp
      ? "<SignUp /> · @didit-protocol/auth-nextjs"
      : "useUser() · @didit-protocol/auth-nextjs",
  };
}
