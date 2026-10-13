/**
 * What the /igaming page is allowed to see of a Didit record.
 *
 * The results modal stopped reading session decisions because any session id
 * would do (PR #5). These projections are how the iGaming demo reads them
 * safely: every function takes the visitor's own player id and returns null
 * unless the record belongs to that player, and each one keeps only the fields
 * the page renders. No images, no document data, no other person's anything.
 *
 * Pure and import-free, so `npm test` loads it straight from Node.
 */

type Json = Record<string, unknown>;

const asRecord = (value: unknown): Json | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : null;

const asArray = (value: unknown): Json[] =>
  Array.isArray(value)
    ? value.map(asRecord).filter((item): item is Json => item !== null)
    : [];

const asString = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export interface IpSummary {
  country: string | null;
  countryCode: string | null;
  isVpnOrTor: boolean;
  isDataCenter: boolean;
}

export interface SessionSummary {
  sessionId: string;
  workflowId: string | null;
  status: string;
  /** Facial age estimate from the liveness step, rounded down. */
  estimatedAge: number | null;
  /** Age read from the document when the adaptive flow fell back to an ID. */
  documentAge: number | null;
  ip: IpSummary | null;
}

/** A `GET /v3/session/{id}/decision/` response, cut down for its owner. */
export function projectSession(
  decision: unknown,
  playerId: string,
): SessionSummary | null {
  const record = asRecord(decision);

  if (!record || record.vendor_data !== playerId) return null;
  const sessionId = asString(record.session_id);

  if (!sessionId) return null;

  const estimate = asArray(record.liveness_checks)
    .map((check) => asNumber(check.age_estimation))
    .find((age) => age !== null);
  const documentAge = asArray(record.id_verifications)
    .map((check) => asNumber(check.age))
    .find((age) => age !== null);
  const ip = asArray(record.ip_analyses)[0];

  return {
    sessionId,
    workflowId: asString(record.workflow_id),
    status: asString(record.status) ?? "Unknown",
    estimatedAge:
      estimate === undefined || estimate === null ? null : Math.floor(estimate),
    documentAge: documentAge ?? null,
    ip: ip
      ? {
          country: asString(ip.ip_country),
          countryCode: asString(ip.ip_country_code),
          isVpnOrTor: ip.is_vpn_or_tor === true,
          isDataCenter: ip.is_data_center === true,
        }
      : null,
  };
}

export interface RuleHit {
  title: string;
  scoreDelta: number;
  statusTarget: string | null;
}

export interface TransactionRecord {
  id: string;
  txnId: string;
  number: number | null;
  category: string;
  actionType: string;
  direction: "in" | "out";
  amount: number;
  currency: string;
  status: string;
  score: number;
  reason: string | null;
  tags: string[];
  ruleHits: RuleHit[];
  device: {
    fingerprint: string | null;
    ipCountry: string | null;
    ipCountryCode: string | null;
    isVpnOrTor: boolean;
    isDataCenter: boolean;
  };
  action: {
    type: string;
    url: string;
    sessionId: string | null;
    status: string | null;
  } | null;
  createdAt: string | null;
}

/**
 * A transaction detail (`GET /v1/transactions/{id}/`, read with the player's
 * own transaction token) as the page keeps it.
 */
export function projectTransaction(raw: unknown): TransactionRecord | null {
  const record = asRecord(raw);
  const id = asString(record?.uuid);

  if (!record || !id) return null;

  const applicant =
    asArray(record.parties).find((party) => party.role === "APPLICANT") ?? null;
  const device = asRecord(applicant?.device) ?? {};
  const network = asRecord(device.network_context) ?? {};
  const action = asRecord(record.action_required);
  const actionUrl = asString(action?.url);

  return {
    id,
    txnId: asString(record.txn_id) ?? id,
    number: asNumber(record.transaction_number),
    category: asString(record.transaction_type) ?? "",
    actionType: asString(record.action_type) ?? "",
    direction: record.direction === "OUTBOUND" ? "out" : "in",
    amount: asNumber(record.amount) ?? 0,
    currency: asString(record.currency) ?? "",
    status: asString(record.status) ?? "Unknown",
    score: asNumber(record.score) ?? 0,
    reason: asString(record.decision_reason_label),
    tags: asArray(record.tags)
      .map((tag) => asString(tag.name))
      .filter((name): name is string => name !== null),
    ruleHits: asArray(record.rule_runs)
      .filter((run) => run.matched !== false && run.is_test !== true)
      .map((run) => ({
        title: asString(run.rule_title) ?? "Rule",
        scoreDelta: asNumber(run.score_delta) ?? 0,
        statusTarget: asString(run.status_target),
      })),
    device: {
      fingerprint:
        asString(device.fingerprint) ?? asString(device.persistent_device_id),
      ipCountry: asString(network.ip_country),
      ipCountryCode: asString(network.ip_country_code),
      isVpnOrTor: network.is_vpn_or_tor === true,
      isDataCenter: network.is_data_center === true,
    },
    action:
      action && actionUrl
        ? {
            type: asString(action.type) ?? "",
            url: actionUrl,
            sessionId: asString(action.session_id),
            status: asString(action.status),
          }
        : null,
    createdAt: asString(record.txn_date) ?? asString(record.created_at),
  };
}

export interface PlayerProfile {
  internalId: string | null;
  status: string;
  name: string | null;
}

/** `GET /v3/users/{vendor_data}/`, cut down for its owner. */
export function projectUser(
  raw: unknown,
  playerId: string,
): PlayerProfile | null {
  const record = asRecord(raw);

  if (!record || record.vendor_data !== playerId) return null;

  return {
    internalId: asString(record.didit_internal_id),
    status: asString(record.status) ?? "Unknown",
    name: asString(record.effective_name) ?? asString(record.full_name),
  };
}

/**
 * The human message inside a Didit error body. DRF answers either
 * `{"detail": "..."}` or a field map such as
 * `{"vendor_data": "The individual ... is in the blocklist ..."}`.
 */
export function diditErrorMessage(body: unknown): string | null {
  const record = asRecord(body);

  if (!record) return asString(body);

  for (const key of ["detail", "message", "error"]) {
    const value = asString(record[key]);

    if (value) return value;
  }

  for (const value of Object.values(record)) {
    const text = Array.isArray(value)
      ? asString(value[0])
      : (asString(value) ?? diditErrorMessage(value));

    if (text) return text;
  }

  return null;
}
