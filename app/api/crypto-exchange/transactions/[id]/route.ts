import type { NextRequest } from "next/server";

import {
  UUID,
  diditFailure,
  failure,
  json,
  noAccount,
  readAccount,
} from "@/lib/crypto-exchange/server";
import { toTransactionView } from "@/lib/crypto-exchange/transactions";
import { didit } from "@/lib/didit/server";

export const dynamic = "force-dynamic";

/**
 * One of the visitor's transactions, as the exchange's compliance team reads
 * it: `GET /v3/transactions/{id}/` with the API key, then trimmed to what the
 * screen shows. A transaction of anyone else is a 404, never a 403, so the
 * route does not confirm that an id exists.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const cookie = await readAccount(request);

  if (!cookie) return noAccount();
  if (!UUID.test(id)) return failure("Not a transaction id.", 400);

  const result = await didit.transactions.get(id);

  if (result.status === 404) return failure("Not found.", 404);
  if (!result.ok || !result.data) {
    return diditFailure(result, "The transaction could not be read.");
  }
  if (result.data.vendor_data !== cookie.vendorData) {
    return failure("Not found.", 404);
  }

  return json(toTransactionView(result.data));
}
