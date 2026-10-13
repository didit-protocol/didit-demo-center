/**
 * The "How this uses Didit" panel: for each step of the bank's journey, the
 * Didit modules it runs and the exact API calls this demo makes, with the docs
 * page for each. Copy lives in messages/fintech/*.json under `panel.steps`;
 * this file holds only what is not language: icons, endpoints and paths.
 *
 * Every `docsPath` is checked against docs.didit.me by
 * `npm run check:docs-links`.
 */

export type StepKey =
  | "signup"
  | "verify"
  | "decision"
  | "payments"
  | "review"
  | "monitoring";

export type ModuleKey =
  | "idVerification"
  | "liveness"
  | "faceMatch"
  | "aml"
  | "ipAnalysis"
  | "transactions"
  | "rules"
  | "webhooks"
  | "manualReview"
  | "ongoing";

export interface ApiCall {
  method: "GET" | "POST" | "SDK" | "WEBHOOK";
  path: string;
  docsPath: string;
}

export interface Step {
  key: StepKey;
  modules: { key: ModuleKey; icon: string }[];
  calls: ApiCall[];
}

const M = (name: string) => `/icons/modules/${name}.svg`;
const D = (name: string) => `/icons/demo/${name}.svg`;

export const STEPS: Step[] = [
  {
    key: "signup",
    modules: [],
    calls: [],
  },
  {
    key: "verify",
    modules: [
      { key: "idVerification", icon: M("id-scan") },
      { key: "liveness", icon: M("liveness") },
      { key: "faceMatch", icon: M("face-match") },
      { key: "aml", icon: M("aml-screening") },
      { key: "ipAnalysis", icon: M("ip-analysis") },
    ],
    calls: [
      {
        method: "POST",
        path: "/v3/session/",
        docsPath: "sessions-api/create-session",
      },
      {
        method: "SDK",
        path: "DiditSdk.shared.startVerification({ url })",
        docsPath: "integration/web-sdks/javascript-sdk",
      },
    ],
  },
  {
    key: "decision",
    modules: [{ key: "manualReview", icon: D("case-management") }],
    calls: [
      {
        method: "GET",
        path: "/v3/session/{session_id}/decision/",
        docsPath: "sessions-api/retrieve-session",
      },
      {
        method: "WEBHOOK",
        path: "status.updated",
        docsPath: "integration/webhooks",
      },
    ],
  },
  {
    key: "payments",
    modules: [
      { key: "transactions", icon: M("transactions") },
      { key: "rules", icon: M("workflows") },
    ],
    calls: [
      {
        method: "POST",
        path: "/v3/transactions/",
        docsPath: "management-api/transactions/create",
      },
    ],
  },
  {
    key: "review",
    modules: [
      { key: "manualReview", icon: D("case-management") },
      { key: "webhooks", icon: D("webhooks") },
    ],
    calls: [
      {
        method: "GET",
        path: "/v3/transactions/{uuid}/",
        docsPath: "management-api/transactions/get",
      },
      {
        method: "WEBHOOK",
        path: "transaction.status.updated",
        docsPath: "transaction-monitoring/webhooks",
      },
    ],
  },
  {
    key: "monitoring",
    modules: [{ key: "ongoing", icon: M("monitoring") }],
    calls: [
      {
        method: "POST",
        path: "/v3/users/aml-monitoring/",
        docsPath: "management-api/aml-monitoring/toggle-users",
      },
    ],
  },
];

/** Overview pages the panel links per module. */
export const MODULE_DOCS: Record<ModuleKey, { docsPath: string }> = {
  idVerification: { docsPath: "core-technology/id-verification/overview" },
  liveness: { docsPath: "core-technology/liveness/overview" },
  faceMatch: { docsPath: "core-technology/face-match/overview" },
  aml: { docsPath: "core-technology/aml-screening/overview" },
  ipAnalysis: { docsPath: "core-technology/ip-analysis/overview" },
  transactions: { docsPath: "transaction-monitoring/overview" },
  rules: { docsPath: "transaction-monitoring/rules" },
  webhooks: { docsPath: "transaction-monitoring/webhooks" },
  manualReview: { docsPath: "console/manual-review" },
  ongoing: {
    docsPath: "core-technology/aml-screening/continuous-monitoring-aml-screening",
  },
};
