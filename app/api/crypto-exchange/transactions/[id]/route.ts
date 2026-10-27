import type { NextRequest } from "next/server";

import {
  didit,
  diditError,
  failure,
  json,
  readAccountCookie,
} from "@/lib/crypto-exchange/server";
import { toTransactionView } from "@/lib/crypto-exchange/transactions";

export const dynamic = "force-dynamic";

/**
 * One of the visitor's transactions, as the exchange's compliance team reads
 * it: `GET /v3/transactions/{id}/` with the API key, then trimmed to what the
 * screen shows. A transaction of anyone else is a 404, never a 403, so the
 * route does not confirm that an id exists.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookie = readAccountCookie(request);

  if (!cookie) return failure("No Kestrel account in this browser.", 401);
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return failure("Not a transaction id.", 400);
  }

  const result = await didit("GET", `/transactions/${params.id}/`);

  if (!result.ok || !result.data) {
    return failure(
      diditError(result, "The transaction could not be read"),
      result.status === 404 ? 404 : 502,
    );
  }

  if (result.data.vendor_data !== cookie.vendorData) {
    return failure("Not found.", 404);
  }

  return json(toTransactionView(result.data));
}
