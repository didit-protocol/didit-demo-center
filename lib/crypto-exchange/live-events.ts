import type { AccountView } from "./onboarding";
import type { ActivityItem, TransactionView } from "./transactions";
import type { LiveInput } from "../didit/live";

import { formatAmount } from "./markets";
import { ruleName, withdrawalStage } from "./transactions";

export { authEvent, deviceEvents } from "../igaming/live-events";

/**
 * What Kestrel pushes to the Didit live layer, built from the answers Didit
 * just gave: the KYC decision and each transaction's record. The signals
 * read-out and the Authentication session use the shared builders. Pure, so
 * `npm test` pins every line the visitor reads.
 */

const amountOf = (view: Pick<TransactionView, "amount" | "currency">) =>
  `${formatAmount(Number(view.amount) || 0, 8).replace(/\.?0+$/, "")} ${view.currency}`;

/** "risk 12 of 100, low": the wallet screening, in words. */
export function walletRisk(view: TransactionView): string {
  const score = view.screening?.riskScore;

  if (score === null || score === undefined) return "wallet not screened";
  const band = score >= 75 ? "severe" : score >= 40 ? "elevated" : "low";

  return `risk ${Math.round(score)} of 100, ${band}${view.screening?.walletSanctioned ? " · sanctions" : ""}`;
}

export function verificationStarted(): LiveInput[] {
  return [
    {
      key: "kyc-rule",
      tone: "txn",
      product: "transactions",
      title: "Deposits wait for an approved KYC",
      detail: "Rule: no deposit before KYC",
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

export function verificationDecided(
  account: Pick<
    AccountView,
    "sessionId" | "stage" | "status" | "fullName" | "document" | "amlHits"
  >,
): LiveInput[] {
  const code = `GET /v3/session/${account.sessionId.slice(0, 8)}…/decision/`;
  const matches =
    account.amlHits === null
      ? null
      : account.amlHits === 0
        ? "no matches"
        : `${account.amlHits} possible ${account.amlHits === 1 ? "match" : "matches"}`;

  switch (account.stage) {
    case "approved":
      return [
        {
          key: "kyc-decided",
          tone: "ver",
          product: "verification",
          title: "KYC and AML approved",
          detail:
            [account.document ?? account.fullName, matches]
              .filter(Boolean)
              .join(" · ") || "ID, selfie, face match and screening approved",
          code,
        },
      ];
    case "review":
      return [
        {
          key: "kyc-decided",
          tone: "hold",
          product: "verification",
          title: "KYC in review",
          detail: matches
            ? `AML screening: ${matches}`
            : "An analyst decides before the first deposit",
          code,
        },
      ];
    case "declined":
      return [
        {
          key: "kyc-decided",
          tone: "stop",
          product: "verification",
          title: "KYC declined",
          detail: "The account stays closed to deposits",
          code,
        },
      ];
    default:
      return [];
  }
}

/** One transaction's record from Didit, in the feed's words. */
export function transactionEvents(item: ActivityItem): LiveInput[] {
  const view = item.view;
  const amount = amountOf(view);
  const key = `txn-${item.id}`;
  const declinedBy = view.rules.find((rule) => rule.statusTarget === "DECLINED");

  if (item.kind === "deposit") {
    const code = `submitTransaction({ actionType: "deposit", currency: "${view.currency}" })`;

    if (view.status === "APPROVED")
      return [
        {
          key,
          tone: "txn",
          product: "transactions",
          title: "Deposit screened",
          detail: `${amount} · sending wallet ${walletRisk(view)}`,
          code,
        },
      ];

    return [
      {
        key: `${key}-rule`,
        tone: "txn",
        product: "transactions",
        title: declinedBy
          ? `Rule hit: ${ruleName(declinedBy.title).toLowerCase()}`
          : "Rule hit",
        detail: `Kestrel's crypto rules · ${view.status === "DECLINED" ? "decline" : "review"}`,
      },
      {
        key,
        tone: view.status === "DECLINED" ? "stop" : "hold",
        product: "transactions",
        title:
          view.status === "DECLINED" ? "Deposit frozen" : "Deposit in review",
        detail: `${amount} · sending wallet ${walletRisk(view)}`,
        code: `${code} → "${view.status.toLowerCase()}"`,
      },
    ];
  }

  const code = `submitTransaction(…) → "${view.status.toLowerCase()}"`;

  switch (withdrawalStage(view)) {
    case "blocked":
      return [
        {
          key: `${key}-rule`,
          tone: "txn",
          product: "transactions",
          title: declinedBy
            ? `Rule hit: ${ruleName(declinedBy.title).toLowerCase()}`
            : "Rule hit",
          detail: "Kestrel's crypto rules · decline",
        },
        {
          key,
          tone: "stop",
          product: "transactions",
          title: "Withdrawal declined",
          detail: `${amount} · destination wallet ${walletRisk(view)}`,
          code,
        },
      ];
    case "review":
      return [
        {
          key,
          tone: "hold",
          product: "transactions",
          title: "Withdrawal in review",
          detail: `${amount} · destination wallet ${walletRisk(view)}`,
          code,
        },
      ];
    case "prove-ownership":
      return [
        {
          key: `${key}-travel`,
          tone: "txn",
          product: "transactions",
          title: "Travel Rule: self-hosted wallet",
          detail: "Prove the wallet is yours with a signed message",
        },
        {
          key,
          tone: "hold",
          product: "transactions",
          title: "Withdrawal held",
          detail: `${amount} · releases after the wallet proof and the selfie`,
          code: 'submitTransaction(…) → "action_required"',
        },
      ];
    case "step-up":
      return [
        {
          key: `${key}-travel`,
          tone: "txn",
          product: "transactions",
          title: "Travel Rule: self-hosted wallet",
          detail: "Ownership proven by a signed message",
        },
        {
          key: `${key}-held`,
          tone: "hold",
          product: "transactions",
          title: "Withdrawal held",
          detail: `${amount} · releases after the selfie`,
        },
        {
          key,
          tone: "auth",
          product: "authentication",
          title: "Step-up: selfie requested",
          detail: "Matched to the face verified at sign-up",
          code: 'submitTransaction(…) → "action_required"',
        },
      ];
    case "ready":
      return [
        {
          key,
          tone: "txn",
          product: "transactions",
          title: "Withdrawal sent",
          detail: `${amount} · Travel Rule complete${view.stepUp ? " · selfie matched" : ""}`,
          code: `GET /v3/transactions/${view.id.slice(0, 8)}…/`,
        },
      ];
    default:
      return [
        {
          key,
          tone: "hold",
          product: "transactions",
          title: "Withdrawal waiting",
          detail: `${amount} · the Travel Rule exchange has not finished`,
          code,
        },
      ];
  }
}
