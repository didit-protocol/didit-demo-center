import { NextResponse } from "next/server";
import { auth } from "@didit-protocol/auth-nextjs/server";

import { authEnabled, authEnv, tokenExpiry } from "@/lib/didit/auth";

export const dynamic = "force-dynamic";

async function state() {
  if (!authEnabled())
    return NextResponse.json({ signedIn: false, expiresAt: null });
  authEnv();
  try {
    const { session, getToken } = await auth();

    return NextResponse.json(
      {
        signedIn: Boolean(session),
        expiresAt: session ? tokenExpiry(await getToken()) : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Didit could not be reached: say so, the session may still be valid.
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

/**
 * The visitor's session for the browser's keeper (lib/didit/session-keeper):
 * GET reads it; POST arrives without its access token (middleware.ts drops
 * it), so the proxy rotates the refresh token first and this answers with
 * the renewed session, or signed out when the rotation failed.
 */
export const GET = state;
export const POST = state;
