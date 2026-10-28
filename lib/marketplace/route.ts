import type { MarketEnv, Reply } from "./server.ts";

import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  STATE_MAX_AGE,
  openState,
  sealState,
  stateCookieName,
  stateKey,
  type MarketState,
} from "./state.ts";

import { siteConfig } from "@/config/site";
import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { apiKey, diditUrls, isStaging } from "@/lib/didit/config";
import { northmarket } from "@/lib/didit/demos";

/**
 * Glue between Next's route handlers and lib/marketplace/server.ts.
 *
 * Base URL, key and workflows come from lib/didit: the Northmarket config
 * holds the seller KYB, the buyer age check and the key people's KYC for each
 * environment (staging reads the KYB from NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID).
 * With Didit Authentication on, the signed-in user is the shop and the buyer.
 * `DIDIT_CONSOLE_ORG_ID` and `DIDIT_CONSOLE_APP_ID` are optional: the console
 * organization and application behind API_KEY. Without them the server reads
 * both from the API itself (see resolveConsoleIds).
 */
export async function marketEnv(): Promise<MarketEnv> {
  return {
    apiKey: apiKey(),
    apiBase: diditUrls.api,
    isStaging,
    workflows: {
      kyb: northmarket.workflows.sellerKyb,
      age: northmarket.workflows.buyerAge,
      person: northmarket.workflows.person,
    },
    visitor: authEnabled()
      ? await visitorVendorData(northmarket.vendorPrefix)
      : undefined,
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

/** True when the browser reached this server over https (directly or via a proxy). */
function isSecure(request: NextRequest): boolean {
  return (
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:"
  );
}

export function readState(
  request: NextRequest,
  env: MarketEnv,
): MarketState | null {
  if (!env.apiKey) return null;

  return openState(
    request.cookies.get(stateCookieName(isSecure(request)))?.value,
    stateKey(env.apiKey),
  );
}

/** The languages a hosted session accepts (`language` on POST /v3/session/). */
const SESSION_LANGUAGES: readonly string[] = [
  "en",
  "ar",
  "bg",
  "bn",
  "bs",
  "ca",
  "cnr",
  "cs",
  "da",
  "de",
  "el",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "hy",
  "id",
  "it",
  "ja",
  "ka",
  "kk",
  "ko",
  "ky",
  "lt",
  "lv",
  "mk",
  "mn",
  "ms",
  "nl",
  "no",
  "pl",
  "pt-BR",
  "pt",
  "ro",
  "ru",
  "sk",
  "sl",
  "so",
  "sq",
  "sr",
  "sv",
  "th",
  "tr",
  "uk",
  "uz",
  "vi",
  "zh-CN",
  "zh-TW",
  "zh",
];

/**
 * The chrome's language cookie, which the hosted flow follows too, as one of
 * the codes Didit accepts: `pt-BR` as is, `de-AT` as `de`, anything else `en`.
 */
export function readLanguage(request: NextRequest): string {
  const value = request.cookies.get("NEXT_LOCALE")?.value ?? "en";
  const base = value.split("-")[0].toLowerCase();

  if (SESSION_LANGUAGES.includes(value)) return value;

  return SESSION_LANGUAGES.includes(base) ? base : "en";
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

  const secure = isSecure(request);
  const name = stateCookieName(secure);
  // HttpOnly: no script reads it. Lax: it still arrives when the hosted
  // verification redirects back to /marketplace. Path=/ is what `__Host-`
  // requires; only the /api/marketplace routes ever read it.
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
  };

  if (reply.state === null) {
    response.cookies.set(name, "", { ...options, maxAge: 0 });
  } else {
    response.cookies.set(name, sealState(reply.state, stateKey(env.apiKey)), {
      ...options,
      maxAge: STATE_MAX_AGE,
    });
  }

  return response;
}
