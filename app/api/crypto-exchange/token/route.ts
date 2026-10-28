import type { NextRequest } from "next/server";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";
import { failure, json, lookupAccount } from "@/lib/crypto-exchange/server";
import { didit, diditMessage } from "@/lib/didit/server";

export const dynamic = "force-dynamic";

/**
 * Mints the short-lived transaction token the web SDK submits deposits and
 * withdrawals with (`didit.transactions.sdkToken`). The token is bound to
 * this visitor's `vendor_data`, so whatever the browser sends, the
 * transaction's subject is them, and it is only minted once Didit approved
 * their KYC.
 */
export async function POST(request: NextRequest) {
  const lookup = await lookupAccount(request, { requireApproved: true });

  if (!lookup.ok) return lookup.response;

  const result = await didit.transactions.sdkToken({
    vendorData: lookup.cookie.vendorData,
  });
  const token = result.data?.sdk_token;

  if (!result.ok || typeof token !== "string") {
    return failure(
      diditMessage(result, "The transaction token could not be minted"),
      502,
    );
  }

  return json({
    token,
    expiresAt: result.data?.expires_at ?? null,
    baseUrl: VERIFICATION_BASE_URL,
  });
}
