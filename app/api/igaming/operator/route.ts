import { NextRequest } from "next/server";

import { projectUser } from "@/lib/igaming/records";
import {
  type DiditCall,
  consoleContext,
  gateway,
  noPlayer,
  noStore,
  readPlayer,
} from "@/lib/igaming/server";
import { didit as diditClient } from "@/lib/didit/server";

export const dynamic = "force-dynamic";

/**
 * What the operator panel needs from the server: the Console ids for deep
 * links, and this player's Didit user record (status, internal id).
 */
export async function GET(request: NextRequest) {
  const playerId = await readPlayer(request);

  if (!playerId) return noPlayer();

  const calls: DiditCall[] = [];
  const context = await consoleContext(calls);
  const user = gateway(await diditClient.users.get(playerId));

  calls.push(user.call);

  return noStore({
    console: context,
    player: user.ok ? projectUser(user.data, playerId) : null,
    didit: calls,
  });
}
