"use client";

import * as React from "react";
import { ArrowRight, Fingerprint, ScanEye } from "lucide-react";

import { useMarket } from "./market-context";
import { ShopForm } from "./shop-form";
import { TransactionCard } from "./transaction-card";
import { ActionButton, Card, CardHeader, Notice } from "./ui";

export function FraudChapter() {
  const market = useMarket();
  const sellers = market.view?.sellers ?? [];
  const first = sellers[0] ?? null;
  const others = sellers.slice(1);
  const transactions = market.view?.transactions ?? [];
  const shopError =
    market.error?.scope === "shop" ? market.error.message : null;

  const openOperator = (uuid: string) => {
    market.inspect(uuid);
    market.setChapter("operator");
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          description="A seller who was removed comes back the next day with a new shop and a new company. The name changes; the laptop does not. Open a second shop from this same browser and watch monitoring connect them."
          eyebrow="The fraud case"
          title="A second shop, same device"
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Fingerprint,
              title: "Same device id",
              body: "The web SDK sends this browser's persistent device id with every submission.",
            },
            {
              icon: ScanEye,
              title: "One rule",
              body: "Two shops signing up from one device in 30 days: the newer one is held for review.",
            },
            {
              icon: ArrowRight,
              title: "Operator decides",
              body: "The analyst sees the rule, the device and the linked shop, and decides.",
            },
          ].map((item) => (
            <div key={item.title} className="mkt-inset p-4">
              <item.icon className="mb-2.5 size-5 text-blue" />
              <p className="m-0 text-sm font-medium text-ink">{item.title}</p>
              <p className="m-0 mt-1 text-[13px] leading-[18px] text-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {!first?.signup ? (
          <Notice
            action={
              <button
                className="mkt-btn-ghost h-8 flex-none px-3 text-xs"
                type="button"
                onClick={() => market.setChapter("seller")}
              >
                Open the first shop
              </button>
            }
          >
            Open your first shop in chapter 1 first: the second one is caught
            because the first one already signed up from this device.
          </Notice>
        ) : others.length === 0 ? (
          <ShopForm
            busy={Boolean(market.busy?.startsWith("shop:"))}
            disabled={!market.view?.availability.transactions}
            idPrefix="second-shop"
            initial={{
              shop: "Kestrel Goods",
              company: "Kestrel Commerce",
              country: "GB",
            }}
            submitLabel="Open a second shop on this device"
            onSubmit={(form) => market.openShop(form)}
          />
        ) : null}

        {shopError ? (
          <div className="mt-4">
            <Notice tone="declined">{shopError}</Notice>
          </div>
        ) : null}
      </Card>

      {others.map((seller) => {
        const signup = transactions.find((tx) => tx.uuid === seller.signup);

        return (
          <Card key={seller.id}>
            <CardHeader
              description={`${seller.company} · opened from this browser after ${first?.shop ?? "your first shop"}`}
              eyebrow="Second shop"
              title={seller.shop}
            />
            {signup ? (
              <TransactionCard
                footer={
                  <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3.5">
                    <ActionButton
                      className="h-9 px-3.5 text-[13px]"
                      variant="ink"
                      onClick={() => openOperator(signup.uuid)}
                    >
                      Investigate in the operator view
                      <ArrowRight className="size-4" />
                    </ActionButton>
                  </div>
                }
                tx={signup}
              />
            ) : (
              <Notice
                action={
                  <ActionButton
                    busy={market.busy === `signup:${seller.id}`}
                    className="h-8 px-3 text-xs"
                    variant="ghost"
                    onClick={() => market.retrySignup(seller)}
                  >
                    Report it again
                  </ActionButton>
                }
                tone="declined"
              >
                {market.error?.scope === `signup:${seller.id}`
                  ? market.error.message
                  : "The sign-up for this shop did not reach monitoring."}
              </Notice>
            )}
          </Card>
        );
      })}
    </div>
  );
}
