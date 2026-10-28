import { NextRequest } from "next/server";

import { AGE_WORKFLOW_ID, OPERATOR_NAME } from "@/lib/igaming/policy";
import { diditErrorMessage } from "@/lib/igaming/records";
import { gateway, noPlayer, noStore, readPlayer } from "@/lib/igaming/server";
import { didit as diditClient } from "@/lib/didit/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where the hosted flow sends the player when they finish on another device.
 * Built from this site's own address, never from the request: a return URL
 * the caller chose would let anyone mint a genuine Didit link that lands on
 * their own site afterwards.
 */
const CALLBACK = new URL("/igaming", siteConfig.url).toString();

/**
 * Registration: create the adaptive age-check session for this player.
 *
 * The email goes to the session's contact details with notifications off, so
 * the Didit user carries it without the demo ever emailing anyone.
 */
export async function POST(request: NextRequest) {
  const playerId = await readPlayer(request);

  if (!playerId) return noPlayer();

  const body = await request.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const email = String(body?.email ?? "").trim();

  // A Didit Authentication sign-up gives an email only; the name comes later
  // from the ID. The casino's own sign-up asks for it.
  if (fullName && (fullName.length < 2 || fullName.length > 80)) {
    return noStore({ error: "Enter your full name." }, { status: 400 });
  }
  if (!EMAIL.test(email) || email.length > 120) {
    return noStore({ error: "Enter a valid email address." }, { status: 400 });
  }

  const result = gateway(
    await diditClient.sessions.create({
      workflowId: AGE_WORKFLOW_ID,
      vendorData: playerId,
      callback: CALLBACK,
      email,
      metadata: {
        operator: OPERATOR_NAME,
        step: "registration",
        ...(fullName ? { full_name: fullName } : {}),
      },
    }),
  );

  if (!result.ok) {
    return noStore(
      {
        error:
          diditErrorMessage(result.data) ??
          "The age check could not be created.",
        didit: [result.call],
      },
      { status: result.status >= 500 ? 502 : result.status },
    );
  }

  const session = result.data as { session_id?: string; url?: string };

  return noStore({
    sessionId: session.session_id,
    url: session.url,
    didit: [result.call],
  });
}
