import type { FintechEnv, Reply } from "./server.ts";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  ACCOUNT_COOKIE,
  ACCOUNT_MAX_AGE,
  cookieKey,
  openAccount,
  sealAccount,
  type AccountState,
} from "./account-cookie.ts";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";
import { siteConfig } from "@/config/site";

/**
 * Glue between Next's route handlers and lib/fintech/server.ts.
 *
 * The demo only runs on STAGING (`NEXT_PUBLIC_IS_STAGING=true`): onboarding
 * there runs AML screening, which is billed per screening on production, and
 * the demo organization's rule and workflow live on staging. Anywhere else
 * every route answers 503 and the page says where the demo runs.
 *
 * `DIDIT_CONSOLE_ORG_ID` and `DIDIT_CONSOLE_APP_ID` are optional: the ids of
 * the console organization and application behind API_KEY. With them the
 * operator panel deep-links each session and transaction; without them it
 * links the console and names the record.
 */
export function fintechEnv(): FintechEnv {
  return {
    apiKey: process.env.API_KEY || "",
    apiBase: VERIFICATION_BASE_URL,
    live: process.env.NEXT_PUBLIC_IS_STAGING === "true",
    console: {
      origin: siteConfig.links.console,
      orgId: process.env.DIDIT_CONSOLE_ORG_ID || null,
      appId: process.env.DIDIT_CONSOLE_APP_ID || null,
    },
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
    newId: () => randomUUID(),
  };
}

export function readAccount(
  request: NextRequest,
  env: FintechEnv,
): AccountState | null {
  if (!env.apiKey) return null;

  return openAccount(
    request.cookies.get(ACCOUNT_COOKIE)?.value,
    cookieKey(env.apiKey),
  );
}

/** The chrome's language cookie, which the hosted flow should follow too. */
export function readLocale(request: NextRequest): string {
  return request.cookies.get("NEXT_LOCALE")?.value ?? "en";
}

export async function readBody(request: NextRequest): Promise<unknown> {
  return request.json().catch(() => null);
}

export function respond(
  request: NextRequest,
  env: FintechEnv,
  reply: Reply,
): NextResponse {
  const response = NextResponse.json(reply.body, {
    status: reply.status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });

  if (reply.account === undefined || !env.apiKey) return response;

  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      request.headers.get("x-forwarded-proto") === "https" ||
      request.nextUrl.protocol === "https:",
    // Only the demo's own routes ever need it.
    path: "/api/fintech",
  };

  if (reply.account === null) {
    response.cookies.set(ACCOUNT_COOKIE, "", { ...options, maxAge: 0 });
  } else {
    response.cookies.set(
      ACCOUNT_COOKIE,
      sealAccount(reply.account, cookieKey(env.apiKey)),
      { ...options, maxAge: ACCOUNT_MAX_AGE },
    );
  }

  return response;
}
