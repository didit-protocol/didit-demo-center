import type { ConsoleContext } from "./console";
import type { NextRequest } from "next/server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { toAccountView, type AccountView } from "./onboarding";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";

/**
 * Kestrel's backend: the four routes under /api/crypto-exchange share this.
 *
 * It plays the exchange's own server. It holds the API key, knows which Didit
 * session belongs to which visitor, and refuses to move money for anyone whose
 * KYC is not approved - which is also what keeps a public demo from being a
 * free way to run billable screenings.
 */

export const DIDIT_V3 = `${VERIFICATION_BASE_URL}/v3`;

/**
 * The visitor's Kestrel account: the `vendor_data` Kestrel gave them and their
 * onboarding session, signed with the API key. httpOnly, so page scripts never
 * see it, and signed, so knowing someone's `vendor_data` (the app header shows
 * it) and a session or transaction id is not enough to read their records.
 * Every route also re-checks that a Didit record it returns carries this
 * `vendor_data` (the reason PR #5 stopped the catalogue fetching decisions by
 * id).
 */
export const ACCOUNT_COOKIE = "kestrel_account";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export interface KestrelCookie {
  vendorData: string;
  sessionId: string;
}

function apiKey(): string {
  return process.env.API_KEY || "";
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", `kestrel-account-v1:${secret}`)
    .update(payload)
    .digest("base64url");
}

/** The cookie's value: the account as base64url JSON, a dot, its signature. */
export function signAccountCookie(value: KestrelCookie, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ v: value.vendorData, s: value.sessionId }),
  ).toString("base64url");

  return `${payload}.${signature(payload, secret)}`;
}

/** The account inside a cookie value, or null when it is missing or forged. */
export function verifyAccountCookie(
  raw: string | null | undefined,
  secret: string,
): KestrelCookie | null {
  if (!raw || !secret) return null;
  const dot = raw.lastIndexOf(".");

  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(signature(payload, secret));

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    if (
      typeof parsed?.v === "string" &&
      parsed.v.startsWith("kestrel-") &&
      typeof parsed?.s === "string" &&
      /^[0-9a-f-]{36}$/i.test(parsed.s)
    ) {
      return { vendorData: parsed.v, sessionId: parsed.s };
    }
  } catch {
    // Signed but unreadable: treat it as no account.
  }

  return null;
}

export function readAccountCookie(request: NextRequest): KestrelCookie | null {
  return verifyAccountCookie(request.cookies.get(ACCOUNT_COOKIE)?.value, apiKey());
}

export function writeAccountCookie(
  response: NextResponse,
  value: KestrelCookie,
) {
  response.cookies.set(ACCOUNT_COOKIE, signAccountCookie(value, apiKey()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAccountCookie(response: NextResponse) {
  response.cookies.set(ACCOUNT_COOKIE, "", { path: "/", maxAge: 0 });
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers || {}) },
  });
}

export function failure(message: string, status: number) {
  return json({ error: message }, { status });
}

export interface DiditResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
}

/** One call to the Didit API with the server-side key. Never throws. */
export async function didit(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<DiditResult> {
  try {
    const response = await fetch(`${DIDIT_V3}${path}`, {
      method,
      headers: {
        "x-api-key": apiKey(),
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      data: data && typeof data === "object" ? data : null,
    };
  } catch (error) {
    console.error(`Didit ${method} ${path} failed:`, error);

    return { ok: false, status: 502, data: null };
  }
}

/** The API's own reason for a failed call, for the screen that triggered it. */
export function diditError(result: DiditResult, fallback: string): string {
  const data = result.data ?? {};
  const detail = data.detail ?? data.error ?? data.message;

  if (typeof detail === "string" && detail) return detail;
  if (result.status === 400 && Object.keys(data).length > 0) {
    return `${fallback}: ${JSON.stringify(data).slice(0, 300)}`;
  }

  return fallback;
}

export type AccountLookup =
  | { ok: true; cookie: KestrelCookie; account: AccountView }
  | { ok: false; response: NextResponse };

/**
 * Resolves the visitor's account from their cookie and their session's live
 * decision. With `requireApproved`, anything but an approved KYC is refused:
 * an exchange does not move money for an unverified customer.
 */
export async function lookupAccount(
  request: NextRequest,
  { requireApproved = false } = {},
): Promise<AccountLookup> {
  const cookie = readAccountCookie(request);

  if (!cookie) {
    return {
      ok: false,
      response: failure("No Kestrel account in this browser.", 401),
    };
  }

  const result = await didit("GET", `/session/${cookie.sessionId}/decision/`);

  if (!result.ok || !result.data) {
    return {
      ok: false,
      response: failure(
        diditError(result, "The onboarding session could not be read."),
        result.status === 404 ? 404 : 502,
      ),
    };
  }

  if (result.data.vendor_data !== cookie.vendorData) {
    return { ok: false, response: failure("This session is not yours.", 403) };
  }

  const account = toAccountView(result.data);

  if (requireApproved && account.stage !== "approved") {
    return {
      ok: false,
      response: failure(
        "Your account must be approved before you can move funds.",
        403,
      ),
    };
  }

  if (requireApproved && !account.fullName) {
    return {
      ok: false,
      response: failure(
        "The verified name is missing from the onboarding session.",
        409,
      ),
    };
  }

  return { ok: true, cookie, account };
}

let consoleCache: ConsoleContext | null = null;

/**
 * Organization and application ids for Console deep links. Neither id is in a
 * decision or a transaction detail, but every transaction summary carries
 * both, and they never change for an API key - so one list call is cached for
 * the life of the server. Null (the links open the Console) until the
 * application has a transaction.
 */
export async function consoleContext(): Promise<ConsoleContext | null> {
  if (consoleCache) return consoleCache;
  const result = await didit("GET", "/transactions/?limit=1");
  const results = result.data?.results;
  const first = Array.isArray(results) ? results[0] : null;
  const organizationId = first?.organization_id;
  const applicationId = first?.application_id;

  if (typeof organizationId !== "string" || typeof applicationId !== "string")
    return null;
  consoleCache = { organizationId, applicationId };

  return consoleCache;
}
