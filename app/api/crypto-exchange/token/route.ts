import type { NextRequest } from "next/server";

import { diditFailure, json, lookupAccount } from "@/lib/crypto-exchange/server";
import { diditUrls } from "@/lib/didit/config";
import { didit } from "@/lib/didit/server";

export const dynamic = "force-dynamic";

/**
 * How long a transaction token lives and how many submissions it allows.
 * Short and small on purpose: the browser asks for a new one when it runs out,
 * and a leaked token is worth a handful of transfers for one user, briefly.
 */
const TOKEN_TTL_SECONDS = 600;
const TOKEN_MAX_USES = 10;

/**
 * Mints the short-lived transaction token the web SDK submits deposits and
 * withdrawals with (`POST /v3/transactions/sdk-token/`). The token is bound to
 * this visitor's `vendor_data`, so whatever the browser sends, the
 * transaction's subject is them, and it is only minted once Didit approved
 * their KYC (the decision is re-read from Didit, never taken from the page).
 */
export async function POST(request: NextRequest) {
  const lookup = await lookupAccount(request, { requireApproved: true });

  if (!lookup.ok) return lookup.response;

  const result = await didit.transactions.sdkToken({
    vendorData: lookup.cookie.vendorData,
    ttlSeconds: TOKEN_TTL_SECONDS,
    maxUses: TOKEN_MAX_USES,
  });
  const token = result.data?.sdk_token;

  if (!result.ok || typeof token !== "string") {
    return diditFailure(result, "The transaction token could not be minted.");
  }

  return json({
    token,
    expiresAt: result.data?.expires_at ?? null,
    baseUrl: diditUrls.api,
  });
}
