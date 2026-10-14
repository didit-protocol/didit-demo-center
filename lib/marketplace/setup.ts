/**
 * What the marketplace needs to exist on the Didit application behind
 * API_KEY: one KYB workflow and three transaction-monitoring rules.
 *
 * `scripts/marketplace-setup.mjs` creates them (idempotently, the workflow by
 * name and the rules by title), and the "How this uses Didit" panel describes
 * the same objects, so the page and the application can never disagree about
 * what a rule does.
 *
 * Every rule matches only transactions that carry this demo's
 * `custom_properties.demo_app = "marketplace"`, so other traffic on a shared
 * application is never touched.
 */
import { HIGH_VALUE_THRESHOLD } from "./catalog.ts";

export const DEMO_APP = "marketplace";

/** `action_type` values the demo submits. */
export const ACTIONS = {
  signup: "seller_signup",
  purchase: "purchase",
  payout: "payout",
} as const;

export const KYB_WORKFLOW_LABEL = "Demo - Marketplace seller KYB";

/**
 * The seller KYB: company registry at the UBO tier (shareholders and UBOs
 * discovered from the registry), key people with an ID check for every
 * representative and owner, and company documents. `personWorkflowUuid` is the
 * KYC workflow each key person's child session runs (the application's free
 * KYC workflow).
 */
export function kybWorkflowDefinition(
  countries: string[],
  personWorkflowUuid: string,
) {
  return {
    workflow_label: KYB_WORKFLOW_LABEL,
    status: "published",
    features: [
      {
        feature: "KYB_REGISTRY",
        config: {
          kyb_registry_countries_config: Object.fromEntries(
            countries.map((code) => [code, { enabled: true, tier: "ubo" }]),
          ),
        },
      },
      {
        feature: "KYB_KEY_PEOPLE",
        config: {
          kyb_key_people_prefill_from_registry: true,
          kyb_require_officer_kyc: true,
          kyb_officer_verification_workflow: personWorkflowUuid,
          kyb_require_ubo_kyc: true,
          kyb_ubo_verification_workflow: personWorkflowUuid,
          kyb_shareholder_verification_workflow: personWorkflowUuid,
          kyb_ubo_ownership_threshold: 25,
          kyb_reuse_verified_individuals: true,
        },
      },
      {
        feature: "KYB_DOCUMENTS",
        config: { kyb_required_document_groups: ["LEGAL_PRESENCE"] },
      },
    ],
  };
}

/** The fields the setup reads from a GET /v3/workflows/ row. */
export interface WorkflowRow {
  workflow_id: string;
  workflow_label: string | null;
  workflow_type: string | null;
  /** The features joined with " + ", e.g. "KYB_REGISTRY + KYB_DOCUMENTS". */
  features: string | null;
  status: string;
  version: number;
  is_archived: boolean;
}

/** This demo's own KYB workflow, found by name. */
export function findDemoKybWorkflow(rows: WorkflowRow[]): WorkflowRow | null {
  return (
    rows.find(
      (row) => row.workflow_label === KYB_WORKFLOW_LABEL && !row.is_archived,
    ) ?? null
  );
}

/**
 * Any other published KYB workflow on the application: the fallback when the
 * demo's own one cannot be created. Newest first, as the API lists them.
 */
export function findExistingKybWorkflow(
  rows: WorkflowRow[],
): WorkflowRow | null {
  return (
    rows.find(
      (row) =>
        !row.is_archived &&
        row.status === "published" &&
        (row.workflow_type === "kyb" ||
          (row.features ?? "").includes("KYB_REGISTRY")),
    ) ?? null
  );
}

/**
 * An application holds at most 50 workflows, archived ones included, and
 * POST /v3/workflows/ answers 400 with this message once it is full.
 */
export function isWorkflowLimitError(body: unknown): boolean {
  return /Maximum of \d+ workflows per application/.test(JSON.stringify(body));
}

const demoOnly = {
  field: "custom_values.demo_app",
  operator: "eq",
  value: DEMO_APP,
};

export const RULE_TITLES = {
  highValue: "Marketplace demo: high-value order needs an age check",
  sharedDeviceSignup: "Marketplace demo: second shop on one device",
  sharedDevicePayout: "Marketplace demo: payout from a shared device",
} as const;

/** The three rules, given the age-check workflow the step-up opens. */
export function ruleDefinitions(ageWorkflowId: string) {
  return [
    {
      title: RULE_TITLES.highValue,
      description: `Orders of EUR ${HIGH_VALUE_THRESHOLD.toLocaleString("en")} or more wait until the buyer passes an age check.`,
      category: "finance",
      evaluation_mode: "ALL",
      scope: {
        transaction_types: ["finance"],
        directions: ["INBOUND"],
        action_types: [ACTIONS.purchase],
      },
      conditions: [
        demoOnly,
        { field: "currency", operator: "eq", value: "EUR" },
        { field: "amount", operator: "gte", value: HIGH_VALUE_THRESHOLD },
      ],
      aggregation: [],
      actions: [
        {
          type: "change_status",
          value: "AWAITING_USER",
          workflow_id: ageWorkflowId,
        },
        { type: "add_tags", tag_name: "HIGH_VALUE_ORDER" },
      ],
    },
    {
      title: RULE_TITLES.sharedDeviceSignup,
      description:
        "A seller signing up from a device another shop already signed up from is held for review.",
      category: "fraud",
      evaluation_mode: "ALL",
      scope: { action_types: [ACTIONS.signup] },
      conditions: [
        demoOnly,
        {
          field: "subject_device_fingerprint",
          operator: "exists",
          value: true,
        },
      ],
      aggregation: [
        {
          metric: "distinct_count",
          field: "subject_vendor_data",
          operator: "gte",
          value: 2,
          window: "30d",
          filters: {
            action_type: ACTIONS.signup,
            subject_device_fingerprint: "__current__",
          },
        },
      ],
      actions: [
        { type: "add_score", value: 70 },
        { type: "change_status", value: "IN_REVIEW" },
        { type: "add_tags", tag_name: "SHARED_DEVICE" },
        {
          type: "add_note",
          note: "Another shop signed up from this device in the last 30 days.",
        },
      ],
    },
    {
      title: RULE_TITLES.sharedDevicePayout,
      description:
        "Payouts requested from a device two or more shops signed up from are held for review.",
      category: "fraud",
      evaluation_mode: "ALL",
      scope: { directions: ["OUTBOUND"], action_types: [ACTIONS.payout] },
      conditions: [
        demoOnly,
        {
          field: "subject_device_fingerprint",
          operator: "exists",
          value: true,
        },
      ],
      aggregation: [
        {
          metric: "distinct_count",
          field: "subject_vendor_data",
          operator: "gte",
          value: 2,
          window: "30d",
          filters: {
            action_type: ACTIONS.signup,
            subject_device_fingerprint: "__current__",
          },
        },
      ],
      actions: [
        { type: "add_score", value: 60 },
        { type: "change_status", value: "IN_REVIEW" },
        { type: "add_tags", tag_name: "SHARED_DEVICE_PAYOUT" },
      ],
    },
  ];
}
