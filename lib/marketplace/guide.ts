/**
 * "How this uses Didit": per chapter, the modules it runs and the exact calls
 * it makes, each linked to its docs page.
 *
 * Every `docsPath` is a page on docs.didit.me and is re-checked by
 * `npm run check:docs-links`, which reads them straight out of this file.
 */
export type ChapterId = "seller" | "buyer" | "payouts" | "fraud" | "operator";

export interface GuideCall {
  /** Where it runs: the demo's server (API key) or the browser (web SDK). */
  side: "server" | "browser" | "didit";
  call: string;
  detail: string;
  docsPath: string;
}

export interface ChapterGuide {
  id: ChapterId;
  number: number;
  title: string;
  short: string;
  modules: string[];
  calls: GuideCall[];
}

export const GUIDE: ChapterGuide[] = [
  {
    id: "seller",
    number: 1,
    title: "Seller onboarding",
    short: "Sellers",
    modules: [
      "Business verification (KYB)",
      "Key people and UBOs",
      "KYB documents",
      "Company AML",
      "ID verification for representatives",
      "Transaction monitoring",
    ],
    calls: [
      {
        side: "server",
        call: "POST /v3/transactions/sdk-token/",
        detail:
          "Mints a short-lived token for the shop's vendor_data, so the browser can report the sign-up without the API key.",
        docsPath: "transaction-monitoring/sdk-transaction-submission",
      },
      {
        side: "browser",
        call: "DiditSdk.shared.submitTransaction()",
        detail:
          "Sends the seller_signup event with the device fingerprint the SDK attaches.",
        docsPath: "transaction-monitoring/sdk-transaction-submission",
      },
      {
        side: "server",
        call: "POST /v3/session/",
        detail:
          "Creates the KYB session for the seller's KYB workflow, with the company in expected_details.",
        docsPath: "sessions-api/create-session",
      },
      {
        side: "browser",
        call: "DiditSdk.shared.startVerification({ url })",
        detail:
          "Opens the hosted flow: registry search, key people, documents. Company AML runs on its own.",
        docsPath: "integration/web-sdks/javascript-sdk",
      },
      {
        side: "didit",
        call: "Key people KYC",
        detail:
          "Each representative or owner the seller submits gets their own ID check, linked to the KYB.",
        docsPath: "business-verification/key-people",
      },
      {
        side: "server",
        call: "GET /v3/session/{id}/decision/",
        detail:
          "Reads registry_checks, key_people_checks and document_verifications. Payouts unlock on Approved.",
        docsPath: "business-verification/response-schema",
      },
    ],
  },
  {
    id: "buyer",
    number: 2,
    title: "Buyer checkout",
    short: "Buyers",
    modules: ["Transaction monitoring", "Age estimation", "ID verification"],
    calls: [
      {
        side: "browser",
        call: "submitTransaction({ category: 'finance', actionType: 'purchase' })",
        detail:
          "Every order is monitored. Orders under EUR 1,000 go straight through.",
        docsPath: "transaction-monitoring/sdk-transaction-submission",
      },
      {
        side: "didit",
        call: "Rule: change_status AWAITING_USER",
        detail:
          "Orders of EUR 1,000 or more wait for the buyer: the rule creates an age check session for them.",
        docsPath: "transaction-monitoring/rules",
      },
      {
        side: "browser",
        call: "startVerification({ url: actionRequired.url })",
        detail:
          "Opens that session: a selfie age estimate, with an ID check only when the estimate is close to the limit.",
        docsPath: "core-technology/age-estimation/overview",
      },
      {
        side: "server",
        call: "GET /v3/transactions/{uuid}/",
        detail:
          "The order follows the check: approved, declined or sent to review.",
        docsPath: "management-api/transactions/get",
      },
    ],
  },
  {
    id: "payouts",
    number: 3,
    title: "Payouts",
    short: "Payouts",
    modules: ["Business verification (KYB)", "Transaction monitoring"],
    calls: [
      {
        side: "server",
        call: "GET /v3/session/{id}/decision/",
        detail:
          "The demo's server refuses a payout token until the shop's KYB is Approved.",
        docsPath: "sessions-api/retrieve-session",
      },
      {
        side: "browser",
        call: "submitTransaction({ direction: 'out', actionType: 'payout' })",
        detail:
          "The payout is scored by every active rule; the response carries the status and score.",
        docsPath: "transaction-monitoring/transactions",
      },
      {
        side: "didit",
        call: "transaction.status.updated",
        detail:
          "In production your backend releases the money when this webhook says APPROVED.",
        docsPath: "transaction-monitoring/webhooks",
      },
    ],
  },
  {
    id: "fraud",
    number: 4,
    title: "Fraud: a second shop",
    short: "Fraud",
    modules: ["Device intelligence", "Transaction monitoring", "Networks"],
    calls: [
      {
        side: "browser",
        call: "X-Didit-PID / fingerprint_v2",
        detail:
          "The web SDK attaches the same persistent device id to every submission from this browser.",
        docsPath: "transaction-monitoring/sdk-transaction-submission",
      },
      {
        side: "didit",
        call: "Rule: distinct_count(subject_vendor_data) per device",
        detail:
          "Two shops signing up from one device hold the newer one for review and freeze payouts from it.",
        docsPath: "transaction-monitoring/rules",
      },
      {
        side: "didit",
        call: "Networks",
        detail:
          "Accounts that share a device, IP or face are grouped into a fraud network for the operator.",
        docsPath: "console/networks",
      },
    ],
  },
  {
    id: "operator",
    number: 5,
    title: "Operator view",
    short: "Operator",
    modules: ["Transaction monitoring", "Networks", "Case review"],
    calls: [
      {
        side: "server",
        call: "GET /v3/transactions/{uuid}/",
        detail:
          "rule_runs, score, severity, tags and the device behind the held transaction.",
        docsPath: "management-api/transactions/get",
      },
      {
        side: "server",
        call: "GET .../transactions/{uuid}/parties/{party}/networks/",
        detail: "Which fraud networks the party belongs to, and through which signals.",
        docsPath: "management-api/networks/membership-lookup",
      },
      {
        side: "server",
        call: "PATCH /v3/session/{id}/update-status/",
        detail:
          "An analyst approves or declines a KYB that is waiting on review.",
        docsPath: "sessions-api/update-status",
      },
    ],
  },
];

export function getChapter(id: string | null | undefined): ChapterGuide {
  return GUIDE.find((chapter) => chapter.id === id) ?? GUIDE[0];
}

export function isChapterId(value: string | null | undefined): value is ChapterId {
  return GUIDE.some((chapter) => chapter.id === value);
}
