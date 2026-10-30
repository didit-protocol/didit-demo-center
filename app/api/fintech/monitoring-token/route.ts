import { NextRequest } from "next/server";

import { diditUrls } from "@/lib/didit/config";
import { didit, diditMessage } from "@/lib/didit/server";
import { noCustomer, noStore, readCustomer } from "@/lib/fintech/server";

export const dynamic = "force-dynamic";

/**
 * A monitoring token for this customer's security events: the bank reports
 * the failed sign-in of the account-takeover step with it, and Didit takes
 * the person from the token, never from the event.
 *
 * Scoped as tightly as the step needs: security, auth and session events
 * only, one event, five minutes. Each attempt asks for a fresh one.
 */
export async function POST(request: NextRequest) {
  const customerId = await readCustomer(request);

  if (!customerId) return noCustomer();

  const result = await didit.events.sdkToken({
    vendorData: customerId,
    categories: ["auth", "session", "security"],
    ttlSeconds: 300,
    maxUses: 1,
  });
  const token = result.data?.monitoring_token;

  if (!result.ok || !token) {
    const code = (result.data as { code?: string } | null)?.code ?? null;

    return noStore(
      {
        error: diditMessage(result, "A monitoring token could not be minted."),
        code,
        didit: [result.call],
      },
      { status: result.status === 403 ? 403 : 502 },
    );
  }

  return noStore({
    token,
    expiresAt: result.data?.expires_at ?? null,
    // submitEvent posts to production unless told otherwise.
    baseUrl: diditUrls.api,
    didit: [result.call],
  });
}
