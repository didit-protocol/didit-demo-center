import { NextRequest, NextResponse } from "next/server";

import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { DEMOS } from "@/lib/didit/demos";
import { didit, diditMessage } from "@/lib/didit/server";
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
 * with Authentication off, the Aurora Play player cookie.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const demo = DEMOS.find((item) => item.id === body?.demo);

  if (!demo) return reply({ error: "Unknown demo." }, 400);

  const vendorData = authEnabled()
    ? await visitorVendorData(demo.vendorPrefix)
    : demo.id === "aurora-play"
      ? await readPlayer(request)
      : null;

  if (!vendorData) return reply({ error: "Nobody is signed in." }, 401);

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
