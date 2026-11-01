import { NextRequest, NextResponse } from "next/server";

import { CUSTOMER_PREFIX } from "./alder";
import { CUSTOMER_COOKIE, verifyCustomer } from "./customer";

import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { apiKey } from "@/lib/didit/config";
import {
  type DiditCall,
  type DiditResult,
  diditMessage,
} from "@/lib/didit/server";

/**
 * The server half of /fintech (Alder). Route handlers under app/api/fintech
 * stay thin: read the customer, make the Didit call through lib/didit, cut
 * the answer down with lib/igaming/records' projections and return
 * `didit: DiditCall[]`, the requests that really ran.
 */

export type { DiditCall };

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function noStore(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers || {}) },
  });
}

/**
 * The customer's id (`vendor_data`): with Didit Authentication on, the
 * signed-in Didit user with Alder's prefix; otherwise the signed cookie.
 * Null when there is neither, or the cookie is forged.
 */
export async function readCustomer(
  request: NextRequest,
): Promise<string | null> {
  if (authEnabled()) return visitorVendorData(CUSTOMER_PREFIX);

  return verifyCustomer(request.cookies.get(CUSTOMER_COOKIE)?.value, apiKey());
}

/**
 * No customer on this request. With Authentication on that means the Didit
 * session ended (signed out, or it expired in another tab), so the visitor
 * is told to sign in again rather than to open an account they already have.
 */
export function noCustomer() {
  return noStore(
    {
      error: authEnabled()
        ? "Your sign-in has ended. Sign in to Alder again."
        : "Open your Alder account first.",
      code: "no_customer",
    },
    { status: 401 },
  );
}

/** A failed Didit call, with Didit's own reason. */
export function failed(result: DiditResult, fallback: string) {
  return noStore(
    { error: diditMessage(result, fallback), didit: [result.call] },
    { status: result.status === 0 || result.status >= 500 ? 502 : 400 },
  );
}
