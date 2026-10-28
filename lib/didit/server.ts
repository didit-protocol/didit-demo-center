/**
 * The server half of the shared Didit client: every call that needs the API
 * key goes through `callDidit`, and the four demos' route handlers use the
 * typed helpers below instead of their own fetch code.
 *
 * Each call returns `{ ok, status, data, call }` and never throws, so a route
 * can always say what Didit answered, and `call` (method, path, status) feeds
 * the live layer with the request that really ran.
 *
 * No `@/` imports: `npm test` and the setup scripts load it straight from Node.
 */

import { apiKey, diditUrls } from "./config.ts";

export type Method = "GET" | "POST" | "PATCH" | "DELETE";

export interface DiditCall {
  method: string;
  path: string;
  status: number;
}

export interface DiditResult<T = unknown> {
  ok: boolean;
  /** The HTTP status, or 0 when Didit could not be reached. */
  status: number;
  data: T | null;
  call: DiditCall;
}

/** Where calls go and with which key; tests pass their own. */
export interface DiditEnv {
  apiBase: string;
  apiKey: string;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  /** Abort a call after this many milliseconds. */
  timeoutMs?: number;
}

export function serverEnv(): DiditEnv {
  return {
    apiBase: diditUrls.api,
    apiKey: apiKey(),
    fetch: (input, init) => fetch(input, init),
    timeoutMs: 30_000,
  };
}

/** One call to the Didit API with the server-side key. Never throws. */
export async function callDidit<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  env: DiditEnv = serverEnv(),
): Promise<DiditResult<T>> {
  try {
    const response = await env.fetch(`${env.apiBase}${path}`, {
      method,
      headers: { "x-api-key": env.apiKey, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: env.timeoutMs ? AbortSignal.timeout(env.timeoutMs) : undefined,
    });
    const data = (await response.json().catch(() => null)) as T | null;

    return {
      ok: response.ok,
      status: response.status,
      data,
      call: { method, path, status: response.status },
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      call: { method, path, status: 0 },
    };
  }
}

/** Didit's own reason for a failed call, or the fallback. */
export function diditMessage(result: DiditResult, fallback: string): string {
  const data = result.data;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const key of ["detail", "error", "message", "non_field_errors"]) {
      const value = (data as Record<string, unknown>)[key];

      if (typeof value === "string" && value) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }

  return result.status === 0 ? "The Didit API could not be reached." : fallback;
}

const encode = encodeURIComponent;

export interface CreateSessionInput {
  workflowId: string;
  /** The signed-in visitor, as Didit should know them. */
  vendorData: string;
  /** Where the hosted flow returns when it finishes on another device. */
  callback: string;
  email?: string;
  metadata?: Record<string, unknown>;
  /** Base64 reference portrait, for biometric authentication workflows. */
  portraitImage?: string;
}

export interface SessionCreated {
  session_id: string;
  url: string;
  [key: string]: unknown;
}

export interface SdkToken {
  sdk_token: string;
  expires_at: string;
  [key: string]: unknown;
}

/**
 * The typed calls every demo makes. `env` is optional so route handlers stay
 * one line; tests and the demos with injectable environments pass their own.
 */
export const didit = {
  sessions: {
    /** `POST /v3/session/` for the signed-in visitor. */
    create(input: CreateSessionInput, env?: DiditEnv) {
      return callDidit<SessionCreated>(
        "POST",
        "/v3/session/",
        {
          workflow_id: input.workflowId,
          vendor_data: input.vendorData,
          callback: input.callback,
          callback_method: "both",
          ...(input.email
            ? {
                contact_details: {
                  email: input.email,
                  send_notification_emails: false,
                },
              }
            : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.portraitImage
            ? { portrait_image: input.portraitImage }
            : {}),
        },
        env,
      );
    },
    /** `GET /v3/session/{id}/decision/`. */
    decision(sessionId: string, env?: DiditEnv) {
      return callDidit<Record<string, unknown>>(
        "GET",
        `/v3/session/${encode(sessionId)}/decision/`,
        undefined,
        env,
      );
    },
  },
  transactions: {
    /**
     * `POST /v3/transactions/sdk-token/`: a short-lived token the browser
     * hands to `submitTransaction`. The API key never leaves the server and
     * the token pins every transaction to this `vendor_data`.
     */
    sdkToken(
      input: { vendorData: string; ttlSeconds?: number; maxUses?: number },
      env?: DiditEnv,
    ) {
      return callDidit<SdkToken>(
        "POST",
        "/v3/transactions/sdk-token/",
        {
          vendor_data: input.vendorData,
          ttl_seconds: input.ttlSeconds ?? 900,
          max_uses: input.maxUses ?? 30,
        },
        env,
      );
    },
    get(id: string, env?: DiditEnv) {
      return callDidit<Record<string, unknown>>(
        "GET",
        `/v3/transactions/${encode(id)}/`,
        undefined,
        env,
      );
    },
    list(query: Record<string, string | number>, env?: DiditEnv) {
      const search = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, String(value)]),
      );

      return callDidit<{ results?: Record<string, unknown>[] }>(
        "GET",
        `/v3/transactions/?${search}`,
        undefined,
        env,
      );
    },
  },
  events: {
    /**
     * `POST /v3/events/sdk-token/`: the monitoring token the browser's
     * `submitEvent` sends with. Didit takes the person from the token, never
     * from the event.
     */
    sdkToken(
      input: { vendorData: string; categories?: string[] },
      env?: DiditEnv,
    ) {
      return callDidit<{ monitoring_token?: string; expires_at?: string }>(
        "POST",
        "/v3/events/sdk-token/",
        {
          vendor_data: input.vendorData,
          ttl_seconds: 1800,
          allowed_event_categories: input.categories ?? [
            "auth",
            "session",
            "bonus",
            "payment",
          ],
        },
        env,
      );
    },
  },
  users: {
    /** `GET /v3/users/{vendor_data}/`: the person Didit holds for this id. */
    get(vendorData: string, env?: DiditEnv) {
      return callDidit<Record<string, unknown>>(
        "GET",
        `/v3/users/${encode(vendorData)}/`,
        undefined,
        env,
      );
    },
  },
};

export interface ConsoleIds {
  organizationId: string;
  applicationId: string;
}

const consoleIdCache = new Map<string, ConsoleIds>();

/**
 * The organization and application behind the API key, for console links.
 * Neither id is in a decision, but every transaction summary carries both and
 * they never change for a key, so one list call is cached per server.
 */
export async function consoleIds(
  calls: DiditCall[],
  env: DiditEnv = serverEnv(),
): Promise<ConsoleIds | null> {
  const cached = consoleIdCache.get(env.apiKey);

  if (cached) return cached;
  const result = await didit.transactions.list({ limit: 1 }, env);

  calls.push(result.call);
  const first = result.data?.results?.[0];
  const organizationId = first?.organization_id;
  const applicationId = first?.application_id;

  if (typeof organizationId !== "string" || typeof applicationId !== "string")
    return null;
  const ids = { organizationId, applicationId };

  consoleIdCache.set(env.apiKey, ids);

  return ids;
}
