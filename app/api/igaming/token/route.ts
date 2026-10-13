import { NextRequest } from "next/server";

import { diditErrorMessage } from "@/lib/igaming/records";
import { didit, noPlayer, noStore, readPlayer } from "@/lib/igaming/server";
import { VERIFICATION_BASE_URL } from "@/lib/auth-service";

export const dynamic = "force-dynamic";

/**
 * A short-lived transaction token for this player. The browser hands it to
 * `DiditSdk.shared.submitTransaction`, which posts to `/v1/transactions/`:
 * the API key never leaves this server, and the token pins every transaction
 * to this player's `vendor_data` server-side.
 */
export async function POST(request: NextRequest) {
  const playerId = readPlayer(request);

  if (!playerId) return noPlayer();

  const result = await didit("POST", "/v3/transactions/sdk-token/", {
    vendor_data: playerId,
    ttl_seconds: 900,
    max_uses: 30,
  });

  if (!result.ok) {
    return noStore(
      {
        error:
          diditErrorMessage(result.data) ??
          "A transaction token could not be minted.",
        didit: [result.call],
      },
      { status: 502 },
    );
  }

  const token = result.data as { sdk_token?: string; expires_at?: string };

  return noStore({
    token: token.sdk_token,
    expiresAt: token.expires_at,
    baseUrl: VERIFICATION_BASE_URL,
    didit: [result.call],
  });
}
