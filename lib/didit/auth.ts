import { auth } from "@didit-protocol/auth-nextjs/server";

import { diditUrls, publishableKey, vendorDataFor } from "./config";

/**
 * Didit Authentication on the server.
 *
 * It is on only when `DIDIT_PUBLISHABLE_KEY` holds a publishable key. Without
 * one (the production application until Authentication ships there) the
 * middleware passes every request through, the root layout renders no
 * provider and each demo keeps its own sign-in.
 */
export function authEnabled(): boolean {
  return publishableKey() !== null;
}

/**
 * The environment auth-nextjs reads. `DIDIT_REDIRECT_URI` defaults to this
 * site's `/auth/callback`, the address registered for the demo application;
 * set it explicitly for localhost.
 */
export function authEnv(): Record<string, string | undefined> {
  const redirect =
    process.env.DIDIT_REDIRECT_URI?.trim() || `${diditUrls.site}/auth/callback`;

  // auth() and the server <DiditAuth> read process.env themselves.
  process.env.DIDIT_REDIRECT_URI = redirect;

  return {
    DIDIT_PUBLISHABLE_KEY: publishableKey() ?? undefined,
    DIDIT_REDIRECT_URI: redirect,
    DIDIT_SESSION_CACHE_SECONDS: process.env.DIDIT_SESSION_CACHE_SECONDS,
  };
}

export /** The `exp` of a JWT-shaped access token in ms, or null for an opaque one. */
function tokenExpiry(token: string | null | undefined): number | null {
  const payload = token?.split(".")[1];

  if (!payload) return null;
  try {
    const json = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: unknown };

    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export interface Visitor {
  /** The Didit Authentication user id (`sub`). */
  userId: string;
  email: string | null;
  /** How they signed in: `passkey`, `code`, `password`. */
  methods: string[];
}

/** The signed-in Didit user, or null when signed out or Authentication is off. */
export async function currentVisitor(): Promise<Visitor | null> {
  if (!authEnabled()) return null;
  authEnv();
  try {
    const { session } = await auth();

    if (!session) return null;

    return {
      userId: session.user.id,
      email: session.user.email,
      methods: session.methods,
    };
  } catch {
    return null;
  }
}

/**
 * The `vendor_data` for the signed-in visitor in one demo: the demo's prefix
 * plus their Didit user id. Null when nobody is signed in.
 */
export async function visitorVendorData(
  prefix: string,
): Promise<string | null> {
  const visitor = await currentVisitor();

  return visitor ? vendorDataFor(prefix, visitor.userId) : null;
}
