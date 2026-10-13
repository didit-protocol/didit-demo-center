import { NextRequest } from "next/server";

import { AGE_WORKFLOW_ID } from "@/lib/igaming/policy";
import { diditErrorMessage, projectSession } from "@/lib/igaming/records";
import {
  type DiditCall,
  didit,
  noPlayer,
  noStore,
  readPlayer,
} from "@/lib/igaming/server";
import { VERIFICATION_BASE_URL } from "@/lib/auth-service";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A short-lived transaction token for this player. The browser hands it to
 * `DiditSdk.shared.submitTransaction`, which posts to `/v1/transactions/`:
 * the API key never leaves this server, and the token pins every transaction
 * to this player's `vendor_data` server-side.
 *
 * The cashier is 18+ only, and the page's own state is not proof of that: the
 * server re-reads the age check's decision from Didit and mints nothing
 * unless it is this player's Approved session of the age workflow.
 */
export async function POST(request: NextRequest) {
  const playerId = readPlayer(request);

  if (!playerId) return noPlayer();

  const body = await request.json().catch(() => null);
  const ageSessionId = String(body?.ageSessionId ?? "");
  const calls: DiditCall[] = [];
  const notOldEnough = () =>
    noStore(
      {
        error:
          "Finish the age check first: the cashier opens once Didit confirms you are 18 or over.",
        didit: calls,
      },
      { status: 403 },
    );

  if (!UUID.test(ageSessionId)) return notOldEnough();

  const decision = await didit("GET", `/v3/session/${ageSessionId}/decision/`);

  calls.push(decision.call);
  if (decision.status >= 500) {
    return noStore(
      { error: "The age check could not be read from Didit.", didit: calls },
      { status: 502 },
    );
  }
  const age = decision.ok ? projectSession(decision.data, playerId) : null;

  if (age?.workflowId !== AGE_WORKFLOW_ID || age.status !== "Approved")
    return notOldEnough();

  const result = await didit("POST", "/v3/transactions/sdk-token/", {
    vendor_data: playerId,
    ttl_seconds: 900,
    max_uses: 30,
  });

  calls.push(result.call);
  if (!result.ok) {
    return noStore(
      {
        error:
          diditErrorMessage(result.data) ??
          "A transaction token could not be minted.",
        didit: calls,
      },
      { status: 502 },
    );
  }

  const token = result.data as { sdk_token?: string; expires_at?: string };

  return noStore({
    token: token.sdk_token,
    expiresAt: token.expires_at,
    baseUrl: VERIFICATION_BASE_URL,
    didit: calls,
  });
}
