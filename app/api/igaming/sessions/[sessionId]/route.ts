import { NextRequest } from "next/server";

import { projectSession } from "@/lib/igaming/records";
import { gateway, noPlayer, noStore, readPlayer } from "@/lib/igaming/server";
import { didit as diditClient } from "@/lib/didit/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One of this player's verification sessions (the age check or the ID
 * step-up), read from `GET /v3/session/{id}/decision/` and cut down to what
 * the page shows. A session that belongs to anyone else is a 404.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const params = await context.params;
  const playerId = await readPlayer(request);

  if (!playerId) return noPlayer();
  if (!UUID.test(params.sessionId)) {
    return noStore({ error: "Unknown session." }, { status: 404 });
  }

  const result = gateway(await diditClient.sessions.decision(params.sessionId));
  const session = result.ok ? projectSession(result.data, playerId) : null;

  if (!session) {
    return noStore(
      {
        error:
          result.status >= 500
            ? "The session could not be read from Didit."
            : "Unknown session.",
        didit: [result.call],
      },
      { status: result.status >= 500 ? 502 : 404 },
    );
  }

  return noStore({ session, didit: [result.call] });
}
