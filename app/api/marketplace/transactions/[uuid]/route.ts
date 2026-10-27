import { NextRequest } from "next/server";

import { handleTransaction } from "@/lib/marketplace/server";
import { marketEnv, readState, respond } from "@/lib/marketplace/route";

export const dynamic = "force-dynamic";

/** One of this browser's transactions, trimmed. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> },
) {
  const params = await context.params;
  const env = marketEnv();

  return respond(
    request,
    env,
    await handleTransaction(env, readState(request, env), params.uuid),
  );
}
