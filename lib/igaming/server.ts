import type { ConsoleContext } from "./policy";

import { NextRequest, NextResponse } from "next/server";

import { PLAYER_COOKIE, verifyPlayer } from "./player";
import { PLAYER_PREFIX } from "./policy";

import { siteConfig } from "@/config/site";
import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { apiKey as sharedApiKey } from "@/lib/didit/config";
import {
  type DiditCall,
  type DiditResult as SharedResult,
  callDidit,
  consoleIds,
} from "@/lib/didit/server";

/**
 * The server half of /igaming: every call that needs the API key.
 *
 * Route handlers under app/api/igaming stay thin - read the player from the
 * signed cookie, make the Didit call(s) through `didit()`, project the result
 * with lib/igaming/records - and return `didit: DiditCall[]` alongside, so the
 * page's API log shows the Didit request each click really made rather than
 * this app's own route.
 */

export type { DiditCall };

export interface DiditResult {
  ok: boolean;
  status: number;
  data: unknown;
  call: DiditCall;
}

export function apiKey(): string {
  return sharedApiKey();
}

/** A shared-client result where "unreachable" reads as a 502. */
export function gateway<T>(result: SharedResult<T>): DiditResult {
  return result.status === 0
    ? {
        ...result,
        status: 502,
        data: { detail: "The Didit API could not be reached." },
      }
    : result;
}

/** One Didit call through the shared client; unreachable reads as a 502. */
export async function didit(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<DiditResult> {
  return gateway(await callDidit(method, path, body));
}

export function noStore(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers || {}) },
  });
}

/**
 * The visitor's player id: with Didit Authentication on, the signed-in Didit
 * user as `vendor_data`; otherwise the signed player cookie. Null when there
 * is neither, or the cookie is forged.
 */
export async function readPlayer(request: NextRequest): Promise<string | null> {
  if (authEnabled()) return visitorVendorData(PLAYER_PREFIX);

  return verifyPlayer(request.cookies.get(PLAYER_COOKIE)?.value, apiKey());
}

export function noPlayer() {
  return noStore(
    { error: "Start by creating an account: there is no demo player yet." },
    { status: 401 },
  );
}

/** Organization and application ids for Console deep links. */
export async function consoleContext(
  calls: DiditCall[],
): Promise<ConsoleContext | null> {
  const ids = await consoleIds(calls);

  return ids ? { base: siteConfig.links.console, ...ids } : null;
}

const listCache = new Map<string, string>();

/** A list's uuid by name, as `npm run igaming:setup` created it. */
export async function listId(
  name: string,
  calls: DiditCall[],
): Promise<string | null> {
  const cached = listCache.get(name);

  if (cached) return cached;
  const result = await didit("GET", "/v3/lists/?page_size=200");

  calls.push(result.call);
  const found = (
    result.data as { results?: { uuid?: string; name?: string }[] }
  )?.results?.find((list) => list.name === name);

  if (!found?.uuid) return null;
  listCache.set(name, found.uuid);

  return found.uuid;
}
