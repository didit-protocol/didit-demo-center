import type { NextRequest } from "next/server";

import { randomUUID } from "node:crypto";

import {
  didit,
  diditError,
  failure,
  json,
  lookupAccount,
} from "@/lib/crypto-exchange/server";
import {
  buildDepositPayload,
  isEvmAddress,
  newTxnId,
  parseAmount,
  toTransactionView,
  type DepositSource,
} from "@/lib/crypto-exchange/transactions";

export const dynamic = "force-dynamic";

const SOURCES: DepositSource[] = ["own-wallet", "unknown-sender"];

/**
 * An incoming deposit, reported the way an exchange's backend reports one once
 * its node sees the transfer confirm: `POST /v3/transactions/` with the API
 * key. There is no chain behind Kestrel, so the visitor's button plays the
 * node's part - everything Didit does with the deposit is real.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const source = body?.source as DepositSource;
  const amount = parseAmount(String(body?.amount ?? ""));
  const ownWallet = String(body?.ownWallet ?? "");

  if (!SOURCES.includes(source) || !amount || !isEvmAddress(ownWallet)) {
    return failure("Pick a deposit source and an amount between 0.01 and 5 ETH.", 400);
  }

  const lookup = await lookupAccount(request, { requireApproved: true });

  if (!lookup.ok) return lookup.response;

  const result = await didit(
    "POST",
    "/transactions/",
    buildDepositPayload({
      txnId: newTxnId("dep", randomUUID()),
      vendorData: lookup.cookie.vendorData,
      fullName: lookup.account.fullName ?? "",
      amount,
      source,
      ownWallet,
    }),
  );

  if (!result.ok || !result.data) {
    return failure(
      diditError(result, "Didit did not accept the deposit"),
      result.status >= 400 && result.status < 500 ? result.status : 502,
    );
  }

  return json(toTransactionView(result.data), { status: 201 });
}
