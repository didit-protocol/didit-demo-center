import { NextRequest } from "next/server";

import { diditUrls } from "@/lib/didit/config";
import { didit } from "@/lib/didit/server";
import { projectSession } from "@/lib/igaming/records";
import { ONBOARDING_WORKFLOW_ID } from "@/lib/fintech/alder";
import {
  UUID,
  type DiditCall,
  failed,
  noCustomer,
  noStore,
  readCustomer,
} from "@/lib/fintech/server";

export const dynamic = "force-dynamic";

/**
 * A short-lived transaction token for this customer, which the browser hands
 * to `submitTransaction`: the API key never leaves this server and the token
 * pins every payment to this customer's `vendor_data`.
 *
 * No payment before an approved KYC, and the page's own state is not proof
 * of that: the server re-reads the onboarding decision from Didit and mints
 * nothing unless it is this customer's Approved onboarding session.
 */
export async function POST(request: NextRequest) {
  const customerId = await readCustomer(request);

  if (!customerId) return noCustomer();

  const body = await request.json().catch(() => null);
  const sessionId = String(body?.onboardingSessionId ?? "");
  const calls: DiditCall[] = [];
  const locked = () =>
    noStore(
      {
        error:
          "Payments open once Didit approves your identity check. Finish it first.",
        didit: calls,
      },
      { status: 403 },
    );

  if (!UUID.test(sessionId)) return locked();

  const decision = await didit.sessions.decision(sessionId);

  calls.push(decision.call);
  if (decision.status === 0 || decision.status >= 500) {
    return noStore(
      { error: "The identity check could not be read from Didit.", didit: calls },
      { status: 502 },
    );
  }
  const session = decision.ok
    ? projectSession(decision.data, customerId)
    : null;

  if (
    session?.workflowId !== ONBOARDING_WORKFLOW_ID ||
    session.status !== "Approved"
  )
    return locked();

  const result = await didit.transactions.sdkToken({
    vendorData: customerId,
    ttlSeconds: 900,
    maxUses: 30,
  });

  calls.push(result.call);
  if (!result.ok || !result.data?.sdk_token) {
    return failed(result, "A transaction token could not be minted.");
  }

  return noStore({
    token: result.data.sdk_token,
    expiresAt: result.data.expires_at,
    baseUrl: diditUrls.api,
    didit: calls,
  });
}
