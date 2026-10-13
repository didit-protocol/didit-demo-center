import { NextRequest } from "next/server";

import { readVerification, startVerification } from "@/lib/fintech/server";
import {
  fintechEnv,
  readAccount,
  readBody,
  readLocale,
  respond,
} from "@/lib/fintech/route";

export const dynamic = "force-dynamic";

/** The onboarding decision, statuses only, for this browser's session. */
export async function GET(request: NextRequest) {
  const env = fintechEnv();

  return respond(
    request,
    env,
    await readVerification(env, readAccount(request, env)),
  );
}

/** Creates (or resumes) the onboarding session and returns its hosted URL. */
export async function POST(request: NextRequest) {
  const env = fintechEnv();
  const body = (await readBody(request)) as Record<string, unknown> | null;

  return respond(
    request,
    env,
    await startVerification(env, readAccount(request, env), {
      origin: body?.origin,
      locale: readLocale(request),
    }),
  );
}
