"use client";

import * as React from "react";
import { ArrowRight, Banknote } from "lucide-react";

import { useMarket } from "./market-context";
import { TransactionCard } from "./transaction-card";
import { ActionButton, Card, CardHeader, Empty, Notice } from "./ui";

import { formatEur } from "@/lib/marketplace/catalog";
import { PAYOUT_LIMITS, parsePayoutAmount } from "@/lib/marketplace/payloads";
import { kybStatus, payoutsUnlocked } from "@/lib/marketplace/status";

export function PayoutsChapter() {
  const market = useMarket();
  const seller = market.view?.sellers[0] ?? null;
  const [amount, setAmount] = React.useState("480");
  const parsed = parsePayoutAmount(amount);
  const payouts = (market.view?.transactions ?? []).filter(
    (tx) => tx.kind === "payout",
  );
  const cleared = (market.view?.transactions ?? [])
    .filter((tx) => tx.kind === "purchase" && tx.status === "APPROVED")
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (!seller) {
    return (
      <Card>
        <CardHeader
          description="Payouts belong to a shop. Open one first, then come back."
          eyebrow="Payouts"
          title="No shop yet"
        />
        <ActionButton variant="ink" onClick={() => market.setChapter("seller")}>
          Open a shop
          <ArrowRight className="size-4" />
        </ActionButton>
      </Card>
    );
  }

  const unlocked = payoutsUnlocked(seller.kyb?.status ?? null);
  const kybMeta = kybStatus(seller.kyb?.status ?? null);
  const error =
    market.error?.scope === `payout:${seller.id}` ? market.error.message : null;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          description="Every payout goes to transaction monitoring from this device, and the demo's server refuses to mint a payout token until the shop's KYB is approved."
          eyebrow={seller.shop}
          title="Request a payout"
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="mkt-inset p-4">
            <p className="eyebrow eyebrow-muted mb-1.5">Cleared sales</p>
            <p className="tnum m-0 text-2xl font-medium tracking-tight text-ink">
              {formatEur(cleared)}
            </p>
            <p className="m-0 mt-1 text-xs text-muted">
              Approved orders from this browser.
            </p>
          </div>
          <div className="mkt-inset p-4">
            <p className="eyebrow eyebrow-muted mb-1.5">
              Business verification
            </p>
            <p className="m-0 text-2xl font-medium tracking-tight text-ink">
              {kybMeta.label}
            </p>
            <p className="m-0 mt-1 text-xs text-muted">
              {unlocked ? "Payouts are unlocked." : "Payouts are locked."}
            </p>
          </div>
        </div>

        {unlocked ? (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (parsed) market.payout(seller, parsed);
            }}
          >
            <div className="w-full max-w-[220px]">
              <label className="mkt-label" htmlFor="payout-amount">
                Amount (EUR)
              </label>
              <input
                className="mkt-input tnum"
                id="payout-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <ActionButton
              busy={market.busy === `payout:${seller.id}`}
              disabled={!parsed}
              type="submit"
            >
              <Banknote className="size-4" />
              Pay out {parsed ? formatEur(parsed) : ""}
            </ActionButton>
            {!parsed ? (
              <p className="m-0 w-full text-xs text-danger">
                Between {formatEur(PAYOUT_LIMITS.min)} and{" "}
                {formatEur(PAYOUT_LIMITS.max)}.
              </p>
            ) : null}
          </form>
        ) : (
          <Notice
            action={
              <button
                className="mkt-btn-ghost h-8 flex-none px-3 text-xs"
                type="button"
                onClick={() => market.setChapter("seller")}
              >
                Go to onboarding
              </button>
            }
            title="Payouts are locked"
          >
            {kybMeta.description}
          </Notice>
        )}

        {error ? (
          <div className="mt-4">
            <Notice tone="declined">{error}</Notice>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          description="Each payout with the decision and the rules that ran on it."
          eyebrow="History"
          title="Payouts"
        />
        {payouts.length ? (
          <div className="flex flex-col gap-3">
            {payouts.map((payout) => (
              <TransactionCard key={payout.uuid} tx={payout} />
            ))}
          </div>
        ) : (
          <Empty>No payouts yet.</Empty>
        )}
      </Card>

      <div>
        <ActionButton variant="ink" onClick={() => market.setChapter("fraud")}>
          Next: a fraudster opens a second shop
          <ArrowRight className="size-4" />
        </ActionButton>
      </div>
    </div>
  );
}
