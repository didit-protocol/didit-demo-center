import { NextRequest } from "next/server";

import {
  PLAYER_COOKIE,
  PLAYER_COOKIE_MAX_AGE,
  newPlayerId,
  signPlayer,
} from "@/lib/igaming/player";
import { apiKey, noStore, readPlayer } from "@/lib/igaming/server";

export const dynamic = "force-dynamic";

/** The current demo player, if this browser has one. */
export async function GET(request: NextRequest) {
  return noStore({ playerId: await readPlayer(request) });
}

/**
 * A new demo player: a fresh `vendor_data` in a signed cookie. "Join now" and
 * "open a second account on this device" both land here; the device
 * fingerprint the web SDK keeps in localStorage is untouched, which is exactly
 * what the shared-device bonus rule needs to see.
 */
export async function POST(request: NextRequest) {
  if (!apiKey()) {
    return noStore(
      { error: "The server has no API_KEY configured." },
      { status: 500 },
    );
  }

  const playerId = newPlayerId();
  const response = noStore({ playerId });

  response.cookies.set(PLAYER_COOKIE, signPlayer(playerId, apiKey()), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: PLAYER_COOKIE_MAX_AGE,
  });

  return response;
}
