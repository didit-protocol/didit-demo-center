import { NextRequest } from "next/server";

import { AGE_WORKFLOW_ID, OPERATOR_NAME } from "@/lib/igaming/policy";
import { diditErrorMessage } from "@/lib/igaming/records";
import { didit, noPlayer, noStore, readPlayer } from "@/lib/igaming/server";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registration: create the adaptive age-check session for this player.
 *
 * The email goes to the session's contact details with notifications off, so
 * the Didit user carries it without the demo ever emailing anyone.
 */
export async function POST(request: NextRequest) {
  const playerId = readPlayer(request);

  if (!playerId) return noPlayer();

  const body = await request.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const returnUrl = String(body?.returnUrl ?? "");

  if (fullName.length < 2 || fullName.length > 80) {
    return noStore({ error: "Enter your full name." }, { status: 400 });
  }
  if (!EMAIL.test(email) || email.length > 120) {
    return noStore({ error: "Enter a valid email address." }, { status: 400 });
  }

  let callback: URL;

  try {
    callback = new URL(returnUrl);
  } catch {
    return noStore({ error: "A return URL is required." }, { status: 400 });
  }
  // The hosted flow redirects here when it finishes on another device, so it
  // must be this site's own /igaming page and nowhere else.
  const origin = request.headers.get("origin");

  if (
    !["http:", "https:"].includes(callback.protocol) ||
    !callback.pathname.startsWith("/igaming") ||
    (origin !== null && callback.origin !== origin)
  ) {
    return noStore(
      { error: "The return URL must be this site's /igaming page." },
      { status: 400 },
    );
  }

  const result = await didit("POST", "/v3/session/", {
    workflow_id: AGE_WORKFLOW_ID,
    vendor_data: playerId,
    callback: callback.toString(),
    callback_method: "both",
    contact_details: { email, send_notification_emails: false },
    metadata: {
      operator: OPERATOR_NAME,
      step: "registration",
      full_name: fullName,
    },
  });

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
