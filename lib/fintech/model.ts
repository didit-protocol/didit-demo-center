/**
 * The fintech demo's domain logic: what a Didit response MEANS for a neobank.
 *
 * Everything here is pure - no fetch, no cookies, no React - so the same code
 * runs in the API routes, in the browser and under `node --test`. The routes
 * hand it the real Didit payloads; it hands back the small views the app
 * renders. Nothing here invents a status: every value is read off the API.
 *
 * The demo runs one fictional bank ("Alder") against the demo organization
 * on Didit STAGING:
 *
 * - onboarding is the published staging workflow "2. KYC ACTIVE LIVENESS"
 *   (ID verification, active liveness, face match, AML screening, IP analysis);
 * - money movement posts to transaction monitoring, where the rule below holds
 *   every outbound EUR transfer of 5,000 or more for a person to review;
 * - ongoing AML monitoring is previewed with `estimate_only`, which writes
 *   nothing and bills nothing.
 */

/** The published staging workflow the bank onboards with. */
export const ONBOARDING_WORKFLOW_ID = "c076a8bb-b0a1-482a-a257-c296391fac2f";

export const CURRENCY = "EUR";

/** Prefix of every customer id (`vendor_data`) this demo creates. */
export const CUSTOMER_PREFIX = "fintech-demo-";

/**
 * Sent as `custom_properties` on every transaction. The staging demo
 * application is shared with the other industry demos, so the rule matches on
 * this property and never touches anyone else's transactions.
 */
export const DEMO_PROPERTY = { key: "demo_app", value: "fintech" } as const;

/** Outbound transfers at or above this amount go to review. */
export const REVIEW_THRESHOLD = 5000;

/** Per-visitor ceiling, so one browser cannot flood the shared application. */
export const MAX_PAYMENTS = 20;
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 50000;

/**
 * The transaction-monitoring rule the demo relies on, exactly as
 * `npm run fintech:setup` (scripts/fintech-setup.mjs) sends it to
 * `POST /v3/transactions/rules/`.
 */
export const REVIEW_RULE = {
  title: "High-value outbound transfer (fintech demo)",
  mode: "ACTIVE",
  description:
    "Outbound EUR transfers of 5,000 or more from the demos.didit.me fintech demo are held for manual review.",
  category: "finance",
  evaluation_mode: "ALL",
  scope: { transaction_types: ["finance"], directions: ["OUTBOUND"] },
  conditions: [
    { field: "currency", operator: "eq", value: CURRENCY },
    { field: "amount", operator: "gte", value: REVIEW_THRESHOLD },
    {
      field: `custom_values.${DEMO_PROPERTY.key}`,
      operator: "eq",
      value: DEMO_PROPERTY.value,
    },
  ],
  actions: [
    { type: "add_score", value: 40 },
    { type: "change_status", value: "IN_REVIEW" },
  ],
} as const;

// ── Accounts ──────────────────────────────────────────────────────────

/**
 * Countries the sign-up form offers. ISO 3166-1 alpha-2 drives the localized
 * name (Intl.DisplayNames), alpha-3 is what Didit stores on the party.
 */
export const COUNTRIES: { iso2: string; iso3: string }[] = [
  { iso2: "ES", iso3: "ESP" },
  { iso2: "DE", iso3: "DEU" },
  { iso2: "FR", iso3: "FRA" },
  { iso2: "IT", iso3: "ITA" },
  { iso2: "NL", iso3: "NLD" },
  { iso2: "PT", iso3: "PRT" },
  { iso2: "IE", iso3: "IRL" },
  { iso2: "BE", iso3: "BEL" },
  { iso2: "AT", iso3: "AUT" },
  { iso2: "PL", iso3: "POL" },
  { iso2: "SE", iso3: "SWE" },
  { iso2: "GB", iso3: "GBR" },
  { iso2: "CH", iso3: "CHE" },
  { iso2: "US", iso3: "USA" },
  { iso2: "BR", iso3: "BRA" },
  { iso2: "MX", iso3: "MEX" },
  { iso2: "IN", iso3: "IND" },
  { iso2: "JP", iso3: "JPN" },
];

export interface SignUpInput {
  name: string;
  email: string;
  country: string;
}

export type SignUpField = "name" | "email" | "country";

export type Parsed<T, E extends string> =
  { ok: true; value: T } | { ok: false; errors: E[] };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function parseSignUp(body: unknown): Parsed<SignUpInput, SignUpField> {
  const input = (body ?? {}) as Record<string, unknown>;
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const country = text(input.country).toUpperCase();
  const errors: SignUpField[] = [];

  if (name.length < 2 || name.length > 80 || !/\p{L}/u.test(name))
    errors.push("name");
  if (email.length > 120 || !EMAIL.test(email)) errors.push("email");
  if (!COUNTRIES.some((c) => c.iso3 === country)) errors.push("country");

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, value: { name, email, country } };
}

// ── Onboarding (the verification session) ────────────────────────────

/** Where the account stands, as the bank tells its customer. */
export type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "approved"
  | "review"
  | "declined"
  | "expired"
  | "unknown";

export type CheckKey = "id" | "liveness" | "face" | "aml";
export type CheckStatus = "pending" | "passed" | "review" | "failed";

export interface CheckView {
  key: CheckKey;
  status: CheckStatus;
}

export interface OnboardingView {
  sessionId: string;
  sessionNumber: number | null;
  /** The status string exactly as Didit returned it, for the operator view. */
  rawStatus: string;
  status: OnboardingStatus;
  checks: CheckView[];
}

function normalize(status: unknown): string {
  return typeof status === "string"
    ? status
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, " ")
    : "";
}

/** Maps a v3 session status onto the account state the bank shows. */
export function onboardingStatus(raw: unknown): OnboardingStatus {
  const s = normalize(raw);

  if (s === "approved") return "approved";
  if (s === "declined" || s === "rejected") return "declined";
  if (s === "in review") return "review";
  if (s === "expired" || s === "abandoned" || s === "kyc expired")
    return "expired";
  if (s === "not started") return "not_started";
  if (s === "in progress" || s === "resubmitted" || s === "pending")
    return "in_progress";

  return "unknown";
}

/** Statuses after which polling the decision stops. */
export function isSettled(status: OnboardingStatus): boolean {
  return status === "approved" || status === "declined" || status === "expired";
}

function checkStatus(raw: unknown): CheckStatus {
  const s = normalize(raw);

  if (s === "approved") return "passed";
  if (s === "declined" || s === "rejected") return "failed";
  if (s === "in review") return "review";

  return "pending";
}

/** The decision arrays each check is read from, in the order the flow runs. */
const CHECK_SOURCES: { key: CheckKey; field: string }[] = [
  { key: "id", field: "id_verifications" },
  { key: "liveness", field: "liveness_checks" },
  { key: "face", field: "face_matches" },
  { key: "aml", field: "aml_screenings" },
];

/**
 * Reduces `GET /v3/session/{id}/decision/` to statuses only.
 *
 * The decision carries the person's document data, images and AML hits. None
 * of that leaves the server: the browser gets the session status and one
 * status per check, which is all the bank's screens (and the operator panel)
 * need.
 */
export function reduceDecision(decision: unknown): OnboardingView {
  const d = (decision ?? {}) as Record<string, unknown>;

  const checks = CHECK_SOURCES.map(({ key, field }) => {
    const list = Array.isArray(d[field])
      ? (d[field] as Record<string, unknown>[])
      : [];
    const last = list[list.length - 1];

    return { key, status: checkStatus(last?.status) };
  });

  return {
    sessionId: typeof d.session_id === "string" ? d.session_id : "",
    sessionNumber:
      typeof d.session_number === "number" ? d.session_number : null,
    rawStatus: typeof d.status === "string" ? d.status : "",
    status: onboardingStatus(d.status),
    checks,
  };
}

/** Maps a next-intl locale onto the hosted flow's `language` parameter. */
export function sessionLanguage(locale: string): string | undefined {
  const map: Record<string, string> = {
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    ar: "ar",
    zh: "zh",
    ja: "ja",
    hi: "hi",
    id: "id",
    ko: "ko",
    "pt-BR": "pt-BR",
    "pt-PT": "pt",
    ru: "ru",
    ca: "ca",
  };

  // Swahili has no hosted-flow translation: let the flow use the browser's.
  return map[locale];
}

export interface AccountRef {
  id: string;
  name: string;
  email: string;
  country: string;
}

/** Body for `POST /v3/session/`. The workflow is fixed here, never by the client. */
export function sessionPayload(
  account: AccountRef,
  callback: string,
  language?: string,
) {
  return {
    workflow_id: ONBOARDING_WORKFLOW_ID,
    vendor_data: account.id,
    callback,
    callback_method: "both",
    contact_details: { email: account.email },
    metadata: { [DEMO_PROPERTY.key]: DEMO_PROPERTY.value },
    ...(language ? { language } : {}),
  };
}

// ── Payments (transaction monitoring) ─────────────────────────────────

export type PaymentKind = "deposit" | "transfer";
export type PaymentField = "kind" | "amount" | "counterparty";

export interface PaymentInput {
  kind: PaymentKind;
  /** Euros, at most two decimals. */
  amount: number;
  /** The recipient's name, transfers only. */
  counterparty: string | null;
}

function toAmount(value: unknown): number | null {
  let n = NaN;

  if (typeof value === "number") n = value;
  else if (typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value.trim()))
    n = Number(value.trim());

  if (!Number.isFinite(n)) return null;
  if (Math.round(n * 100) / 100 !== n) return null;

  return n;
}

/**
 * A typed amount as a plain decimal string, whichever marks the visitor used.
 * "," and "." both work as either separator: when both appear the last one
 * is the decimal mark; a mark that repeats, or a single one followed by
 * exactly three digits after a non-zero number, groups thousands, as in
 * "10,000" or "10.000"; any other single mark is decimal, as in "10,5" or
 * "0.125". Spaces and apostrophes are dropped. Anything else is left for
 * parsePayment to reject.
 */
export function normaliseAmount(raw: string): string {
  const value = raw.replace(/[\s\u00a0\u202f']/g, "");
  const marks = value.match(/[.,]/g) ?? [];

  if (marks.length === 0) return value;

  const last = Math.max(value.lastIndexOf(","), value.lastIndexOf("."));
  const whole = value.slice(0, last).replace(/[.,]/g, "");
  const tail = value.slice(last + 1);
  const grouping =
    new Set(marks).size === 1 &&
    (marks.length > 1 || (/^\d{3}$/.test(tail) && !/^0*$/.test(whole)));

  return grouping ? whole + tail : `${whole}.${tail}`;
}

export function parsePayment(
  body: unknown,
): Parsed<PaymentInput, PaymentField> {
  const input = (body ?? {}) as Record<string, unknown>;
  const errors: PaymentField[] = [];
  const kind = input.kind;

  if (kind !== "deposit" && kind !== "transfer") errors.push("kind");

  const amount = toAmount(input.amount);

  if (amount === null || amount < MIN_AMOUNT || amount > MAX_AMOUNT)
    errors.push("amount");

  const counterparty = text(input.counterparty);

  if (
    kind === "transfer" &&
    (counterparty.length < 2 ||
      counterparty.length > 80 ||
      !/\p{L}/u.test(counterparty))
  )
    errors.push("counterparty");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      kind: kind as PaymentKind,
      amount: amount as number,
      counterparty: kind === "transfer" ? counterparty : null,
    },
  };
}

/**
 * Body for `POST /v3/transactions/`.
 *
 * `subject.vendor_data` is the same customer id the verification session was
 * created with, which is what ties the payment to the verified person in the
 * console. A deposit comes from the customer's own account at another bank, so
 * the counterparty is the customer themself.
 */
export function transactionPayload(
  account: AccountRef,
  input: PaymentInput,
  transactionId: string,
) {
  const inbound = input.kind === "deposit";

  return {
    transaction_id: transactionId,
    transaction_category: "finance",
    transaction_details: {
      direction: inbound ? "inbound" : "outbound",
      amount: input.amount.toFixed(2),
      currency: CURRENCY,
      currency_kind: "fiat",
      action_type: input.kind,
    },
    subject: {
      entity_type: "individual",
      vendor_data: account.id,
      full_name: account.name,
      address: { country: account.country },
    },
    counterparty: {
      entity_type: "individual",
      full_name: inbound ? account.name : input.counterparty,
    },
    custom_properties: { [DEMO_PROPERTY.key]: DEMO_PROPERTY.value },
  };
}

/** What the customer sees: money in, money out, held, declined. */
export type PaymentStatus = "cleared" | "held" | "declined" | "action";

export interface RuleHit {
  title: string;
  actions: string | null;
  statusTarget: string | null;
}

export interface PaymentView {
  id: string;
  number: number | null;
  reference: string;
  kind: PaymentKind;
  direction: "in" | "out";
  amount: number;
  currency: string;
  /** The status string exactly as Didit returned it, for the operator view. */
  rawStatus: string;
  status: PaymentStatus;
  counterparty: string | null;
  createdAt: string;
  score: number;
  severity: string | null;
  reason: string | null;
  /** Rules that matched in ACTIVE mode, i.e. the ones that changed something. */
  rules: RuleHit[];
}

export function paymentStatus(raw: unknown): PaymentStatus {
  const s = normalize(raw);

  if (s === "in review") return "held";
  if (s === "declined") return "declined";
  if (s === "awaiting user") return "action";

  return "cleared";
}

/** Reduces a v3 transaction record to what the bank and its panel show. */
export function reduceTransaction(record: unknown): PaymentView {
  const t = (record ?? {}) as Record<string, unknown>;
  const parties = Array.isArray(t.parties)
    ? (t.parties as Record<string, unknown>[])
    : [];
  const counterparty = parties.find((p) => p.role === "COUNTERPARTY");
  const runs = Array.isArray(t.rule_runs)
    ? (t.rule_runs as Record<string, unknown>[])
    : [];
  const direction = normalize(t.direction) === "inbound" ? "in" : "out";
  const action = normalize(t.action_type);

  return {
    id: typeof t.uuid === "string" ? t.uuid : "",
    number:
      typeof t.transaction_number === "number" ? t.transaction_number : null,
    reference: typeof t.txn_id === "string" ? t.txn_id : "",
    kind:
      action === "deposit" || (action !== "transfer" && direction === "in")
        ? "deposit"
        : "transfer",
    direction,
    amount: Number(t.amount ?? 0) || 0,
    currency: typeof t.currency === "string" ? t.currency : CURRENCY,
    rawStatus: typeof t.status === "string" ? t.status : "",
    status: paymentStatus(t.status),
    counterparty:
      typeof counterparty?.full_name === "string"
        ? counterparty.full_name
        : null,
    createdAt: typeof t.txn_date === "string" ? t.txn_date : "",
    score: typeof t.score === "number" ? t.score : 0,
    severity: typeof t.severity === "string" ? t.severity : null,
    reason:
      typeof t.decision_reason_label === "string"
        ? t.decision_reason_label
        : null,
    rules: runs
      .filter((run) => run.matched !== false && run.is_test !== true)
      .map((run) => ({
        title: typeof run.rule_title === "string" ? run.rule_title : "",
        actions:
          typeof run.action_summary === "string" ? run.action_summary : null,
        statusTarget:
          typeof run.status_target === "string" ? run.status_target : null,
      })),
  };
}

export interface Balances {
  /** Money the customer can spend now. */
  available: number;
  /** Outbound money waiting on a review. */
  held: number;
}

/**
 * The account balance, derived from the customer's own monitored payments.
 * Inbound money counts once it cleared; outbound money leaves the available
 * balance as soon as it is sent, and sits in `held` while it is reviewed. A
 * declined payment never moved.
 */
export function balances(payments: PaymentView[]): Balances {
  let available = 0;
  let held = 0;

  for (const p of payments) {
    if (p.direction === "in") {
      if (p.status === "cleared") available += p.amount;
    } else if (p.status !== "declined") {
      available -= p.amount;
      if (p.status === "held") held += p.amount;
    }
  }

  const cents = (n: number) => Math.round(n * 100) / 100;

  return { available: cents(available), held: cents(held) };
}

/** Newest first, the way a banking app lists activity. */
export function sortPayments(payments: PaymentView[]): PaymentView[] {
  return [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** True when an outbound transfer of this amount will go to review. */
export function triggersReview(input: PaymentInput): boolean {
  return input.kind === "transfer" && input.amount >= REVIEW_THRESHOLD;
}

// ── Ongoing AML monitoring ────────────────────────────────────────────

export interface MonitoringEstimate {
  profiles: number;
  alreadyMonitored: number;
  withScreening: number;
  needsScreening: number;
  missingIdentity: number;
  screeningCostUsd: number;
  annualCostUsd: number;
}

/** Reduces the `estimate_only` answer of `POST /v3/users/aml-monitoring/`. */
export function reduceMonitoringEstimate(body: unknown): MonitoringEstimate {
  const e = (body ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);

  return {
    profiles: num(e.users_total),
    alreadyMonitored: num(e.already_enabled),
    withScreening: num(e.with_existing_aml),
    needsScreening: num(e.needing_screening),
    missingIdentity: num(e.skipped_no_identity_data),
    screeningCostUsd: num(e.estimated_screening_cost_usd),
    annualCostUsd: num(e.estimated_annual_monitoring_cost_usd),
  };
}

// ── Console (the operator side) ───────────────────────────────────────

export interface ConsoleIds {
  orgId: string;
  appId: string;
}

export interface ConsoleTarget {
  origin: string;
  /** Null when they could not be looked up (see discoverConsoleIds). */
  ids: ConsoleIds | null;
}

/**
 * Deep links into the Business Console, which addresses records by
 * organization and application id. Without the ids every link is null and
 * the panel links the console itself, naming the record to open.
 */
export function consoleLinks(target: ConsoleTarget) {
  const base = target.ids
    ? `${target.origin}/console/${encodeURIComponent(target.ids.orgId)}/${encodeURIComponent(target.ids.appId)}`
    : null;

  return {
    home: `${target.origin}/console`,
    session: (id: string) =>
      base ? `${base}/kyc/verifications/${encodeURIComponent(id)}` : null,
    transaction: (id: string) =>
      base ? `${base}/transactions/detail/${encodeURIComponent(id)}` : null,
  };
}
