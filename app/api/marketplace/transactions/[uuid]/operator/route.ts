import { NextRequest } from "next/server";

import { handleOperator } from "@/lib/marketplace/server";
import { marketEnv, readState, respond } from "@/lib/marketplace/route";

export const dynamic = "force-dynamic";

/** The analyst's view of a held transaction: rules, device, network, links. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> },
) {
  const params = await context.params;
  const env = marketEnv();

  return respond(
    request,
    env,
    await handleOperator(env, readState(request, env), params.uuid),
  );
}
