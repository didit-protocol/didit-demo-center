"use client";

import type { Listing } from "@/lib/marketplace/catalog";

import * as React from "react";
import {
  Armchair,
  ArrowRight,
  Bike,
  Camera,
  Headphones,
  LampDesk,
  ScanEye,
  Watch,
} from "lucide-react";

import { useMarket } from "./market-context";
import { TransactionCard } from "./transaction-card";
import { ActionButton, Card, CardHeader, Empty, Notice } from "./ui";

import {
  HIGH_VALUE_THRESHOLD,
  LISTINGS,
  formatEur,
} from "@/lib/marketplace/catalog";

const ICON: Record<Listing["icon"], typeof Camera> = {
  camera: Camera,
  watch: Watch,
  bike: Bike,
  headphones: Headphones,
  armchair: Armchair,
  lamp: LampDesk,
};

export function BuyerChapter() {
  const market = useMarket();
  const live = market.view?.availability.transactions ?? false;
  const orders = (market.view?.transactions ?? []).filter(
    (tx) => tx.kind === "purchase",
  );
  const shop = market.view?.sellers[0] ?? null;
  const buyError = market.error?.scope.startsWith("buy:")
    ? market.error.message
    : null;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          description={
            <>
              Every order goes to transaction monitoring from this device.
              Orders of {formatEur(HIGH_VALUE_THRESHOLD)} or more wait until the
              buyer passes an age check.
              {shop ? ` Sold by ${shop.shop}.` : ""}
            </>
          }
          eyebrow="Shop as a buyer"
          title="Northmarket storefront"
        />

        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {LISTINGS.map((listing) => {
            const Icon = ICON[listing.icon];
            const highValue = listing.price >= HIGH_VALUE_THRESHOLD;

            return (
              <li
                key={listing.id}
                className="mkt-inset flex flex-col gap-3 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 flex-none items-center justify-center rounded-xs bg-canvas text-ink">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-medium text-ink">
                      {listing.title}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-muted">
                      {listing.detail}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <p className="tnum m-0 flex-1 text-base font-medium text-ink">
                    {formatEur(listing.price)}
                  </p>
                  {highValue ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-pill bg-warning-bg px-2 text-[11px] font-medium text-warning">
                      <ScanEye className="size-3" />
                      Age check
                    </span>
                  ) : null}
                  <ActionButton
                    busy={market.busy === `buy:${listing.id}`}
                    className="h-9 px-3.5 text-[13px]"
                    disabled={!live || Boolean(market.busy)}
                    variant="ink"
                    onClick={() => market.buy(listing)}
                  >
                    Buy
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>

        {buyError ? (
          <div className="mt-4">
            <Notice tone="declined">{buyError}</Notice>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          description="Each order with the decision Didit returned for it."
          eyebrow="Your orders"
          title="Orders from this browser"
        />
        {orders.length ? (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <TransactionCard key={order.uuid} tx={order} />
            ))}
          </div>
        ) : (
          <Empty>
            No orders yet. Buy something under {formatEur(HIGH_VALUE_THRESHOLD)}
            , then something over it.
          </Empty>
        )}
      </Card>

      <div>
        <ActionButton
          variant="ink"
          onClick={() => market.setChapter("payouts")}
        >
          Next: the seller gets paid
          <ArrowRight className="size-4" />
        </ActionButton>
      </div>
    </div>
  );
}
