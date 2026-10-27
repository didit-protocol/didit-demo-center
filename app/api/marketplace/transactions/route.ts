import { NextRequest } from "next/server";

import { handleClaim } from "@/lib/marketplace/server";
import {
  marketEnv,
  readBody,
  readState,
  respond,
} from "@/lib/marketplace/route";

export const dynamic = "force-dynamic";

/** Remember a transaction the web SDK just submitted for this browser. */
export async function POST(request: NextRequest) {
  const env = await marketEnv();

  return respond(
    request,
    env,
    await handleClaim(env, readState(request, env), await readBody(request)),
  );
}
