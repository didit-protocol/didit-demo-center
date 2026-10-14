import { NextRequest } from "next/server";

import { createPayment, listPayments } from "@/lib/fintech/server";
import {
  fintechEnv,
  readAccount,
  readBody,
  respond,
} from "@/lib/fintech/route";

export const dynamic = "force-dynamic";

/** This browser's payments, re-read from transaction monitoring. */
export async function GET(request: NextRequest) {
  const env = fintechEnv();

  return respond(
    request,
    env,
    await listPayments(env, readAccount(request, env)),
  );
}

/** Add money or send money: one transaction posted to Didit. */
export async function POST(request: NextRequest) {
  const env = fintechEnv();

  return respond(
    request,
    env,
    await createPayment(
      env,
      readAccount(request, env),
      await readBody(request),
    ),
  );
}
