import type { MarketEnv, Reply } from "./server.ts";

import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { STAGING_WORKFLOWS } from "./config.ts";
import {
  STATE_COOKIE,
  STATE_MAX_AGE,
  openState,
  sealState,
  stateKey,
  type MarketState,
} from "./state.ts";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";
import { siteConfig } from "@/config/site";

/**
 * Glue between Next's route handlers and lib/marketplace/server.ts.
 *
 * `DIDIT_CONSOLE_ORG_ID` and `DIDIT_CONSOLE_APP_ID` are optional: the console
 * organization and application behind API_KEY. Without them the server reads
 * both from the API itself (see resolveConsoleIds).
 */
export function marketEnv(): MarketEnv {
  return {
    apiKey: process.env.API_KEY || "",
    apiBase: VERIFICATION_BASE_URL,
    isStaging: process.env.NEXT_PUBLIC_IS_STAGING === "true",
    workflows: STAGING_WORKFLOWS,
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

export function readState(
  request: NextRequest,
  env: MarketEnv,
): MarketState | null {
  if (!env.apiKey) return null;

  return openState(
    request.cookies.get(STATE_COOKIE)?.value,
    stateKey(env.apiKey),
  );
}

/** The chrome's language cookie, which the hosted flow follows too. */
export function readLanguage(request: NextRequest): string {
  const value = request.cookies.get("NEXT_LOCALE")?.value ?? "en";

  return /^[a-z]{2}(-[A-Za-z]{2})?$/.test(value) ? value : "en";
}

export async function readBody(request: NextRequest): Promise<unknown> {
  return request.json().catch(() => null);
}

export function respond(
  request: NextRequest,
  env: MarketEnv,
  reply: Reply,
): NextResponse {
  const response = NextResponse.json(reply.body, {
    status: reply.status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });

  if (reply.state === undefined || !env.apiKey) return response;

  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      request.headers.get("x-forwarded-proto") === "https" ||
      request.nextUrl.protocol === "https:",
    // Only the demo's own routes ever read it.
    path: "/api/marketplace",
  };

  if (reply.state === null) {
    response.cookies.set(STATE_COOKIE, "", { ...options, maxAge: 0 });
  } else {
    response.cookies.set(
      STATE_COOKIE,
      sealState(reply.state, stateKey(env.apiKey)),
      { ...options, maxAge: STATE_MAX_AGE },
    );
  }

  return response;
}
