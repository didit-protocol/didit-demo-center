import type { NextRequest } from "next/server";

import { randomUUID } from "node:crypto";

import { CX_WORKFLOWS } from "@/lib/crypto-exchange/policy";
import {
  clearAccountCookie,
  consoleContext,
  didit,
  diditError,
  failure,
  json,
  lookupAccount,
  readAccountCookie,
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
export async function POST() {
  if (!CX_WORKFLOWS.onboarding) {
    return failure("Kestrel is not configured on this environment.", 503);
  }

  // The user's id at the exchange. Every Didit record of this person -
  // the onboarding session, each transaction, the selfie step-up - carries it.
  const vendorData = `kestrel-${randomUUID()}`;
  const result = await didit("POST", "/session/", {
    workflow_id: CX_WORKFLOWS.onboarding,
    vendor_data: vendorData,
    callback: CALLBACK,
    callback_method: "both",
  });

  const sessionId = result.data?.session_id;
  const url = result.data?.url;

  if (!result.ok || typeof sessionId !== "string" || typeof url !== "string") {
    return failure(
      diditError(result, "The verification session could not be created"),
      result.ok ? 502 : result.status,
    );
  }

  const response = json({ sessionId, url }, { status: 201 });

  writeAccountCookie(response, { vendorData, sessionId });

  return response;
}

/**
 * `{ account: null }` - not an error status - when this browser has no usable
 * account, so a first visit does not log a failed request in the console. A
 * cookie whose session is gone or belongs to someone else is dropped. The
 * account carries the Console ids its deep links need.
 */
export async function GET(request: NextRequest) {
  if (!readAccountCookie(request)) return json({ account: null });

  const lookup = await lookupAccount(request);

  if (lookup.ok) {
    return json({
      account: {
        ...lookup.account,
        userId: lookup.cookie.vendorData,
        console: await consoleContext(),
      },
    });
  }
  if ([403, 404].includes(lookup.response.status)) {
    const response = json({ account: null });

    clearAccountCookie(response);

    return response;
  }

  return lookup.response;
}

export async function DELETE() {
  const response = json({ ok: true });

  clearAccountCookie(response);

  return response;
}
