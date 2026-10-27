import { NextRequest } from "next/server";

import { didit, diditMessage } from "@/lib/didit/server";
import { noCustomer, noStore, readCustomer } from "@/lib/fintech/server";

export const dynamic = "force-dynamic";

/**
 * A monitoring token for this customer's security events: the bank reports
 * the failed sign-in of the account-takeover step with it, and Didit takes
 * the person from the token, never from the event.
 */
export async function POST(request: NextRequest) {
  const customerId = await readCustomer(request);

  if (!customerId) return noCustomer();

  const result = await didit.events.sdkToken({
    vendorData: customerId,
    categories: ["auth", "session", "security"],
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
    didit: [result.call],
  });
}
