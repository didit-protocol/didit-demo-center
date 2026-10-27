/**
 * What Kestrel (/crypto-exchange) needs configured on the Didit application:
 * its workflows, three transaction rules and the Travel Rule settings.
 *
 * `npm run crypto-exchange:setup` installs the rules and settings from here
 * (scripts/crypto-exchange-setup.mjs). Self-contained so that script and the
 * unit tests can import it with plain Node.
 *
 * Every rule is scoped to `custom_values.demo_app == "crypto-exchange"`, a
 * property only Kestrel's transactions carry, so the demo cannot change how the
 * application treats any other traffic.
 */

import { kestrel } from "../didit/demos.ts";

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

/**
 * The workflows Kestrel runs. `null` means "not published on this environment":
 * the page then says so instead of failing. The production ids are in
 * lib/didit/demos.ts, but the demo stays on staging until its rules are
 * installed on production too.
 */
export const CX_WORKFLOWS = {
  /** "2. KYC ACTIVE LIVENESS": ID + liveness + face match + AML + IP analysis. */
  onboarding: isStaging ? kestrel.workflows.onboarding : null,
  /** "4. BIOMETRIC AUTHENTICATION": liveness + face match against the
   * onboarding selfie. The withdrawal step-up. */
  stepUp: isStaging ? kestrel.workflows.stepUp : null,
} as const;

const DEMO_SCOPE = {
  field: "custom_values.demo_app",
  operator: "eq",
  value: "crypto-exchange",
};

export interface RuleDefinition {
  title: string;
  description: string;
  category: string;
  mode: "ACTIVE";
  evaluation_mode: "ALL";
  scope: Record<string, string[]>;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
}

/**
 * Titles start with "Wallet" / "Withdrawal" on purpose: the rule engine runs
 * custom rules in title order and the last explicit status wins, so these
 * run after any generic rule already on a shared application.
 */
export function cryptoExchangeRules(
  stepUpWorkflowId: string,
): RuleDefinition[] {
  return [
    {
      title: "Wallet risk: high-risk exposure (crypto exchange demo)",
      description:
        "Holds a Kestrel deposit or withdrawal for review when wallet screening scores the other side's wallet 75 or above. Demo-scoped copy of the library's high-risk wallet exposure rule.",
      category: "crypto_monitoring",
      mode: "ACTIVE",
      evaluation_mode: "ALL",
      scope: {},
      conditions: [
        DEMO_SCOPE,
        {
          field: "custom_values.wallet_risk_score",
          operator: "gte",
          value: 75,
        },
      ],
      actions: [
        { type: "add_score", value: 60 },
        { type: "change_status", value: "IN_REVIEW" },
      ],
    },
    {
      title: "Wallet risk: sanctioned wallet (crypto exchange demo)",
      description:
        "Declines a Kestrel transfer when the other side's wallet is itself attributed to a sanctioned entity. Demo-scoped copy of the library's sanctions counterparty rule.",
      category: "crypto_monitoring",
      mode: "ACTIVE",
      evaluation_mode: "ALL",
      scope: {},
      conditions: [
        DEMO_SCOPE,
        {
          field: "custom_values.wallet_sanctioned",
          operator: "eq",
          value: true,
        },
      ],
      actions: [
        { type: "add_score", value: 90 },
        { type: "change_status", value: "DECLINED" },
      ],
    },
    {
      title:
        "Withdrawal step-up: selfie re-authentication (crypto exchange demo)",
      description:
        "Every low-risk Kestrel withdrawal waits for the user to pass a selfie check matched against their onboarding face before it can be broadcast.",
      category: "fraud_prevention",
      mode: "ACTIVE",
      evaluation_mode: "ALL",
      scope: { directions: ["OUTBOUND"] },
      conditions: [
        DEMO_SCOPE,
        { field: "custom_values.wallet_risk_score", operator: "lt", value: 75 },
        {
          field: "custom_values.wallet_sanctioned",
          operator: "ne",
          value: true,
        },
      ],
      actions: [
        {
          type: "change_status",
          value: "AWAITING_USER",
          workflow_id: stepUpWorkflowId,
        },
      ],
    },
  ];
}

/**
 * Travel Rule on, as an EU CASP with no threshold, with two safety choices for
 * a public demo on a shared application:
 * - `is_discoverable: false` keeps the demo out of other customers' directory;
 * - `vasp_attribution_enabled: false` stops blockchain analytics from naming the
 *   receiving exchange, which could otherwise route the transfer over the email
 *   rail to a real exchange's compliance inbox.
 */
export const TRAVEL_RULE_SETTINGS = {
  is_enabled: true,
  jurisdiction: "EU",
  threshold_amount: "0.00",
  auto_wallet_verification: true,
  allow_self_declaration: true,
  allow_screenshot_proof: true,
  vasp_attribution_enabled: false,
  is_discoverable: false,
  legal_name: "Kestrel Exchange (Didit demo)",
} as const;
