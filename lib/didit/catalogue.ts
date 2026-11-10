/**
 * The catalogue's own session calls, behind `/api/verification` (every hosted
 * demo, /accs and /ibeta) and `/api/didit-captcha/*`.
 *
 * Both routes are public, so nothing a visitor sends ever becomes part of an
 * API path: a session id must be a UUID before it is used, the path is built
 * with `apiPath`, and `callDidit` refuses any path that would resolve to a
 * different endpoint. A decision is only returned when Didit answered for the
 * very session that was asked for.
 *
 * No `@/` imports: `npm test` loads it straight from Node.
 */

import {
  apiPath,
  callDidit,
  didit,
  type DiditEnv,
  type DiditResult,
  isUuid,
} from "./server.ts";

/** What a route sends back: the HTTP status and the JSON body. */
export interface Answer {
  status: number;
  body: Record<string, unknown>;
}

/** Demo policy: a session's results stay readable for 60 minutes. */
export const DECISION_TTL_MS = 60 * 60 * 1000;

const NOT_A_SESSION: Answer = {
  status: 400,
  body: { error: "That is not a session id." },
};

/** True when Didit answered with the decision of `sessionId` itself. */
function isDecisionOf(data: unknown, sessionId: string): boolean {
  const answered = (data as Record<string, unknown> | null)?.session_id;

  return (
    typeof answered === "string" &&
    answered.toLowerCase() === sessionId.toLowerCase()
  );
}

/**
 * The API's own reason for refusing a request. Besides `detail`, a validation
 * error comes back keyed by field - `{"workflow_id": "Invalid workflow_id."}`
 * or `{"non_field_errors": ["..."]}` - so the first message found wins, with
 * its field name when the message alone would not say what was wrong.
 */
export function apiErrorMessage(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;

  const fields = result as Record<string, unknown>;

  for (const key of ["detail", "error", "message"]) {
    const message = fields[key];

    if (typeof message === "string" && message) return message;
  }

  for (const [field, value] of Object.entries(fields)) {
    const message = Array.isArray(value) ? value[0] : value;

    if (typeof message !== "string" || !message) continue;

    return field === "non_field_errors" || message.includes(field)
      ? message
      : `${field}: ${message}`;
  }

  return null;
}

/**
 * `GET /api/verification?sessionId=`: the decision of one session the
 * catalogue started, while it is under an hour old, without `session_number`.
 */
export async function readCatalogueDecision(
  sessionId: string | null,
  env?: DiditEnv,
  now: number = Date.now(),
): Promise<Answer> {
  if (!isUuid(sessionId)) return NOT_A_SESSION;

  const result = await didit.sessions.decision(sessionId, env);

  if (!result.ok || !isDecisionOf(result.data, sessionId)) {
    return result.status === 404
      ? {
          status: 404,
          body: { error: "No decision found for this session id." },
        }
      : {
          status: 502,
          body: {
            error:
              "The decision could not be fetched from the verification API.",
          },
        };
  }

  const decision = result.data as Record<string, unknown>;
  const createdAt = Date.parse(String(decision.created_at));

  if (!Number.isFinite(createdAt) || now - createdAt > DECISION_TTL_MS) {
    return { status: 410, body: { error: "Session results have expired" } };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { session_number, ...withoutSessionNumber } = decision;

  return { status: 200, body: withoutSessionNumber };
}

/**
 * `POST /api/verification`: a hosted session for one catalogue demo. The API's
 * own refusal is passed on so the catalogue can say why (unpublished workflow,
 * no balance, bad portrait).
 */
export async function createCatalogueSession(
  body: unknown,
  env?: DiditEnv,
): Promise<Answer> {
  const input = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;

  if (!input.callback || !input.vendor_data || !input.workflow_id) {
    return {
      status: 400,
      body: { error: "Callback URL, vendor data and workflow ID are required" },
    };
  }

  const result = await callDidit<Record<string, unknown>>(
    "POST",
    "/v3/session/",
    {
      workflow_id: input.workflow_id,
      vendor_data: input.vendor_data,
      callback: input.callback,
      callback_method: "both",
      ...(input.portrait_image ? { portrait_image: input.portrait_image } : {}),
    },
    env,
  );

  if (!result.ok) {
    return {
      status: result.status || 500,
      body: {
        error:
          apiErrorMessage(result.data) ||
          "Failed to create verification session",
      },
    };
  }

  return { status: 200, body: result.data ?? {} };
}

/**
 * The CAPTCHA widget's decision read (`/api/didit-captcha/verify` and
 * `/submit`), or null when `sessionId` is not a session id.
 */
export async function captchaDecision(
  sessionId: unknown,
  env?: DiditEnv,
): Promise<DiditResult<Record<string, unknown>> | null> {
  if (!isUuid(sessionId)) return null;

  const result = await callDidit<Record<string, unknown>>(
    "GET",
    apiPath`/v2/session/${sessionId}/decision/`,
    undefined,
    env,
  );

  return result.ok && !isDecisionOf(result.data, sessionId)
    ? { ...result, ok: false, status: 502, data: null }
    : result;
}
