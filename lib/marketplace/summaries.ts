/**
 * The marketplace's server routes never forward a Didit payload as-is. They
 * reduce each one to the handful of fields its screen renders, so a session
 * token, a document image, a date of birth or another visitor's identifier
 * can never reach the browser by accident.
 *
 * The shapes read here are the v3 responses:
 * https://docs.didit.me/management-api/transactions/get
 * https://docs.didit.me/business-verification/response-schema
 */
import { ACTIONS, DEMO_APP } from "./setup.ts";

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const num = (value: unknown): number | null => {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};

const list = (value: unknown): Json[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

/* ── Transactions ─────────────────────────────────────────────────── */

export type TransactionKind = "signup" | "purchase" | "payout" | "other";

export interface RuleHit {
  title: string;
  scoreDelta: number;
  statusTarget: string | null;
}

export interface TransactionSummary {
  uuid: string;
  txnId: string;
  kind: TransactionKind;
  status: string;
  score: number;
  severity: string | null;
  reason: string | null;
  amount: number;
  currency: string;
  direction: string;
  at: string;
  /** The subject's vendor_data: always one of this browser's identities. */
  subject: string;
  /** The listing an order was for, when it was one. */
  listing: string | null;
  label: string | null;
  /** Rules that matched and were live (TEST-mode runs never act). */
  rules: RuleHit[];
  tags: string[];
  /** The verification a rule asked the customer to complete, while it waits. */
  verification: { url: string; sessionId: string; status: string } | null;
}

function kindOf(actionType: string | null): TransactionKind {
  switch (actionType) {
    case ACTIONS.signup:
      return "signup";
    case ACTIONS.purchase:
      return "purchase";
    case ACTIONS.payout:
      return "payout";
    default:
      return "other";
  }
}

/** The APPLICANT party - the transaction's subject. */
export function subjectParty(raw: Json): Json | null {
  return list(raw.parties).find((party) => party.role === "APPLICANT") ?? null;
}

export function subjectVendor(raw: Json): string | null {
  return str(subjectParty(raw)?.vendor_data) ?? str(raw.vendor_data);
}

/** True for a transaction this demo submitted (`props.demo_app`). */
export function isMarketplaceTransaction(raw: Json): boolean {
  return isRecord(raw.props) && raw.props.demo_app === DEMO_APP;
}

export function summarizeTransaction(raw: Json): TransactionSummary {
  const props = isRecord(raw.props) ? raw.props : {};
  const action = isRecord(raw.action_required) ? raw.action_required : null;

  return {
    uuid: String(raw.uuid ?? ""),
    txnId: String(raw.txn_id ?? ""),
    kind: kindOf(str(raw.action_type)),
    status: String(raw.status ?? ""),
    score: num(raw.score) ?? 0,
    severity: str(raw.severity),
    reason: str(raw.decision_reason_label),
    amount: num(raw.amount) ?? 0,
    currency: str(raw.currency) ?? "EUR",
    direction: str(raw.direction) ?? "",
    at: str(raw.txn_date) ?? str(raw.created_at) ?? "",
    subject: subjectVendor(raw) ?? "",
    listing: str(props.listing),
    label: str(raw.payment_details),
    rules: list(raw.rule_runs)
      .filter((run) => run.matched === true && run.is_test !== true)
      .map((run) => ({
        title: str(run.rule_title) ?? "Rule",
        scoreDelta: num(run.score_delta) ?? 0,
        statusTarget: str(run.status_target),
      })),
    tags: list(raw.tags)
      .map((tag) => str(tag.name))
      .filter((name): name is string => Boolean(name)),
    verification:
      action &&
      action.type === "verification_session" &&
      str(action.url) &&
      str(action.session_id)
        ? {
            url: String(action.url),
            sessionId: String(action.session_id),
            status: str(action.status) ?? "Not Started",
          }
        : null,
  };
}

/* ── KYB decision ────────────────────────────────────────────────── */

export interface KeyPerson {
  name: string;
  roles: string[];
  ownership: number | null;
  /** Their own ID check, when the workflow asks for one. */
  kycStatus: string | null;
  /** Link to that check while it is unfinished, so it can be completed. */
  kycUrl: string | null;
  skipped: boolean;
}

export interface KybSummary {
  sessionId: string;
  status: string;
  /** Hosted link to continue the verification while it is open. */
  url: string | null;
  company: {
    name: string | null;
    number: string | null;
    country: string | null;
    registryStatus: string | null;
    type: string | null;
    incorporated: string | null;
    address: string | null;
    fromRegistry: boolean | null;
  } | null;
  /** Feature by feature, in workflow order. */
  steps: { key: "registry" | "people" | "documents" | "aml"; status: string }[];
  officers: { name: string; role: string | null }[];
  owners: { name: string; ownership: number | null }[];
  people: KeyPerson[];
  documents: { type: string; status: string }[];
  amlHits: number | null;
  reviews: { status: string; comment: string | null; at: string | null }[];
  createdAt: string | null;
}

const OPEN_STATUSES = ["not started", "in progress", "resubmitted"];

const isOpen = (status: string | null) =>
  !!status && OPEN_STATUSES.includes(status.trim().toLowerCase());

function personName(row: Json): string {
  return (
    str(row.name) ??
    [str(row.first_name), str(row.last_name)].filter(Boolean).join(" ")
  );
}

export function summarizeKyb(raw: Json): KybSummary {
  const registry = list(raw.registry_checks)[0] ?? null;
  const company =
    registry && isRecord(registry.company) ? registry.company : null;
  const people = list(raw.key_people_checks)[0] ?? null;
  const submitted =
    people && isRecord(people.submitted) ? list(people.submitted.parties) : [];
  const documents = list(raw.document_verifications);
  const aml = list(raw.aml_screenings);
  const status = String(raw.status ?? "");

  const steps: KybSummary["steps"] = [];

  if (registry)
    steps.push({ key: "registry", status: String(registry.status ?? "") });
  if (people)
    steps.push({ key: "people", status: String(people.status ?? "") });
  if (documents[0])
    steps.push({ key: "documents", status: String(documents[0].status ?? "") });
  if (aml[0]) steps.push({ key: "aml", status: String(aml[0].status ?? "") });

  return {
    sessionId: String(raw.session_id ?? ""),
    status,
    url: isOpen(status) ? str(raw.session_url) : null,
    company: company
      ? {
          name: str(company.company_name),
          number: str(company.registration_number),
          country: str(company.country_code),
          registryStatus: str(company.registry_status),
          type: str(company.company_type),
          incorporated: str(company.incorporation_date),
          address: str(company.registered_address),
          fromRegistry:
            typeof company.is_from_registry === "boolean"
              ? company.is_from_registry
              : null,
        }
      : null,
    steps,
    officers: list(company?.officers)
      .filter((officer) => officer.is_active !== false)
      .map((officer) => ({
        name: personName(officer),
        role: str(officer.designation) ?? str(officer.role),
      }))
      .filter((officer) => officer.name)
      .slice(0, 8),
    owners: list(company?.beneficial_owners)
      .filter((owner) => owner.is_active !== false)
      .map((owner) => ({
        name: personName(owner) || (str(owner.company_name) ?? ""),
        ownership:
          num(owner.effective_ownership_percent) ??
          num(owner.ownership_max_shares),
      }))
      .filter((owner) => owner.name)
      .slice(0, 8),
    people: submitted
      .map((party) => {
        const kycStatus = str(party.kyc_session_status);

        return {
          name: personName(party),
          roles: [str(party.role), str(party.position)].filter(
            (role): role is string => Boolean(role),
          ),
          ownership: num(party.ownership_percent),
          kycStatus,
          kycUrl:
            isOpen(kycStatus) && party.kyc_session_deleted !== true
              ? str(party.kyc_session_url)
              : null,
          skipped: party.is_skipped === true,
        };
      })
      .filter((person) => person.name)
      .slice(0, 8),
    documents: documents
      .flatMap((group) => list(group.items))
      .map((item) => ({
        type: str(item.document_type) ?? "document",
        status: String(item.status ?? ""),
      }))
      .slice(0, 8),
    amlHits: aml[0] ? num(aml[0].total_hits) : null,
    reviews: list(raw.reviews)
      .map((review) => ({
        status: String(review.new_status ?? ""),
        comment: str(review.comment),
        at: str(review.created_at),
      }))
      .slice(0, 3),
    createdAt: str(raw.created_at),
  };
}
