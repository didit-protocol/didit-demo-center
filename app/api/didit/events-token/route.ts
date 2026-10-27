import { NextRequest, NextResponse } from "next/server";

import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { apiKey } from "@/lib/didit/config";
import { DEMOS } from "@/lib/didit/demos";
import { didit, diditMessage } from "@/lib/didit/server";
import { CUSTOMER_COOKIE, verifyCustomer } from "@/lib/fintech/customer";
import { readPlayer } from "@/lib/igaming/server";

export const dynamic = "force-dynamic";

const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

/**
 * A monitoring token for the visitor's own events (page views, sign-ups,
 * sign-ins) in one demo. Didit ties every event to the `vendor_data` the
 * token is minted for: the signed-in Didit user with the demo's prefix, or,
 * with Authentication off, that demo's own signed cookie.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const demo = DEMOS.find((item) => item.id === body?.demo);

  if (!demo) return reply({ error: "Unknown demo." }, 400);

  let vendorData: string | null = null;

  if (authEnabled()) {
    vendorData = await visitorVendorData(demo.vendorPrefix);
  } else if (demo.id === "aurora-play") {
    vendorData = await readPlayer(request);
  } else if (demo.id === "alder") {
    vendorData = verifyCustomer(
      request.cookies.get(CUSTOMER_COOKIE)?.value,
      apiKey(),
    );
  }

  // No identity means there is nothing to attribute the events to. This is
  // not an error: a page load must not log a 401 while nobody is signed in.
  if (!vendorData)
    return reply({ token: null, expiresAt: null, vendorData: null });

  const result = await didit.events.sdkToken({ vendorData });
  const token = result.data?.monitoring_token;

  if (!result.ok || !token) {
    return reply(
      {
        error: diditMessage(result, "A monitoring token could not be minted."),
        didit: [result.call],
      },
      502,
    );
  }

  return reply({
    token,
    expiresAt: result.data?.expires_at ?? null,
    vendorData,
    didit: [result.call],
  });
}
