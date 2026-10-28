import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@didit-protocol/auth-nextjs/server";

import { authEnabled, authEnv, tokenExpiry } from "@/lib/didit/auth";

export const dynamic = "force-dynamic";

const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

async function state(renewing: boolean) {
  if (!authEnabled()) return reply({ signedIn: false, expiresAt: null });
  authEnv();
  try {
    const { session, getToken } = await auth();

    if (session)
      return reply({
        signedIn: true,
        expiresAt: tokenExpiry(await getToken()),
      });
    // A refused refresh token leaves the request without one; one that is
    // still here means Didit could not be reached, so the session may be fine.
    const store = await cookies();

    if (renewing && (store.has("__Host-didit_rt") || store.has("didit_rt")))
      return reply({ error: "unavailable" }, 503);

    return reply({ signedIn: false, expiresAt: null });
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}

/**
 * The visitor's session for the browser's keeper (lib/didit/session-keeper):
 * GET reads it; POST arrives without its access token (middleware.ts drops
 * it), so the proxy rotates the refresh token first and this answers with
 * the renewed session, or signed out when Didit refused the rotation.
 */
export const GET = () => state(false);
export const POST = () => state(true);
