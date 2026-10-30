import { NextRequest } from "next/server";

import { SELF_EXCLUSION_REASON } from "@/lib/igaming/policy";
import { diditErrorMessage, projectUser } from "@/lib/igaming/records";
import { didit, noPlayer, noStore, readPlayer } from "@/lib/igaming/server";

export const dynamic = "force-dynamic";

/**
 * Self-exclusion: block the player on Didit. A BLOCKED user is added to the
 * application's User Blocklist, after which Didit itself refuses their
 * transactions and new verification sessions - the exclusion holds even if a
 * front end forgets to check.
 */
export async function POST(request: NextRequest) {
  const playerId = await readPlayer(request);

  if (!playerId) return noPlayer();

  const result = await didit(
    "PATCH",
    `/v3/users/${encodeURIComponent(playerId)}/update-status/`,
    { status: "BLOCKED", reason: SELF_EXCLUSION_REASON },
  );

  if (!result.ok) {
    return noStore(
      {
        error:
          diditErrorMessage(result.data) ??
          "Self-exclusion could not be saved.",
        didit: [result.call],
      },
      { status: result.status === 404 ? 404 : 502 },
    );
  }

  return noStore({
    player: projectUser(result.data, playerId),
    didit: [result.call],
  });
}
