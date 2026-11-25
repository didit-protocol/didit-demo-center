import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The demo player's identity: a random `vendor_data` in a signed, httpOnly
 * cookie.
 *
 * The server routes use it to scope every Didit call (token minting, session
 * reads, self-exclusion) to the visitor who started it. Signing means knowing
 * someone else's player id - it is printed in the operator panel - is not
 * enough to read their records.
 */

/**
 * The cookie's name. Over HTTPS it carries the `__Host-` prefix, so the
 * browser only accepts it Secure, for the whole site and from this exact
 * host (no subdomain can plant or overwrite it). Plain-HTTP localhost cannot
 * hold a `__Host-` cookie, so development keeps the bare name.
 */
export const PLAYER_COOKIE = "aurora_player";
export const SECURE_PLAYER_COOKIE = `__Host-${PLAYER_COOKIE}`;
export const PLAYER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function playerCookieName(secure: boolean): string {
  return secure ? SECURE_PLAYER_COOKIE : PLAYER_COOKIE;
}

/** The attributes the player cookie is always set (and cleared) with. */
export function playerCookieOptions(secure: boolean, maxAge: number) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

const PREFIX = "aurora-play-";

export function newPlayerId(): string {
  return `${PREFIX}${randomBytes(12).toString("hex")}`;
}

function signature(playerId: string, secret: string): string {
  return createHmac("sha256", `aurora-play-player-v1:${secret}`)
    .update(playerId)
    .digest("base64url");
}

export function signPlayer(playerId: string, secret: string): string {
  return `${playerId}.${signature(playerId, secret)}`;
}

/** The player id inside a cookie value, or null when it is missing or forged. */
export function verifyPlayer(
  cookie: string | null | undefined,
  secret: string,
): string | null {
  if (!cookie || !secret) return null;
  const dot = cookie.lastIndexOf(".");

  if (dot <= 0) return null;
  const playerId = cookie.slice(0, dot);

  if (!new RegExp(`^${PREFIX}[a-f0-9]{24}$`).test(playerId)) return null;

  const given = Buffer.from(cookie.slice(dot + 1));
  const expected = Buffer.from(signature(playerId, secret));

  return given.length === expected.length && timingSafeEqual(given, expected)
    ? playerId
    : null;
}
