import { NextRequest } from "next/server";

import {
  createAccount,
  deleteAccount,
  getAccount,
} from "@/lib/fintech/server";
import { fintechEnv, readAccount, readBody, respond } from "@/lib/fintech/route";

export const dynamic = "force-dynamic";

/** The visitor's bank account and, once started, their onboarding status. */
export async function GET(request: NextRequest) {
  const env = fintechEnv();

  return respond(request, env, await getAccount(env, readAccount(request, env)));
}

/** Sign-up: opens the account. Nothing is sent to Didit yet. */
export async function POST(request: NextRequest) {
  const env = fintechEnv();

  return respond(request, env, await createAccount(env, await readBody(request)));
}

/** "Start over": forgets the account in this browser. */
export async function DELETE(request: NextRequest) {
  const env = fintechEnv();

  return respond(request, env, await deleteAccount());
}
