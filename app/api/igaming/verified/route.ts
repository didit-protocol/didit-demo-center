import { NextRequest } from "next/server";

import { KYC_WORKFLOW_ID, LIST_NAMES } from "@/lib/igaming/policy";
import { diditErrorMessage, projectSession } from "@/lib/igaming/records";
import {
  type DiditCall,
  didit,
  gateway,
  listId,
  noPlayer,
  noStore,
  readPlayer,
} from "@/lib/igaming/server";
import { didit as diditClient } from "@/lib/didit/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Records a passed ID step-up: the player goes on the "ID-verified players"
 * list, which the step-up rule skips, so the next deposit is not held again.
 *
 * In production this is a webhook handler reacting to `status.updated`; the
 * demo has no webhook endpoint of its own on the shared application, so the
 * page calls it when the hosted flow reports back. It re-reads the decision
 * itself and only trusts an Approved session of the ID workflow that belongs
 * to this player.
 */
export async function POST(request: NextRequest) {
  const playerId = await readPlayer(request);

  if (!playerId) return noPlayer();

  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId ?? "");
  const calls: DiditCall[] = [];

  if (!UUID.test(sessionId)) {
    return noStore({ error: "Unknown session." }, { status: 404 });
  }

  const decision = gateway(await diditClient.sessions.decision(sessionId));

  calls.push(decision.call);
  if (decision.status >= 500) {
    return noStore(
      { error: "The ID verification could not be read from Didit.", didit: calls },
      { status: 502 },
    );
  }
  const session = decision.ok ? projectSession(decision.data, playerId) : null;

  if (!session) {
    return noStore(
      { error: "Unknown session.", didit: calls },
      { status: 404 },
    );
  }
  if (session.workflowId !== KYC_WORKFLOW_ID || session.status !== "Approved") {
    return noStore(
      { error: "Only an approved ID verification counts.", didit: calls },
      { status: 409 },
    );
  }

  const verifiedList = await listId(LIST_NAMES.verified, calls);

  if (!verifiedList) {
    return noStore(
      {
        error: `The "${LIST_NAMES.verified}" list is missing. Run npm run igaming:setup.`,
        didit: calls,
      },
      { status: 500 },
    );
  }

  const entry = await didit("POST", `/v3/lists/${verifiedList}/entries/`, {
    value: playerId,
    display_label: playerId,
    comment: `ID verified in session ${session.sessionId}`,
  });

  calls.push(entry.call);
  const duplicate =
    entry.status === 400 &&
    /already exists/i.test(diditErrorMessage(entry.data) ?? "");

  if (!entry.ok && !duplicate) {
    return noStore(
      {
        error:
          diditErrorMessage(entry.data) ?? "The player could not be listed.",
        didit: calls,
      },
      { status: 502 },
    );
  }

  return noStore({ verified: true, didit: calls });
}
