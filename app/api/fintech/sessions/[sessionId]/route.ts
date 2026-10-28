import { NextRequest } from "next/server";

import { didit } from "@/lib/didit/server";
import { projectSession } from "@/lib/igaming/records";
import { UUID, noCustomer, noStore, readCustomer } from "@/lib/fintech/server";

export const dynamic = "force-dynamic";

/**
 * One of this customer's verification sessions (onboarding or a transfer's
 * step-up), read from `GET /v3/session/{id}/decision/` and cut down to what
 * the bank shows: statuses, the name and document type read, the AML hit
 * count. A session that belongs to anyone else is a 404.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const customerId = await readCustomer(request);

  if (!customerId) return noCustomer();
  if (!UUID.test(sessionId)) {
    return noStore({ error: "Unknown session." }, { status: 404 });
  }

  const result = await didit.sessions.decision(sessionId);
  const session = result.ok ? projectSession(result.data, customerId) : null;

  if (!session) {
    const down = result.status === 0 || result.status >= 500;

    return noStore(
      {
        error: down
          ? "The session could not be read from Didit."
          : "Unknown session.",
        didit: [result.call],
      },
      { status: down ? 502 : 404 },
    );
  }

  return noStore({ session, didit: [result.call] });
}
