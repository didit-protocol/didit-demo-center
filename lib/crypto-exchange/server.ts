import type { NextRequest } from "next/server";

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
 * onboarding session. httpOnly, so page scripts never see it; every route
 * re-checks that a Didit record it returns carries this `vendor_data`, which
 * is what stops one visitor reading another's session or transactions (the
 * reason PR #5 stopped the catalogue fetching decisions by id).
 */
const COOKIE = "kestrel_account";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export interface KestrelCookie {
  vendorData: string;
  sessionId: string;
}

export function readAccountCookie(request: NextRequest): KestrelCookie | null {
  const raw = request.cookies.get(COOKIE)?.value;

  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));

    if (
      typeof parsed?.v === "string" &&
      parsed.v.startsWith("kestrel-") &&
      typeof parsed?.s === "string" &&
      /^[0-9a-f-]{36}$/i.test(parsed.s)
    ) {
      return { vendorData: parsed.v, sessionId: parsed.s };
    }
  } catch {
    // A cookie this app did not write: treat it as no account.
  }

  return null;
}

export function writeAccountCookie(
  response: NextResponse,
  value: KestrelCookie,
) {
  response.cookies.set(
    COOKIE,
    Buffer.from(
      JSON.stringify({ v: value.vendorData, s: value.sessionId }),
    ).toString("base64url"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  );
}

export function clearAccountCookie(response: NextResponse) {
  response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
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
        "x-api-key": process.env.API_KEY || "",
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
