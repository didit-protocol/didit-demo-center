import { NextRequest } from "next/server";

import { handleReset, handleState } from "@/lib/marketplace/server";
import { marketEnv, readState, respond } from "@/lib/marketplace/route";

export const dynamic = "force-dynamic";

/** Everything the marketplace page shows for this browser. */
export async function GET(request: NextRequest) {
  const env = await marketEnv();

  return respond(request, env, await handleState(env, readState(request, env)));
}

/** Start over: forget this browser's shops, buyer and transactions. */
export async function DELETE(request: NextRequest) {
  return respond(request, await marketEnv(), handleReset());
}
