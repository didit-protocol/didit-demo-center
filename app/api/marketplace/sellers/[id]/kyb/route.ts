import { NextRequest } from "next/server";

import { handleKyb, handleStartKyb } from "@/lib/marketplace/server";
import {
  marketEnv,
  readLanguage,
  readState,
  respond,
} from "@/lib/marketplace/route";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** The shop's business verification, trimmed to what the status card shows. */
export async function GET(request: NextRequest, context: Params) {
  const params = await context.params;
  const env = await marketEnv();

  return respond(
    request,
    env,
    await handleKyb(env, readState(request, env), params.id),
  );
}

/** Start (or resume) the shop's KYB and hand back the hosted-flow URL. */
export async function POST(request: NextRequest, context: Params) {
  const params = await context.params;
  const env = await marketEnv();

  return respond(
    request,
    env,
    await handleStartKyb(env, readState(request, env), params.id, {
      origin: request.headers.get("origin"),
      fallbackOrigin: siteConfig.url,
      language: readLanguage(request),
    }),
  );
}
