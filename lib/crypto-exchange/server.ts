import type { NextRequest } from "next/server";

import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { toAccountView, type AccountView } from "./onboarding";

import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { apiKey } from "@/lib/didit/config";
import { kestrel } from "@/lib/didit/demos";
import { type DiditResult, didit, diditMessage } from "@/lib/didit/server";

/**
 * Kestrel's backend: the routes under /api/crypto-exchange share this.
 *
 * It plays the exchange's own server. It holds the API key (every Didit call
 * goes through the shared client in lib/didit/server), knows which Didit
 * session belongs to which visitor, and refuses to move money for anyone whose
 * KYC is not approved - which is also what keeps a public demo from being a
 * free way to run billable screenings.
 */

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The visitor's Kestrel account: the `vendor_data` Kestrel gave them and their
 * onboarding session, signed with the API key. HttpOnly, so page scripts never
 * see it, and signed, so knowing someone's `vendor_data` (the app header shows
 * it) and a session or transaction id is not enough to read their records.
 * Every route also re-checks that a Didit record it returns carries this
 * `vendor_data`.
 *
 * Over HTTPS it is a `__Host-` cookie (Secure, no Domain, Path=/), so no
 * sibling subdomain can plant or overwrite it; plain HTTP (local development)
 * cannot hold a Secure cookie, so it drops the prefix there.
 */
export const ACCOUNT_COOKIE = "__Host-kestrel_account";
export const DEV_ACCOUNT_COOKIE = "kestrel_account";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export interface KestrelCookie {
  vendorData: string;
  sessionId: string;
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
      parsed.v.startsWith(kestrel.vendorPrefix) &&
      typeof parsed?.s === "string" &&
      UUID.test(parsed.s)
    ) {
      return { vendorData: parsed.v, sessionId: parsed.s };
    }
  } catch {
    // Signed but unreadable: treat it as no account.
  }

  return null;
}

function secureRequest(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:";
}

function cookieName(request: NextRequest): string {
  return secureRequest(request) ? ACCOUNT_COOKIE : DEV_ACCOUNT_COOKIE;
}

/**
 * The account this browser holds, or null. With Didit Authentication on, the
 * cookie must also belong to whoever is signed in now: after a sign-out and
 * another person's sign-in on the same browser, the old account is not theirs.
 */
export async function readAccount(
  request: NextRequest,
): Promise<KestrelCookie | null> {
  const cookie = verifyAccountCookie(
    request.cookies.get(cookieName(request))?.value,
    apiKey(),
  );

  if (!cookie || !authEnabled()) return cookie;

  return (await visitorVendorData(kestrel.vendorPrefix)) === cookie.vendorData
    ? cookie
    : null;
}

/** Whether the browser sent an account cookie at all, valid or not. */
export function hasAccountCookie(request: NextRequest): boolean {
  return request.cookies.has(cookieName(request));
}

export function writeAccountCookie(
  request: NextRequest,
  response: NextResponse,
  value: KestrelCookie,
) {
  response.cookies.set(
    cookieName(request),
    signAccountCookie(value, apiKey()),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: secureRequest(request),
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  );
}

export function clearAccountCookie(
  request: NextRequest,
  response: NextResponse,
) {
  response.cookies.set(cookieName(request), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: secureRequest(request),
    path: "/",
    maxAge: 0,
  });
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

/**
 * A Didit call that failed, as the browser should see it: Didit's own
 * sentence (or the fallback) and 502, because whatever Didit refused, it was
 * Kestrel's server that asked. Didit's raw field errors stay on the server.
 */
export function diditFailure(result: DiditResult, fallback: string) {
  return failure(diditMessage(result, fallback), 502);
}

export const noAccount = () =>
  failure("No Kestrel account in this browser.", 401);

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
  const cookie = await readAccount(request);

  if (!cookie) return { ok: false, response: noAccount() };

  const result = await didit.sessions.decision(cookie.sessionId);

  if (result.status === 404) {
    return {
      ok: false,
      response: failure("The onboarding session no longer exists.", 404),
    };
  }
  if (!result.ok || !result.data) {
    return {
      ok: false,
      response: diditFailure(result, "The onboarding session could not be read."),
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
