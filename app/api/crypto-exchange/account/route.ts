import type { NextRequest } from "next/server";

import { randomUUID } from "node:crypto";

import { CX_WORKFLOWS } from "@/lib/crypto-exchange/policy";
import {
  clearAccountCookie,
  didit,
  diditError,
  failure,
  json,
  lookupAccount,
  writeAccountCookie,
} from "@/lib/crypto-exchange/server";

export const dynamic = "force-dynamic";

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

  // The user's id at the exchange. Every Didit record of this person -
  // the onboarding session, each transaction, the selfie step-up - carries it.
  const vendorData = `kestrel-${randomUUID()}`;
  const result = await didit("POST", "/session/", {
    workflow_id: CX_WORKFLOWS.onboarding,
    vendor_data: vendorData,
    callback: `${request.nextUrl.origin}/crypto-exchange`,
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

export async function GET(request: NextRequest) {
  const lookup = await lookupAccount(request);

  if (!lookup.ok) return lookup.response;

  return json({ ...lookup.account, userId: lookup.cookie.vendorData });
}

export async function DELETE() {
  const response = json({ ok: true });

  clearAccountCookie(response);

  return response;
}
