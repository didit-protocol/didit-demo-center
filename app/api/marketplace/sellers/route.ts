import { NextRequest } from "next/server";

import { handleOpenShop } from "@/lib/marketplace/server";
import {
  marketEnv,
  readBody,
  readState,
  respond,
} from "@/lib/marketplace/route";

export const dynamic = "force-dynamic";

/** Open a shop: a new seller identity, remembered in this browser only. */
export async function POST(request: NextRequest) {
  const env = marketEnv();

  return respond(
    request,
    env,
    await handleOpenShop(env, readState(request, env), await readBody(request)),
  );
}
