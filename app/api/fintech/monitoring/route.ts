import { NextRequest } from "next/server";

import { previewMonitoring } from "@/lib/fintech/server";
import { fintechEnv, readAccount, respond } from "@/lib/fintech/route";

export const dynamic = "force-dynamic";

/** Ongoing AML monitoring, previewed with `estimate_only`: writes nothing. */
export async function POST(request: NextRequest) {
  const env = fintechEnv();

  return respond(
    request,
    env,
    await previewMonitoring(env, readAccount(request, env)),
  );
}
