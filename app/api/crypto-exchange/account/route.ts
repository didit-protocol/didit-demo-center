import type { NextRequest } from "next/server";

import { randomUUID } from "node:crypto";

import { CX_WORKFLOWS } from "@/lib/crypto-exchange/policy";
import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { kestrel } from "@/lib/didit/demos";
import { consoleIds, didit } from "@/lib/didit/server";
import {
  clearAccountCookie,
  diditFailure,
  failure,
  hasAccountCookie,
  json,
  lookupAccount,
  writeAccountCookie,
} from "@/lib/crypto-exchange/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Where the hosted flow sends the user when they finish on another device.
 * Built from this site's own address, never from the request: a return URL
 * the caller chose would let anyone mint a genuine Didit link that lands on
 * their own site afterwards.
 */
const CALLBACK = new URL("/crypto-exchange", siteConfig.url).toString();

/**
 * Kestrel sign-up: one hosted KYC + AML session per new account.
 *
 * POST creates it, GET reads the account back from the session's decision,
 * DELETE forgets the account in this browser so the demo can start over.
 */
export async function POST(request: NextRequest) {
  if (!CX_WORKFLOWS.onboarding) {
    return failure("Kestrel is not configured on this environment.", 503);
  }

  // One account per person: a decided account is never replaced by a new
  // session (a second tab, a double click). An unfinished one may start over.
  const existing = await lookupAccount(request);

  if (existing.ok && existing.account.stage !== "processing") {
    return failure("This browser already has a Kestrel account.", 409);
  }

  // The user's id at the exchange. Every Didit record of this person (the
  // onboarding session, each transaction, the selfie step-up) carries it:
  // the signed-in Didit user with Kestrel's prefix or, with Authentication
  // off, a fresh id.
  const vendorData = authEnabled()
    ? await visitorVendorData(kestrel.vendorPrefix)
    : `${kestrel.vendorPrefix}${randomUUID()}`;

  if (!vendorData) return failure("Sign up first.", 401);

  const result = await didit.sessions.create({
    workflowId: CX_WORKFLOWS.onboarding,
    vendorData,
    callback: CALLBACK,
  });
  const sessionId = result.data?.session_id;
  const url = result.data?.url;

  if (!result.ok || typeof sessionId !== "string" || typeof url !== "string") {
    return diditFailure(
      result,
      "The verification session could not be created.",
    );
  }

  const response = json({ sessionId, url }, { status: 201 });

  writeAccountCookie(request, response, { vendorData, sessionId });

  return response;
}

/**
 * `{ account: null }` - not an error status - when this browser has no usable
 * account, so a first visit does not log a failed request in the console. A
 * cookie that is forged, belongs to someone else or whose session is gone is
 * dropped. The account carries the Console ids its deep links need.
 */
export async function GET(request: NextRequest) {
  if (!hasAccountCookie(request)) return json({ account: null });

  const lookup = await lookupAccount(request);

  if (lookup.ok) {
    return json({
      account: {
        ...lookup.account,
        userId: lookup.cookie.vendorData,
        console: await consoleIds([]),
      },
    });
  }
  if ([401, 403, 404].includes(lookup.response.status)) {
    const response = json({ account: null });

    clearAccountCookie(request, response);

    return response;
  }

  return lookup.response;
}

export async function DELETE(request: NextRequest) {
  const response = json({ ok: true });

  clearAccountCookie(request, response);

  return response;
}
