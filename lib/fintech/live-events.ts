import type { PaymentKind } from "./alder";
import type { LiveInput } from "../didit/live";
import type { SessionSummary, TransactionRecord } from "../igaming/records";

import { formatMoney, ruleName } from "./alder.ts";

/**
 * What Alder pushes to the Didit live layer, built from the answer Didit just
 * gave: an onboarding decision, a payment result, a step-up or the security
 * event of the account-takeover attempt. The signals device read-out and the
 * Authentication session reuse the shared lines (lib/igaming/live-events).
 * Pure, so `npm test` pins every line the visitor reads.
 */

export { authEvent, deviceEvents } from "../igaming/live-events.ts";

export function onboardingStarted(): LiveInput[] {
  return [
    {
      key: "kyc-locked",
      tone: "txn",
      product: "transactions",
      title: "Payments locked until verified",
      detail: "Rule: no transfers before an approved KYC",
      code: "POST /v3/transactions/sdk-token/ after the KYC",
    },
    {
      key: "kyc-start",
      tone: "ver",
      product: "verification",
      title: "Verification started",
      detail: "KYC + AML workflow · web SDK modal",
      code: "startVerification({ url }) · @didit-protocol/sdk-web",
    },
  ];
}

const listed = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(" · ");

export function onboardingDecided(summary: SessionSummary): LiveInput[] {
  const code = `GET /v3/session/${summary.sessionId.slice(0, 8)}…/decision/`;
  const aml =
    summary.amlHits === null
      ? null
      : summary.amlHits === 0
        ? "no screening matches"
        : `${summary.amlHits} screening matches`;

  if (summary.status === "Approved") {
    return [
      {
        key: "kyc-decided",
        tone: "ver",
        product: "verification",
        title: "KYC and AML approved",
        detail:
          listed(
            summary.documentType &&
              [summary.documentCountry, summary.documentType]
                .filter(Boolean)
                .join(" "),
            aml,
          ) || "ID, selfie and screening approved",
        code,
      },
    ];
  }
  const declined = summary.status === "Declined";

  return [
    {
      key: "kyc-decided",
      tone: declined ? "stop" : "hold",
      product: "verification",
      title: `Verification ${summary.status.toLowerCase()}`,
      detail: declined
        ? "The account stays closed: no IBAN, no payments"
        : "Your IBAN goes live once it is finished",
      code,
    },
  ];
}

const NOUN: Record<PaymentKind, string> = {
  incoming_transfer: "Transfer received",
  account_funding: "Money moved in",
  card_payment: "Card payment",
  transfer: "Transfer",
};

export interface PaymentLine {
  kind: PaymentKind;
  amount: number;
  counterparty: string;
  detail?: string;
  newPayee?: boolean;
}

const callOf = (item: PaymentLine) =>
  `submitTransaction({ type: "${item.kind}", amount: ${item.amount} })`;

/** A payment Didit refused outright (no record came back). */
export function paymentRefused(
  key: string,
  item: PaymentLine,
  error: string,
): LiveInput[] {
  return [
    {
      key: `txn-${key}`,
      tone: "stop",
      product: "transactions",
      title: `${NOUN[item.kind]} refused`,
      detail: error,
      code: callOf(item),
    },
  ];
}

/** Every line one payment record produces, keyed so updates replace them. */
export function paymentEvents(
  record: TransactionRecord,
  item: PaymentLine,
): LiveInput[] {
  const key = `txn-${record.id}`;
  const money = formatMoney(record.amount || item.amount);
  const risk = `risk ${Math.round(record.score)} of 100`;
  const hit = record.ruleHits.find((rule) => rule.statusTarget);

  if (record.status === "AWAITING_USER") {
    return [
      {
        key: `${key}-hold`,
        tone: "hold",
        product: "transactions",
        title: "Transfer held",
        detail: hit
          ? `Rule hit: ${ruleName(hit.title)}`
          : "Held until the customer confirms it",
      },
      {
        key,
        tone: "ver",
        product: "verification",
        title: "Step-up requested",
        detail: `${money} to ${item.counterparty}${item.newPayee ? ", a new payee" : ""}`,
        code: `submitTransaction(…) → "action_required"`,
      },
    ];
  }
  if (record.status === "IN_REVIEW" || record.status === "DECLINED") {
    const declined = record.status === "DECLINED";

    return [
      {
        key,
        tone: declined ? "stop" : "hold",
        product: "transactions",
        title: `${NOUN[item.kind]} ${declined ? "declined" : "in review"}`,
        detail: hit ? `Rule: ${ruleName(hit.title)}` : (record.reason ?? risk),
        code: callOf(item),
      },
    ];
  }

  const title =
    record.status === "APPROVED"
      ? item.kind === "incoming_transfer" && item.detail === "Salary"
        ? "Salary received"
        : item.kind === "transfer"
          ? "Transfer sent"
          : NOUN[item.kind]
      : `${NOUN[item.kind]} ${record.status.toLowerCase().replace(/_/g, " ")}`;
  const direction = record.direction === "in" ? "from" : "to";

  return [
    {
      key,
      tone: "txn",
      product: "transactions",
      title,
      detail: `${money} ${direction} ${item.counterparty} · ${risk}`,
      code: callOf(item),
    },
  ];
}

export function stepUpStarted(): LiveInput[] {
  return [
    {
      key: "stepup-start",
      tone: "ver",
      product: "verification",
      title: "Step-up started",
      detail: "Selfie matched to the KYC · web SDK modal",
      code: "startVerification({ url: action_required.url })",
    },
  ];
}

export function stepUpDecided(
  summary: SessionSummary,
  record: TransactionRecord | null,
): LiveInput[] {
  const approved = summary.status === "Approved";
  const events: LiveInput[] = [
    {
      key: "stepup-decided",
      tone: approved ? "ver" : "stop",
      product: "verification",
      title: approved
        ? "It's you: step-up approved"
        : `Step-up ${summary.status.toLowerCase()}`,
      detail: approved
        ? "Selfie matches the person who opened the account"
        : "The transfer stays on hold",
      code: `GET /v3/session/${summary.sessionId.slice(0, 8)}…/decision/`,
    },
  ];

  if (record && record.status === "APPROVED") {
    events.push({
      key: `txn-${record.id}`,
      tone: "txn",
      product: "transactions",
      title: "Transfer released",
      detail: `${formatMoney(record.amount)} · released by Didit, nobody had to review it`,
      code: `GET /v1/transactions/${record.id.slice(0, 8)}…/`,
    });
  }

  return events;
}

export interface TakeoverResult {
  /** What Didit decided on the failed sign-in, when it took the event. */
  status: string | null;
  score: number | null;
  /** Why Didit did not take the event, when it did not. */
  error: string | null;
}

/** The account-takeover attempt, in the feed's words. */
export function takeoverEvents(
  result: TakeoverResult,
  device: { browser: string; os: string; firstVisit: boolean } | null,
): LiveInput[] {
  const decided = result.status !== null;
  const blockedByRule = result.status === "DECLINED";

  return [
    {
      key: "ato-transfer",
      tone: "txn",
      product: "transactions",
      title: "No transfer was created",
      detail: "The attacker never reached Payments",
    },
    {
      key: "ato-device",
      tone: "sig",
      product: "signals",
      title: device
        ? `Sign-in from ${device.browser} on ${device.os}`
        : "Sign-in device read",
      detail: "Device fingerprint and network attached to the event",
      code: 'submitEvent({ category: "security", … }) · @didit-protocol/signals',
    },
    {
      key: "ato-blocked",
      tone: "stop",
      product: "authentication",
      title: "Sign-in blocked",
      detail: decided
        ? blockedByRule
          ? `Passkey check failed · declined by a rule, score ${Math.round(result.score ?? 0)}`
          : `Passkey check failed · Didit marked it ${result.status!.toLowerCase().replace(/_/g, " ")}`
        : `Passkey check failed · ${result.error ?? "the event was not stored"}`,
      code: "<SignIn /> → blocked · reason: passkey_check_failed",
    },
  ];
}
