import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The demo bank's "database": one signed, httpOnly cookie per browser.
 *
 * It holds the visitor's own customer id, the verification session they
 * started and the uuids of the payments they made - nothing else. Because the
 * server only ever reads a session or a transaction whose id is in THIS
 * cookie, a visitor can see their own records and never anyone else's, and
 * because the cookie is signed they cannot swap another id in.
 */
export const ACCOUNT_COOKIE = "fintech_demo_account";

/** A week, the same as the onboarding workflow's session expiry. */
export const ACCOUNT_MAX_AGE = 7 * 24 * 60 * 60;

export interface AccountState {
  v: 1;
  /** Customer id, sent to Didit as `vendor_data` everywhere. */
  id: string;
  name: string;
  email: string;
  /** ISO 3166-1 alpha-3. */
  country: string;
  /** The onboarding session, once started. */
  sid: string | null;
  /** Payment uuids, oldest first. */
  tx: string[];
  /** Created at, epoch ms. */
  at: number;
}

/**
 * The signing key is derived from the server-side API key, so the demo needs
 * no extra secret and the key itself is never used directly.
 */
export function cookieKey(apiKey: string): Buffer {
  return createHash("sha256")
    .update(`didit-demo-center/fintech-account/${apiKey}`)
    .digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function sealAccount(state: AccountState, key: Buffer): string {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString(
    "base64url",
  );

  return `${payload}.${sign(payload, key)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isState(value: unknown): value is AccountState {
  const s = value as AccountState;

  return (
    !!s &&
    s.v === 1 &&
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.email === "string" &&
    typeof s.country === "string" &&
    (s.sid === null || (typeof s.sid === "string" && UUID.test(s.sid))) &&
    Array.isArray(s.tx) &&
    s.tx.every((id) => typeof id === "string" && UUID.test(id)) &&
    typeof s.at === "number"
  );
}

/** Returns the state, or null for a missing, tampered or malformed cookie. */
export function openAccount(
  token: string | undefined,
  key: Buffer,
  now: number = Date.now(),
): AccountState | null {
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");

  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, key));
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return null;

  try {
    const state = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    if (!isState(state)) return null;
    if (now - state.at > ACCOUNT_MAX_AGE * 1000) return null;

    return state;
  } catch {
    return null;
  }
}
