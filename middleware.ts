import { NextResponse, type NextRequest } from "next/server";
import { diditAuthProxy } from "@didit-protocol/auth-nextjs/server";

import { publishableKey } from "@/lib/didit/config";
import { diditUrls } from "@/lib/didit/config";

/**
 * Didit Authentication's routes (/auth/sign-up, /auth/callback, /auth/sign-out
 * and the session routes) and session refresh, when a publishable key is
 * configured. Without one every request passes straight through.
 */
const proxy = publishableKey()
  ? diditAuthProxy(
      { afterSignOutUrl: "/igaming" },
      {
        DIDIT_PUBLISHABLE_KEY: publishableKey() ?? undefined,
        DIDIT_REDIRECT_URI:
          process.env.DIDIT_REDIRECT_URI?.trim() ||
          `${diditUrls.site}/auth/callback`,
        DIDIT_SESSION_CACHE_SECONDS: process.env.DIDIT_SESSION_CACHE_SECONDS,
      },
    )
  : null;

/** The browser's session keeper renews here (app/api/didit/session). */
const RENEW_PATH = "/api/didit/session";

export default function middleware(request: NextRequest) {
  if (!proxy) return NextResponse.next();
  // Without its access token the proxy rotates the refresh token now, a
  // minute before the old one expires, instead of on the next burst of calls.
  if (request.method === "POST" && request.nextUrl.pathname === RENEW_PATH) {
    request.cookies.delete("__Host-didit_at");
    request.cookies.delete("didit_at");
  }

  return proxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demos/|brand/).*)"],
};
