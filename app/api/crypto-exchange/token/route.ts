import type { NextRequest } from "next/server";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";
import {
  didit,
  diditError,
  failure,
  json,
  lookupAccount,
} from "@/lib/crypto-exchange/server";

export const dynamic = "force-dynamic";

/**
 * Mints the short-lived transaction token the web SDK submits a withdrawal
 * with (`POST /v3/transactions/sdk-token/`). The token is bound to this
 * visitor's `vendor_data`, so whatever the browser sends, the transaction's
 * subject is them. One use: one token per withdrawal.
 */
export async function POST(request: NextRequest) {
  const lookup = await lookupAccount(request, { requireApproved: true });

  if (!lookup.ok) return lookup.response;

  const result = await didit("POST", "/transactions/sdk-token/", {
    vendor_data: lookup.cookie.vendorData,
    ttl_seconds: 600,
    max_uses: 1,
  });
  const token = result.data?.sdk_token;

  if (!result.ok || typeof token !== "string") {
    return failure(
      diditError(result, "The transaction token could not be minted"),
      502,
    );
  }

  return json({
    token,
    expiresAt: result.data?.expires_at ?? null,
    baseUrl: VERIFICATION_BASE_URL,
  });
}
