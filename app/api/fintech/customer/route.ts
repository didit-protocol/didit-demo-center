import { NextRequest } from "next/server";

import { authEnabled } from "@/lib/didit/auth";
import { apiKey } from "@/lib/didit/config";
import {
  CUSTOMER_COOKIE,
  CUSTOMER_COOKIE_OPTIONS,
  newCustomerId,
  signCustomer,
} from "@/lib/fintech/customer";
import { noCustomer, noStore, readCustomer } from "@/lib/fintech/server";

export const dynamic = "force-dynamic";

/**
 * The Alder customer of this browser, if there is one. `authenticated` is
 * true only for a visitor signed in with Didit Authentication, never just
 * because Authentication is on.
 */
export async function GET(request: NextRequest) {
  const customerId = await readCustomer(request);

  return noStore({
    customerId,
    authenticated: authEnabled() && customerId !== null,
  });
}

/**
 * Opens an Alder account. With Didit Authentication on the customer is the
 * signed-in Didit user, so there is nothing to create; without it, a fresh
 * `vendor_data` goes into a signed cookie.
 */
export async function POST(request: NextRequest) {
  if (authEnabled()) {
    const customerId = await readCustomer(request);

    return customerId
      ? noStore({ customerId, authenticated: true })
      : noCustomer();
  }
  if (!apiKey()) {
    return noStore(
      { error: "The server has no API_KEY configured." },
      { status: 500 },
    );
  }

  const customerId = newCustomerId();
  const response = noStore({ customerId });

  response.cookies.set(
    CUSTOMER_COOKIE,
    signCustomer(customerId, apiKey()),
    CUSTOMER_COOKIE_OPTIONS,
  );

  return response;
}
