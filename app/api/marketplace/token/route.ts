import { NextRequest } from "next/server";

import { handleToken } from "@/lib/marketplace/server";
import {
  marketEnv,
  readBody,
  readState,
  respond,
} from "@/lib/marketplace/route";

export const dynamic = "force-dynamic";

/** A short-lived transaction token for one of this browser's identities. */
export async function POST(request: NextRequest) {
  const env = await marketEnv();

  return respond(
    request,
    env,
    await handleToken(env, readState(request, env), await readBody(request)),
  );
}
