/**
 * Kestrel's account opening, read off a Didit session decision.
 *
 * Sign-up runs one hosted session on the KYC + AML workflow (ID verification,
 * liveness, face match, AML screening, IP analysis). The exchange then reads
 * `GET /v3/session/{id}/decision/` from its backend and opens, holds or
 * rejects the account. Self-contained so `node --test` can load it.
 *
 * https://docs.didit.me/sessions-api/retrieve-session
 */

export type AccountStage =
  "approved" | "review" | "declined" | "processing" | "unknown";

export interface AccountView {
  sessionId: string;
  status: string;
  stage: AccountStage;
  /** The name on the verified document; the exchange uses it as the Travel
   * Rule originator and the transactions' subject. */
  fullName: string | null;
  /** "Passport · Portugal": the verified document, for the live layer. */
  document: string | null;
  checks: { label: string; status: string | null }[];
  amlHits: number | null;
  /** When Didit opened the session (`created_at`), for an open session. */
  startedAt: string | null;
}

type Raw = Record<string, unknown>;

const first = (value: unknown): Raw =>
  Array.isArray(value) && value[0] && typeof value[0] === "object"
    ? (value[0] as Raw)
    : {};
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const PROCESSING = [
  "not started",
  "in progress",
  "pending",
  "processing",
  "resubmitted",
];

export function accountStage(status: string): AccountStage {
  const normalized = status.trim().toLowerCase().replace(/[_-]+/g, " ");

  if (normalized === "approved") return "approved";
  if (normalized === "declined") return "declined";
  if (normalized.includes("review")) return "review";
  if (PROCESSING.includes(normalized)) return "processing";

  return "unknown";
}

/** Only what the account screen needs - no document images, no addresses. */
export function toAccountView(decision: Raw): AccountView {
  const id = first(decision.id_verifications);
  const aml = first(decision.aml_screenings);
  const status = String(decision.status ?? "");
  const firstName = text(id.first_name);
  const lastName = text(id.last_name);
  const fullName =
    text(id.full_name) ??
    (firstName || lastName
      ? [firstName, lastName].filter(Boolean).join(" ")
      : null);

  const documentType = text(id.document_type);
  const country = text(id.issuing_state_name) ?? text(id.issuing_state);

  return {
    sessionId: String(decision.session_id ?? ""),
    status,
    stage: accountStage(status),
    fullName,
    document: documentType
      ? [
          documentType.charAt(0).toUpperCase() +
            documentType.slice(1).toLowerCase(),
          country,
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
    checks: [
      { label: "ID document", status: text(id.status) },
      {
        label: "Liveness",
        status: text(first(decision.liveness_checks).status),
      },
      {
        label: "Face match",
        status: text(first(decision.face_matches).status),
      },
      { label: "AML screening", status: text(aml.status) },
    ],
    amlHits: typeof aml.total_hits === "number" ? aml.total_hits : null,
    startedAt: text(decision.created_at),
  };
}

/**
 * The top bar's avatar: up to two initials of the verified name, else of the
 * email's local part ("avery.quinn@…" is "AQ"). A new account has no photo.
 */
export function accountInitials(name: string | null | undefined): string {
  const words = (name ?? "")
    .trim()
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter((word) => /^\p{L}/u.test(word));
  const letters =
    words.length > 1
      ? words[0].charAt(0) + words[words.length - 1].charAt(0)
      : (words[0] ?? "").charAt(0);

  return letters.toUpperCase() || "K";
}

export interface AccountCopy {
  title: string;
  body: string;
}

/** What the exchange tells the user about their account. */
export function accountCopy(
  view: Pick<AccountView, "stage" | "status" | "amlHits">,
): AccountCopy {
  switch (view.stage) {
    case "approved":
      return {
        title: "Your account is open",
        body: "Identity verified and screened. Deposits and withdrawals are unlocked.",
      };
    case "review":
      return {
        title: "Your account is under review",
        body:
          view.amlHits && view.amlHits > 0
            ? `AML screening returned ${view.amlHits} possible ${view.amlHits === 1 ? "match" : "matches"}. A compliance analyst decides before you can trade, so deposits and withdrawals stay locked.`
            : "A compliance analyst is checking your verification before you can trade, so deposits and withdrawals stay locked.",
      };
    case "declined":
      return {
        title: "We could not open your account",
        body: "The identity verification was declined, so this account cannot trade.",
      };
    case "processing":
      return {
        title: "Finishing your verification",
        body: "Your verification has not finished yet. Continue it from your account to pick up where you left off.",
      };
    default:
      return {
        title: view.status || "No status yet",
        body: "Didit returned a status this demo does not interpret. Open the session in the Didit console to see its outcome.",
      };
  }
}
