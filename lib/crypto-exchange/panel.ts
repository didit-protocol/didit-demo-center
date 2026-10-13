/**
 * "How this uses Didit": the side panel next to Kestrel.
 *
 * One entry per step of the exchange, naming the Didit modules it runs and the
 * exact calls the demo makes, each linked to its docs page. Every `docsPath` is
 * checked against docs.didit.me by `npm run check:docs-links`.
 */

export type PanelStepId = "onboarding" | "deposit" | "withdrawal" | "review";

export interface PanelCall {
  /** Where the call runs: the exchange's backend or the user's browser. */
  side: "server" | "browser" | "didit";
  label: string;
  detail: string;
  docsPath: string;
}

export interface PanelStep {
  id: PanelStepId;
  title: string;
  summary: string;
  modules: { label: string; icon: string }[];
  calls: PanelCall[];
}

const M = (name: string) => `/icons/modules/${name}.svg`;

export const PANEL_STEPS: PanelStep[] = [
  {
    id: "onboarding",
    title: "Sign-up: KYC and AML",
    summary:
      "One hosted session verifies the document, the face and the person behind it, then screens the name against sanctions and PEP lists.",
    modules: [
      { label: "ID Verification", icon: M("id-scan") },
      { label: "Liveness", icon: M("liveness") },
      { label: "Face Match 1:1", icon: M("face-match") },
      { label: "AML Screening", icon: M("aml-screening") },
      { label: "IP Analysis", icon: M("ip-analysis") },
    ],
    calls: [
      {
        side: "server",
        label: "POST /v3/session/",
        detail: "KYC + AML workflow, vendor_data = the user's id at the exchange.",
        docsPath: "sessions-api/create-session",
      },
      {
        side: "browser",
        label: "DiditSdk.shared.startVerification({ url })",
        detail: "Opens the hosted flow in a modal on the user's device.",
        docsPath: "integration/web-sdks/javascript-sdk",
      },
      {
        side: "server",
        label: "GET /v3/session/{id}/decision/",
        detail: "Opens, holds or rejects the account. Production listens to the status webhook instead of polling.",
        docsPath: "sessions-api/retrieve-session",
      },
    ],
  },
  {
    id: "deposit",
    title: "Deposits: wallet screening",
    summary:
      "When the chain confirms a deposit, the backend reports it as a transaction. Didit screens the sending wallet and runs the exchange's rules before the funds are credited.",
    modules: [
      { label: "Transaction Monitoring", icon: M("transactions") },
      { label: "Wallet Screening", icon: M("wallet-screening") },
    ],
    calls: [
      {
        side: "server",
        label: "POST /v3/transactions/",
        detail: "finance, direction in, includeCryptoScreening: true, the sending wallet as the counterparty.",
        docsPath: "management-api/transactions/create",
      },
      {
        side: "didit",
        label: "Wallet screening",
        detail: "Risk score, severity and exposure from the blockchain analytics provider, written to the transaction.",
        docsPath: "transaction-monitoring/wallet-screening",
      },
      {
        side: "didit",
        label: "Rules: custom_values.wallet_sanctioned, wallet_risk_score",
        detail: "Sanctioned wallets are declined, high-risk ones held for review.",
        docsPath: "transaction-monitoring/rules",
      },
    ],
  },
  {
    id: "withdrawal",
    title: "Withdrawals: Travel Rule and step-up",
    summary:
      "The user requests a withdrawal on their device. Didit screens the destination, runs the Travel Rule exchange and asks for a selfie matched against the onboarding face.",
    modules: [
      { label: "Transaction Monitoring", icon: M("transactions") },
      { label: "Wallet Screening", icon: M("wallet-screening") },
      { label: "Travel Rule", icon: M("counterparties") },
      { label: "Biometric Authentication", icon: M("biometric-authentication") },
    ],
    calls: [
      {
        side: "server",
        label: "POST /v3/transactions/sdk-token/",
        detail: "A short-lived token bound to this user. The API key never reaches the browser.",
        docsPath: "management-api/transactions/sdk-token",
      },
      {
        side: "browser",
        label: "DiditSdk.shared.submitTransaction(...)",
        detail: "POST /v1/transactions/ with device intelligence attached. autoLaunchAction: false, so a blocked transfer never asks for wallet proof.",
        docsPath: "transaction-monitoring/sdk-transaction-submission",
      },
      {
        side: "didit",
        label: "Travel Rule exchange",
        detail: "Routes the originator and beneficiary data to the receiving exchange, or asks for proof of a self-hosted wallet.",
        docsPath: "transaction-monitoring/travel-rule",
      },
      {
        side: "browser",
        label: "action_required: wallet_ownership",
        detail: "The wallet-ownership widget, opened with startVerification.",
        docsPath: "transaction-monitoring/wallet-ownership-widget",
      },
      {
        side: "browser",
        label: "action_required: verification_session",
        detail: "A rule set the transfer to AWAITING_USER with the biometric workflow; the selfie session opens with startVerification.",
        docsPath: "core-technology/biometric-auth/overview",
      },
    ],
  },
  {
    id: "review",
    title: "Compliance view",
    summary:
      "What the exchange's compliance team sees for the same transfer: the score, the rules that fired, the screening and the Travel Rule state.",
    modules: [{ label: "Console", icon: M("monitoring") }],
    calls: [
      {
        side: "server",
        label: "GET /v3/transactions/{id}/",
        detail: "The full record, read with the API key. The demo shows a trimmed copy.",
        docsPath: "management-api/transactions/get",
      },
      {
        side: "didit",
        label: "Webhooks: transaction.created, transaction.status.updated",
        detail: "How production learns that a reviewed transfer was approved or declined.",
        docsPath: "transaction-monitoring/webhooks",
      },
      {
        side: "didit",
        label: "Console: Transactions",
        detail: "The same session and transaction, side by side, for the analyst.",
        docsPath: "console/transaction-monitoring",
      },
    ],
  },
];
