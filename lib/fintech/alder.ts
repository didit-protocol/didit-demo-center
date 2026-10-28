/**
 * Alder, the fictional neobank of /fintech: what the bank sends to Didit and
 * the rules it installs. Pure and free of `@/` imports, so `npm test` and
 * `npm run fintech:setup` load it straight from Node.
 *
 * - Onboarding is the KYC + AML workflow in lib/didit/demos.ts, before the
 *   IBAN goes live. The server mints a transaction token only for a customer
 *   whose onboarding Didit approved, so no payment moves before it.
 * - Every payment is submitted from the browser with `submitTransaction`, so
 *   the web SDK attaches the device signals sees.
 * - A transfer of 5,000 EUR or more to a new payee is held by a rule
 *   (`AWAITING_USER`) and Didit releases it once the customer passes the
 *   step-up the rule opened: a selfie matched to the one from onboarding.
 * - A sign-in without the passkey is reported as a security event and
 *   blocked by an event rule: the account-takeover step.
 */

import { alder } from "../didit/demos.ts";

export const BANK = alder.brand.name;

/** Every customer id (`vendor_data`) starts with it; the rules match it. */
export const CUSTOMER_PREFIX = alder.vendorPrefix;

export const ONBOARDING_WORKFLOW_ID = alder.workflows.onboarding;
export const STEP_UP_WORKFLOW_ID = alder.workflows.stepUp;

export const CURRENCY = "EUR";

/** Transfers to a new payee at or above this amount wait for a step-up. */
export const STEP_UP_AMOUNT = 5000;

/**
 * Sent as `custom_properties` on every transaction. The staging application
 * is shared with the other demos, so the rules match on it as well as on the
 * customer prefix.
 */
export const DEMO_PROPERTY = { key: "demo_app", value: "fintech" } as const;

const MONEY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "5,000.00 EUR", the way Alder writes money. */
export function formatMoney(amount: number): string {
  return `${MONEY.format(amount)} ${CURRENCY}`;
}

/** "12,480" and ".20": the balance's whole and cents, as the card shows them. */
export function splitMoney(amount: number): { whole: string; cents: string } {
  const [whole, cents] = MONEY.format(amount).split(".");

  return { whole, cents: `.${cents}` };
}

/* ── Payees and the account's first week ─────────────────────────────── */

export interface Payee {
  id: string;
  name: string;
  /** The IBAN as the app shows it, masked. */
  iban: string;
  /** A payee this customer has paid before. */
  known: boolean;
}

export const PAYEES: Payee[] = [
  { id: "jonas", name: "Jonas Koch", iban: "DE44 •••• 4931", known: false },
  { id: "mia", name: "Mia Weber", iban: "DE12 •••• 0577", known: true },
];

export function payeeById(id: string): Payee | null {
  return PAYEES.find((payee) => payee.id === id) ?? null;
}

export type PaymentKind =
  "incoming_transfer" | "card_payment" | "transfer" | "account_funding";

export interface Seed {
  kind: PaymentKind;
  amount: number;
  counterparty: string;
  detail: string;
  /** The merchant's colour in the activity list. */
  color: string;
}

/**
 * The account's first week, submitted once onboarding is approved so the
 * home screen has real, monitored activity: the money the customer moved
 * from their old bank, a salary and four card payments. Each one is a real
 * transaction on Didit, so the live layer and the console count them.
 */
export const FIRST_WEEK: Seed[] = [
  {
    kind: "account_funding",
    amount: 9415.34,
    counterparty: "Your old bank",
    detail: "Account switch",
    color: "#0F4D3A",
  },
  {
    kind: "card_payment",
    amount: 9.99,
    counterparty: "Streamly",
    detail: "Subscription",
    color: "#D92D20",
  },
  {
    kind: "card_payment",
    amount: 58,
    counterparty: "City Rail",
    detail: "Monthly pass",
    color: "#0E7490",
  },
  {
    kind: "card_payment",
    amount: 62.35,
    counterparty: "Marktplatz Bio",
    detail: "Groceries",
    color: "#2E7D32",
  },
  {
    kind: "card_payment",
    amount: 4.8,
    counterparty: "Café Linde",
    detail: "Coffee",
    color: "#8A5A2B",
  },
  {
    kind: "incoming_transfer",
    amount: 3200,
    counterparty: "Nordwerk GmbH",
    detail: "Salary",
    color: "#2563EB",
  },
];

export interface PaymentRequest {
  kind: PaymentKind;
  amount: number;
  counterparty: string;
  /** The counterparty's account, when it is a bank transfer. */
  account?: string;
  /** A payee the customer has never paid: the step-up rule reads it. */
  newPayee?: boolean;
  detail?: string;
}

const INBOUND: PaymentKind[] = ["incoming_transfer", "account_funding"];

export function isInbound(kind: PaymentKind | string): boolean {
  return (INBOUND as string[]).includes(kind);
}

/** "alder-…-transfer-mh3k2x": unique per customer, kind and moment. */
export function newTxnId(customerId: string, kind: string, now: number) {
  return `al-${kind.replace(/_/g, "-")}-${customerId.slice(-8)}-${now.toString(36)}`;
}

/**
 * The camelCase payload `submitTransaction` sends. The subject's
 * `vendor_data` is not here: Didit takes it from the transaction token,
 * which the server minted for this customer only.
 */
export function paymentPayload(
  request: PaymentRequest,
  customer: { id: string; name: string },
  now: number,
) {
  const inbound = isInbound(request.kind);

  return {
    txnId: newTxnId(customer.id, request.kind, now),
    category: "finance",
    details: {
      direction: inbound ? "in" : "out",
      amount: request.amount.toFixed(2),
      currency: CURRENCY,
      currencyType: "fiat",
      actionType: request.kind,
      ...(request.detail ? { paymentDetails: request.detail } : {}),
    },
    subject: customer.name ? { fullName: customer.name } : {},
    counterparty: {
      type: request.kind === "transfer" ? "individual" : "company",
      fullName: request.counterparty,
      ...(request.account
        ? {
            paymentMethod: { type: "bank_account", accountId: request.account },
          }
        : {}),
    },
    customProperties: {
      [DEMO_PROPERTY.key]: DEMO_PROPERTY.value,
      bank: BANK,
      new_payee: request.newPayee === true,
    },
  };
}

/* ── The rules `npm run fintech:setup` installs ─────────────────────── */

export const RULE_TITLES = {
  newPayee: "Alder demo: 5,000 EUR or more to a new payee",
  takeover: "Alder demo: sign-in without the passkey",
} as const;

/** The rule the earlier /fintech installed; setup switches it off. */
export const RETIRED_RULE_TITLE = "High-value outbound transfer (fintech demo)";

const alderOnly = {
  field: "subject_vendor_data",
  operator: "contains",
  value: CUSTOMER_PREFIX,
};

/**
 * The transaction rule: a transfer of 5,000 EUR or more to a payee the
 * customer has never paid waits for the customer (`AWAITING_USER`), with the
 * step-up workflow as its remediation. Approving that step-up releases it.
 */
export function newPayeeRule(stepUpWorkflowId: string) {
  return {
    title: RULE_TITLES.newPayee,
    description: `${BANK}: a transfer of ${STEP_UP_AMOUNT.toLocaleString("en-US")} ${CURRENCY} or more to a new payee is held until the customer confirms it is them. Only matches the /fintech demo's own customers.`,
    category: "finance",
    mode: "ACTIVE",
    evaluation_mode: "ALL",
    scope: { directions: ["OUTBOUND"], transaction_types: ["finance"] },
    conditions: [
      alderOnly,
      {
        field: `custom_values.${DEMO_PROPERTY.key}`,
        operator: "eq",
        value: DEMO_PROPERTY.value,
      },
      { field: "custom_values.new_payee", operator: "eq", value: true },
      { field: "currency", operator: "eq", value: CURRENCY },
      { field: "amount", operator: "gte", value: STEP_UP_AMOUNT },
    ],
    aggregation: [],
    actions: [
      {
        type: "change_status",
        value: "AWAITING_USER",
        workflow_id: stepUpWorkflowId,
      },
      { type: "add_tags", tag_name: "NEW_PAYEE_STEP_UP" },
    ],
  };
}

/**
 * The event rule: a sign-in that failed the passkey check is declined and
 * tagged as an account takeover, so the bank refuses the session.
 */
export function takeoverRule() {
  return {
    title: RULE_TITLES.takeover,
    description: `${BANK}: a sign-in that fails the passkey check is blocked as an account takeover. Only matches the /fintech demo's own customers.`,
    category: "fraud_prevention",
    mode: "ACTIVE",
    evaluation_mode: "ALL",
    scope: { record_types: ["event"], event_categories: ["security"] },
    conditions: [
      alderOnly,
      { field: "event.action_type", operator: "eq", value: "login_failed" },
      { field: "custom_values.passkey", operator: "eq", value: "failed" },
    ],
    aggregation: [],
    actions: [
      { type: "add_score", value: 90 },
      { type: "change_status", value: "DECLINED" },
      { type: "add_tags", tag_name: "ACCOUNT_TAKEOVER" },
    ],
  };
}

/** "Alder demo: 5,000 EUR or more to a new payee" → the rule's own words. */
export function ruleName(title: string): string {
  const rest = title.replace(/^Alder demo:\s*/i, "");

  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/* ── The account-takeover attempt ──────────────────────────────────── */

/**
 * The security event the bank reports when someone tries to sign in to the
 * customer's account and cannot pass the passkey check. Didit adds the IP,
 * the user agent and the device fingerprint itself.
 */
export function takeoverEvent(now: number) {
  return {
    category: "security" as const,
    actionType: "login_failed",
    eventId: `al-login-failed-${now.toString(36)}`,
    payload: { method: "passkey", reason: "passkey_check_failed" },
    customValues: {
      [DEMO_PROPERTY.key]: DEMO_PROPERTY.value,
      passkey: "failed",
    },
  };
}

/* ── Statuses, as the bank writes them ─────────────────────────────── */

export type PaymentState = "done" | "held" | "review" | "declined";

export function paymentState(status: string | null | undefined): PaymentState {
  switch ((status ?? "").toUpperCase()) {
    case "AWAITING_USER":
      return "held";
    case "IN_REVIEW":
      return "review";
    case "DECLINED":
      return "declined";
    default:
      return "done";
  }
}

/**
 * Session statuses (`GET /v3/session/{id}/decision/`) after which the
 * decision no longer changes on its own: polling stops, and anything but
 * Approved, Declined or In Review needs a new session.
 */
export function isFinalStatus(status: string): boolean {
  return [
    "Approved",
    "Declined",
    "In Review",
    "Expired",
    "Kyc Expired",
    "Abandoned",
  ].includes(status);
}

/**
 * Statuses where the session waits for the customer, not for Didit: not
 * opened yet, or sent back for a resubmission. The same hosted link
 * continues it, so the bank reopens it instead of starting another.
 */
export function awaitsCustomer(status: string): boolean {
  return ["Not Started", "Awaiting User", "Resubmitted"].includes(status);
}
