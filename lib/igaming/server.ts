import type { ConsoleContext } from "./policy";

import { NextRequest, NextResponse } from "next/server";

import { PLAYER_COOKIE, verifyPlayer } from "./player";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";
import { siteConfig } from "@/config/site";

/**
 * The server half of /igaming: every call that needs the API key.
 *
 * Route handlers under app/api/igaming stay thin - read the player from the
 * signed cookie, make the Didit call(s) through `didit()`, project the result
 * with lib/igaming/records - and return `didit: DiditCall[]` alongside, so the
 * page's API log shows the Didit request each click really made rather than
 * this app's own route.
 */

export interface DiditCall {
  method: string;
  path: string;
  status: number;
}

export interface DiditResult {
  ok: boolean;
  status: number;
  data: unknown;
  call: DiditCall;
}

export function apiKey(): string {
  return process.env.API_KEY || "";
}

export async function didit(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<DiditResult> {
  try {
    const response = await fetch(`${VERIFICATION_BASE_URL}${path}`, {
      method,
      headers: { "x-api-key": apiKey(), "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      data,
      call: { method, path, status: response.status },
    };
  } catch {
    return {
      ok: false,
      status: 502,
      data: { detail: "The Didit API could not be reached." },
      call: { method, path, status: 0 },
    };
  }
}

export function noStore(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers || {}) },
  });
}

/** The visitor's player id, or null when the cookie is missing or forged. */
export function readPlayer(request: NextRequest): string | null {
  return verifyPlayer(request.cookies.get(PLAYER_COOKIE)?.value, apiKey());
}

export function noPlayer() {
  return noStore(
    { error: "Start by creating an account: there is no demo player yet." },
    { status: 401 },
  );
}

let consoleCache: ConsoleContext | null = null;

/**
 * Organization and application ids for Console deep links. Neither id is in a
 * decision or a transaction detail, but every transaction summary carries
 * both, and they never change for an API key - so one list call is cached for
 * the life of the server.
 */
export async function consoleContext(
  calls: DiditCall[],
): Promise<ConsoleContext | null> {
  if (consoleCache) return consoleCache;
  const result = await didit("GET", "/v3/transactions/?limit=1");

  calls.push(result.call);
  const first = (result.data as { results?: Record<string, unknown>[] })
    ?.results?.[0];
  const organizationId = first?.organization_id;
  const applicationId = first?.application_id;

  if (typeof organizationId !== "string" || typeof applicationId !== "string")
    return null;
  consoleCache = {
    base: siteConfig.links.console,
    organizationId,
    applicationId,
  };

  return consoleCache;
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
