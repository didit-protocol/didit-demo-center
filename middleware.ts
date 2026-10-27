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

export default function middleware(request: NextRequest) {
  return proxy ? proxy(request) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demos/|brand/).*)"],
};
