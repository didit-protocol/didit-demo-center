import { NextRequest, NextResponse } from "next/server";

import {
  createCatalogueSession,
  readCatalogueDecision,
} from "@/lib/didit/catalogue";

export const dynamic = "force-dynamic";

/**
 * The demo centre's own session route.
 *
 * It exists so the API key never reaches the browser: the catalogue POSTs here
 * and `lib/didit/catalogue.ts` calls the real Didit API through the shared
 * client, which holds the key. Every hosted demo on the site runs through it,
 * and so do /accs and /ibeta.
 *
 * Both calls speak v3 - the version the API reference documents and the version
 * every snippet in the catalogue hands a developer, so what they copy is what
 * this app actually did.
 */

function withNoStore(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: NextRequest) {
  const answer = await readCatalogueDecision(
    request.nextUrl.searchParams.get("sessionId"),
  );

  return withNoStore(answer.body, answer.status);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const answer = await createCatalogueSession(body);

  return withNoStore(answer.body, answer.status);
}
