import {
  CURRENCY,
  KYC_THRESHOLD,
  LIST_NAMES,
  RULE_TITLES,
} from "@/lib/igaming/policy";

/**
 * The "How this uses Didit" panel: for every step of the player journey, the
 * Didit modules it runs, the exact calls it makes and where they are
 * documented. The panel highlights the step the player is on.
 *
 * Every `docsPath` is checked against docs.didit.me by
 * `npm run check:docs-links`.
 */

export type StepId =
  | "register"
  | "location"
  | "cashier"
  | "step-up"
  | "bonus"
  | "safer"
  | "operator";

export interface DiditStep {
  id: StepId;
  title: string;
  player: string;
  modules: { label: string; icon: string }[];
  calls: string[];
  docs: { label: string; docsPath: string }[];
}

const M = (name: string) => `/icons/modules/${name}.svg`;

export const DIDIT_STEPS: DiditStep[] = [
  {
    id: "register",
    title: "Registration with age estimation",
    player:
      "Joins with a selfie. The adaptive workflow estimates age and asks for an ID only when the estimate lands close to 18.",
    modules: [
      { label: "Age Estimation", icon: M("age-estimation-18") },
      { label: "Liveness", icon: M("liveness") },
      { label: "ID Verification (fallback)", icon: M("id-scan") },
    ],
    calls: [
      "POST /v3/session/",
      "DiditSdk.shared.startVerification({ url })",
      "GET /v3/session/{id}/decision/",
    ],
    docs: [
      {
        label: "Age estimation",
        docsPath: "core-technology/age-estimation/overview",
      },
      { label: "Create session", docsPath: "sessions-api/create-session" },
      { label: "Web SDK", docsPath: "integration/web-sdks/javascript-sdk" },
    ],
  },
  {
    id: "location",
    title: "Licensed markets",
    player:
      "The same session's IP analysis gives the country and flags VPNs and data-centre IPs. Every cashier action is checked again from its own IP.",
    modules: [{ label: "IP Analysis", icon: M("ip-analysis") }],
    calls: [
      "decision.ip_analyses[0].ip_country_code",
      `List "${LIST_NAMES.markets}"`,
      `Rule "${RULE_TITLES.unlicensedMarket}"`,
    ],
    docs: [
      {
        label: "IP analysis",
        docsPath: "core-technology/ip-analysis/overview",
      },
      { label: "Lists API", docsPath: "management-api/lists/overview" },
    ],
  },
  {
    id: "cashier",
    title: "Deposits, bets and withdrawals",
    player:
      "Every cashier action is submitted from the browser with a token the server mints only after re-reading the approved age check. Didit adds the device fingerprint and IP and runs the rules.",
    modules: [
      { label: "Transaction Monitoring", icon: M("transactions") },
      { label: "Device Intelligence", icon: M("monitoring") },
    ],
    calls: [
      "GET /v3/session/{age check id}/decision/ (18+ gate)",
      "POST /v3/transactions/sdk-token/",
      "DiditSdk.shared.submitTransaction(...)",
      "GET /v1/transactions/{id}/",
      `Rule "${RULE_TITLES.withdrawalWithoutPlay}"`,
    ],
    docs: [
      {
        label: "SDK transaction submission",
        docsPath: "transaction-monitoring/sdk-transaction-submission",
      },
      { label: "Rules", docsPath: "transaction-monitoring/rules" },
    ],
  },
  {
    id: "step-up",
    title: `ID verification at ${KYC_THRESHOLD.toLocaleString("en")} ${CURRENCY}`,
    player:
      "The deposit that takes the total past the threshold comes back AWAITING_USER with a verification session. Passing it approves the deposit.",
    modules: [
      { label: "ID Verification", icon: M("id-scan") },
      { label: "Face Match 1:1", icon: M("face-match") },
    ],
    calls: [
      `Rule "${RULE_TITLES.kycStepUp}"`,
      "result.actionRequired.url",
      "DiditSdk.shared.startVerification({ url })",
      `POST /v3/lists/{id}/entries/ (${LIST_NAMES.verified})`,
    ],
    docs: [
      {
        label: "Required user actions",
        docsPath: "transaction-monitoring/integration-guide",
      },
      {
        label: "ID verification",
        docsPath: "core-technology/id-verification/overview",
      },
    ],
  },
  {
    id: "bonus",
    title: "Bonus abuse: one device, two accounts",
    player:
      "A second account opened on the same browser claims the welcome bonus. Same device fingerprint, so Didit holds the bonus for review.",
    modules: [{ label: "Device Intelligence", icon: M("monitoring") }],
    calls: [
      `Rule "${RULE_TITLES.bonusSharedDevice}"`,
      "distinct_count(subject_vendor_data) per subject_device_fingerprint",
    ],
    docs: [
      {
        label: "iGaming rules library",
        docsPath: "transaction-monitoring/rules-library",
      },
      { label: "Rules API", docsPath: "transaction-monitoring/rules-api" },
    ],
  },
  {
    id: "safer",
    title: "Safer gambling and self-exclusion",
    player:
      "Deposit limits are recorded as limit-change transactions. Self-exclusion pays the balance back as a monitored withdrawal, then blocks the player on Didit, so their next deposit is refused by the API itself.",
    modules: [
      { label: "Transaction Monitoring", icon: M("transactions") },
      { label: "User Blocklist", icon: M("reusable-kyc") },
    ],
    calls: [
      "submitTransaction({ category: 'gamblingLimitChange' })",
      "submitTransaction({ actionType: 'withdrawal' }) (payout)",
      "PATCH /v3/users/{vendor_data}/update-status/",
    ],
    docs: [
      {
        label: "Update user status",
        docsPath: "management-api/users/update-status",
      },
      { label: "User blocklist", docsPath: "entities/users/blocklist" },
    ],
  },
  {
    id: "operator",
    title: "The operator's side",
    player:
      "Each record links to the Console: the session, the transaction with its rule hits, and the player's profile.",
    modules: [
      { label: "Business Console", icon: "/icons/demo/case-management.svg" },
    ],
    calls: [
      "GET /v3/users/{vendor_data}/",
      "Webhook transaction.status.updated",
    ],
    docs: [
      {
        label: "Transactions in the Console",
        docsPath: "transaction-monitoring/console",
      },
      { label: "Webhooks", docsPath: "transaction-monitoring/webhooks" },
    ],
  },
];
