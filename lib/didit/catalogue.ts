/**
 * The catalogue's own session calls, behind `/api/verification` (every hosted
 * demo, /accs and /ibeta) and `/api/didit-captcha/*`.
 *
 * Both routes are public and anonymous, so the server decides everything that
 * says whose session it is:
 * - `vendor_data` is a fresh random id per session, never a value the browser
 *   sends. Didit hands an unfinished session back to whoever creates one with
 *   the same workflow and `vendor_data`, so a caller-chosen value let anyone
 *   take over another visitor's session and its token.
 * - The callback is always a page of this site; only its path and query come
 *   from the browser.
 * - Nothing a visitor sends becomes part of an API path: a session id must be
 *   a UUID, the path is built with `apiPath`, and `callDidit` refuses any path
 *   that would resolve to a different endpoint.
 * There is no public read of a session's decision: the results view shows the
 * status the hosted flow's redirect carries, and the CAPTCHA read returns the
 * status only.
 *
 * No `@/` imports: `npm test` loads it straight from Node.
 */

import { randomUUID } from "node:crypto";

import { diditUrls } from "./config.ts";
import {
  apiPath,
  callDidit,
  type DiditEnv,
  type DiditResult,
  isUuid,
} from "./server.ts";

/** What a route sends back: the HTTP status and the JSON body. */
export interface Answer {
  status: number;
  body: Record<string, unknown>;
}

/** The dedicated CAPTCHA liveness workflow. */
export const CAPTCHA_WORKFLOW_ID = "82f7360c-276e-4525-b7b3-59d8051e973c";

/**
 * A page of this site to return to: the path and query the browser asked for,
 * always on this site's own origin, or null when `value` is not a URL at all.
 */
export function siteCallback(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value, diditUrls.site);

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    return `${diditUrls.site}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

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
 * `POST /api/verification`: a new hosted session for one catalogue demo. The
 * browser picks the workflow, the page to return to and an optional portrait;
 * the session's `vendor_data` is the server's own. The API's refusal is passed
 * on so the catalogue can say why (unpublished workflow, no balance, bad
 * portrait).
 */
export async function createCatalogueSession(
  body: unknown,
  env?: DiditEnv,
  newId: () => string = randomUUID,
): Promise<Answer> {
  const input = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const callback = siteCallback(input.callback);

  if (!callback || !input.workflow_id) {
    return {
      status: 400,
      body: { error: "Callback URL and workflow ID are required" },
    };
  }

  const result = await callDidit<Record<string, unknown>>(
    "POST",
    "/v3/session/",
    {
      workflow_id: input.workflow_id,
      vendor_data: `demo-center-${newId()}`,
      callback,
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
 * `POST /api/didit-captcha/session`: a new liveness session for the CAPTCHA
 * widget. The email is only where Didit sends the visitor's notifications;
 * the session belongs to a fresh server-side `vendor_data`, so two visitors
 * typing the same email never share one session.
 */
export async function createCaptchaSession(
  body: unknown,
  env?: DiditEnv,
  newId: () => string = randomUUID,
): Promise<Answer> {
  const input = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const email = typeof input.email === "string" ? input.email.trim() : "";

  if (!email) return { status: 400, body: { error: "Email is required" } };

  const result = await callDidit<{ session_id?: string; url?: string }>(
    "POST",
    "/v2/session/",
    {
      workflow_id: CAPTCHA_WORKFLOW_ID,
      vendor_data: `didit-captcha-${newId()}`,
      callback:
        siteCallback(input.callback) ??
        `${diditUrls.site}/didit-captcha/callback`,
      metadata: { source: "didit-captcha" },
      contact_details: { email, email_lang: "en" },
    },
    env,
  );

  if (!result.ok || !result.data?.session_id) {
    return { status: 500, body: { error: "Failed to create Didit session" } };
  }

  return {
    status: 200,
    body: { sessionId: result.data.session_id, sessionUrl: result.data.url },
  };
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
