import type { KybSummary, TransactionSummary } from "./summaries.ts";
import type { LiveInput } from "../didit/live.ts";

import { HIGH_VALUE_THRESHOLD, eur } from "./northmarket.ts";
import { RULE_TITLES } from "./setup.ts";

/**
 * What Northmarket pushes to the Didit live layer, built from the answers
 * Didit just gave: the signals device read-out, an Authentication session, a
 * KYB decision or a transaction result. Pure, so `npm test` pins every line
 * the visitor reads.
 */

const RULE_NAMES: Record<string, string> = {
  [RULE_TITLES.highValue]: `Orders of ${HIGH_VALUE_THRESHOLD.toLocaleString("en-US")} EUR or more`,
  [RULE_TITLES.sharedDeviceSignup]: "Second shop on one device",
  [RULE_TITLES.sharedDevicePayout]: "Payout from a shared device",
};

/** A rule's title as the seller's team would say it. */
export function ruleName(title: string): string {
  const name =
    RULE_NAMES[title] ?? title.replace(/^Marketplace demo:\s*/i, "").trim();

  return name.charAt(0).toUpperCase() + name.slice(1);
}

const lower = (status: string) => status.toLowerCase().replace(/_/g, " ");

export interface DeviceRead {
  firstVisit: boolean;
  botScore: number;
  browser: string;
  os: string;
}

/** The signals read-out of this device, once per visit. */
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
      title: human
        ? "Bot protection: human"
        : "Bot protection: likely automated",
      detail: `Score ${device.botScore.toFixed(2)} · ${device.browser} on ${device.os}`,
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
  const how = passkey ? "the passkey" : code ? "an email code" : null;

  return {
    key: `auth-${input.sessionId}`,
    tone: "auth",
    product: "authentication",
    title: input.signUp
      ? passkey
        ? "Passkey created"
        : code
          ? "New seller sign-up with an email code"
          : "New seller sign-up"
      : how
        ? `Signed in with ${how}`
        : "Signed in",
    detail: [
      input.email ?? "Seller account",
      input.device ? `on ${input.device}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    code: input.signUp
      ? "<SignUp /> · @didit-protocol/auth-nextjs"
      : "useUser() · @didit-protocol/auth-nextjs",
  };
}

/** The KYB opened in the web SDK modal; payouts wait for it. */
export function kybStarted(shop: string): LiveInput[] {
  return [
    {
      key: "kyb-rule",
      tone: "txn",
      product: "transactions",
      title: "Payouts wait for an approved KYB",
      detail: "Rule: no payout before the business is verified",
      code: "POST /v3/transactions/sdk-token/ once the KYB is approved",
    },
    {
      key: "kyb-start",
      tone: "ver",
      product: "verification",
      title: "Business check started",
      detail: `${shop} · KYB workflow · registry, owners, documents`,
      code: "startVerification({ url }) · @didit-protocol/sdk-web",
    },
  ];
}

const verifiedOwners = (kyb: KybSummary) =>
  kyb.people.filter((person) => person.kycStatus === "Approved").length;

/** The company name Didit found, or the one the shop gave. */
export function companyName(kyb: KybSummary | null, fallback: string) {
  return kyb?.company?.name ?? fallback;
}

/** The KYB's decision, as the feed reports it. */
export function kybDecided(kyb: KybSummary, fallback: string): LiveInput[] {
  const company = companyName(kyb, fallback);
  const code = `GET /v3/session/${kyb.sessionId.slice(0, 8)}…/decision/`;
  const owners = verifiedOwners(kyb);
  const status = kyb.status.toLowerCase();

  if (status === "approved") {
    return [
      {
        key: "kyb-decided",
        tone: "ver",
        product: "verification",
        title: "Business approved",
        detail: owners
          ? `${company} · ${owners} ${owners === 1 ? "owner" : "owners"} verified`
          : `${company} · registry and documents approved`,
        code,
      },
    ];
  }

  return [
    {
      key: "kyb-decided",
      tone: status === "declined" ? "stop" : "hold",
      product: "verification",
      title: `Business check ${status || "not finished"}`,
      detail:
        status === "declined"
          ? `${company} · payouts stay off`
          : `${company} · payouts wait until it is approved`,
      code,
    },
  ];
}

/** On the product page: the seller behind the listing is a verified business. */
export function sellerVerified(company: string): LiveInput {
  return {
    key: "seller-verified",
    tone: "ver",
    product: "verification",
    title: "Seller is a verified business",
    detail: `${company} · KYB approved`,
  };
}

/** The buyer's age check opened from a held order. */
export function ageStarted(): LiveInput {
  return {
    key: "age-start",
    tone: "ver",
    product: "verification",
    title: "Age check started",
    detail: "Selfie age estimation · web SDK modal",
    code: "startVerification({ url: action_required.url })",
  };
}

export interface TransactionContext {
  /** The shop the transaction belongs to, or the order's seller. */
  shop: string;
  /** The first shop, when this one is a second shop on the same device. */
  previous: string | null;
}

/**
 * A transaction result from `submitTransaction` (or its re-read), in the
 * feed's words. Oldest first, so the most important one lands on top.
 */
export function transactionEvents(
  tx: TransactionSummary,
  context: TransactionContext,
): LiveInput[] {
  const key = `txn-${tx.uuid}`;
  const rule = tx.rules[0];
  const ruleEvent: LiveInput[] = rule
    ? [
        {
          key: `${key}-rule`,
          tone: "txn",
          product: "transactions",
          title: `Rule hit: ${ruleName(rule.title).replace(/^Orders/, "orders")}`,
          detail: "Your marketplace ruleset",
        },
      ]
    : [];

  if (tx.kind === "purchase") {
    const amount = eur(tx.amount);
    const code = `submitTransaction({ type: "purchase", amount: ${tx.amount} })`;

    if (tx.status === "AWAITING_USER")
      return [
        ...ruleEvent,
        {
          key,
          tone: "hold",
          product: "transactions",
          title: "Order held for an age check",
          detail: `${amount} · orders of ${eur(HIGH_VALUE_THRESHOLD)} or more wait`,
          code: `submitTransaction(...) → "action_required"`,
        },
      ];
    if (tx.status === "APPROVED")
      return [
        {
          key,
          tone: "txn",
          product: "transactions",
          title: "Order paid",
          detail: `${amount} · ${context.shop} · risk ${Math.round(tx.score)} of 100`,
          code,
        },
      ];

    return [
      ...ruleEvent,
      {
        key,
        tone: tx.status === "DECLINED" ? "stop" : "hold",
        product: "transactions",
        title: `Order ${lower(tx.status)}`,
        detail: amount,
        code,
      },
    ];
  }

  if (tx.kind === "signup") {
    const code = `submitTransaction({ type: "seller_signup" }) → "${tx.status}"`;
    const shared = tx.tags.some((tag) => tag.startsWith("SHARED_DEVICE"));

    if (tx.status === "APPROVED")
      return [
        {
          key,
          tone: "txn",
          product: "transactions",
          title: "Seller sign-up checked",
          detail: `${context.shop} · risk ${Math.round(tx.score)} of 100`,
          code,
        },
      ];

    return [
      ...(shared || context.previous
        ? [
            {
              key: `${key}-device`,
              tone: "sig" as const,
              product: "signals" as const,
              title: "Device runs another shop",
              detail: context.previous
                ? `Same device as ${context.previous}`
                : "Another shop signed up from this device",
            },
          ]
        : []),
      {
        key,
        tone: "stop",
        product: "transactions",
        title: "Payouts paused",
        detail: `${context.shop} · second shop, same device`,
        code,
      },
    ];
  }

  return [
    ...ruleEvent,
    {
      key,
      tone: tx.status === "APPROVED" ? "txn" : "hold",
      product: "transactions",
      title: `Payout ${lower(tx.status)}`,
      detail: eur(tx.amount),
      code: `submitTransaction({ type: "payout", amount: ${tx.amount} })`,
    },
  ];
}
