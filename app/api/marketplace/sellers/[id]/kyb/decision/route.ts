import { NextRequest } from "next/server";

import { handleDecideKyb } from "@/lib/marketplace/server";
import {
  marketEnv,
  readBody,
  readState,
  respond,
} from "@/lib/marketplace/route";

export const dynamic = "force-dynamic";

/** An analyst approves or declines a KYB that is In Review. */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const env = marketEnv();

  return respond(
    request,
    env,
    await handleDecideKyb(
      env,
      readState(request, env),
      params.id,
      await readBody(request),
    ),
  );
}
