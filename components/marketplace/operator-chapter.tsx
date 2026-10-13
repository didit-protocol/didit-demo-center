"use client";

import type { TransactionSummary } from "@/lib/marketplace/summaries";

import * as React from "react";
import {
  Check,
  Fingerprint,
  LoaderCircle,
  Network,
  ScrollText,
  ShieldAlert,
  X,
} from "lucide-react";

import { useMarket } from "./market-context";
import { TransactionCard, transactionTitle } from "./transaction-card";
import {
  ActionButton,
  Card,
  CardHeader,
  ConsoleLink,
  Empty,
  Notice,
  Rows,
  StatusPill,
} from "./ui";

import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/marketplace/catalog";
import {
  kybDecidable,
  kybStatus,
  transactionStatus,
} from "@/lib/marketplace/status";

/** The transaction an analyst would open first: the newest one on hold. */
export function defaultInspection(
  transactions: TransactionSummary[],
): string | null {
  const held = transactions.find(
    (tx) => tx.status === "IN_REVIEW" || tx.status === "AWAITING_USER",
  );

  return (held ?? transactions[0])?.uuid ?? null;
}

const humanize = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

function Queue() {
  const market = useMarket();
  const transactions = market.view?.transactions ?? [];

  return (
    <Card>
      <CardHeader
        description="Everything this browser sent to monitoring, newest first. Pick one to see what the analyst sees."
        eyebrow="Queue"
        title="Transactions"
      />
      {transactions.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {transactions.map((tx) => {
            const active = tx.uuid === market.inspecting;

            return (
              <li key={tx.uuid}>
                <button
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xs border px-3.5 py-2.5 text-left transition-colors duration-fast",
                    active
                      ? "border-blue bg-blue-soft"
                      : "border-line bg-canvas hover:bg-surface",
                  )}
                  type="button"
                  onClick={() => market.inspect(tx.uuid)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {transactionTitle(tx)}
                    </span>
                    <span className="block text-xs text-muted">
                      {tx.kind === "signup" ? "Sign-up" : formatEur(tx.amount)}{" "}
                      · score {tx.score}
                    </span>
                  </span>
                  <StatusPill meta={transactionStatus(tx.status)} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>
          Nothing in the queue yet. Open a shop, buy something or open a second
          shop first.
        </Empty>
      )}
    </Card>
  );
}

function KybQueue() {
  const market = useMarket();
  const pending = (market.view?.sellers ?? []).filter((seller) =>
    kybDecidable(seller.kyb?.status ?? null),
  );
  const decided = (market.view?.sellers ?? []).filter(
    (seller) => seller.kyb && !kybDecidable(seller.kyb.status),
  );

  if (!pending.length && !decided.length) return null;

  return (
    <Card>
      <CardHeader
        description="A KYB that lands In Review waits for an analyst. Deciding it here calls the real status endpoint, and payouts follow."
        eyebrow="Business reviews"
        title="KYB decisions"
      />
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {[...pending, ...decided].map((seller) => {
          const busy = market.busy === `decide:${seller.id}`;
          const error =
            market.error?.scope === `decide:${seller.id}`
              ? market.error.message
              : null;

          return (
            <li key={seller.id} className="mkt-inset p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-medium text-ink">
                    {seller.shop}
                  </p>
                  <p className="m-0 text-xs text-muted">{seller.company}</p>
                </div>
                <StatusPill meta={kybStatus(seller.kyb?.status ?? null)} />
              </div>
              {kybDecidable(seller.kyb?.status ?? null) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    busy={busy}
                    className="h-9 px-3.5 text-[13px]"
                    onClick={() => market.decideKyb(seller, "Approved")}
                  >
                    <Check className="size-4" />
                    Approve
                  </ActionButton>
                  <ActionButton
                    className="h-9 px-3.5 text-[13px]"
                    disabled={busy}
                    variant="ghost"
                    onClick={() => market.decideKyb(seller, "Declined")}
                  >
                    <X className="size-4" />
                    Decline
                  </ActionButton>
                  {seller.kybLink ? (
                    <ConsoleLink
                      label="Review in Console v2"
                      link={seller.kybLink}
                      recordId={seller.kyb?.sessionId}
                    />
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <div className="mt-3">
                  <Notice tone="declined">{error}</Notice>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Inspection() {
  const market = useMarket();
  const view = market.operator;

  if (market.operatorLoading && !view) {
    return (
      <Card>
        <p className="m-0 flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" />
          Reading the transaction from the API.
        </p>
      </Card>
    );
  }
  if (!view) return null;

  const tx = view.transaction;

  return (
    <Card>
      <CardHeader
        aside={
          <div className="flex flex-wrap gap-2">
            <ConsoleLink
              label="Open in Console v2"
              link={view.links.transaction}
              recordId={tx.uuid}
            />
          </div>
        }
        description={`Transaction ${tx.txnId}`}
        eyebrow="Analyst view"
        title={transactionTitle(tx)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <TransactionCard tx={tx} />
        </div>

        <div className="mkt-inset p-4">
          <p className="eyebrow eyebrow-muted mb-2 inline-flex items-center gap-1.5">
            <Fingerprint className="size-3.5" />
            Device and network
          </p>
          <Rows
            rows={[
              {
                label: "Device id",
                value: view.device.deviceId ?? "None sent",
              },
              {
                label: "Browser",
                value:
                  [view.device.browser, view.device.os]
                    .filter(Boolean)
                    .join(" on ") || "Not stated",
              },
              { label: "IP", value: view.device.ip ?? "Not stated" },
              {
                label: "Location",
                value: view.device.ipLocation ?? "Not stated",
              },
              { label: "ISP", value: view.device.isp ?? "Not stated" },
              {
                label: "Connection",
                value: view.device.isVpn
                  ? "VPN or Tor"
                  : view.device.isDataCenter
                    ? "Data centre"
                    : "Residential or mobile",
              },
            ]}
          />
        </div>

        <div className="mkt-inset p-4">
          <p className="eyebrow eyebrow-muted mb-2 inline-flex items-center gap-1.5">
            <ShieldAlert className="size-3.5" />
            Linked shops on this device
          </p>
          {view.sharedWith.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {view.sharedWith.map((shop) => (
                <li
                  key={shop.shop}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-ink">{shop.shop}</span>
                  <span className="text-muted">{shop.company}</span>
                </li>
              ))}
              <li className="text-xs text-muted">
                Same persistent device id on both sign-ups. Only shops this
                browser opened are named here.
              </li>
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">
              No other shop from this browser signed up on this device.
            </p>
          )}
        </div>

        <div className="mkt-inset p-4 xl:col-span-2">
          <p className="eyebrow eyebrow-muted mb-2 inline-flex items-center gap-1.5">
            <Network className="size-3.5" />
            Fraud networks
          </p>
          {view.networks?.length ? (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {view.networks.map((network, index) => (
                <li
                  key={network.id}
                  className="flex flex-wrap items-center gap-3 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-ink">
                      {network.number ?? "Network"}
                      {network.name ? ` · ${network.name}` : ""}
                    </span>
                    <span className="block text-xs text-muted">
                      {network.signalTypes.map(humanize).join(", ") ||
                        "Shared signals"}
                      {network.members !== null
                        ? ` · ${network.members} members`
                        : ""}
                      {network.riskBand
                        ? ` · ${network.riskBand.toLowerCase()} risk`
                        : ""}
                    </span>
                  </span>
                  {view.links.networks[index] ? (
                    <ConsoleLink
                      label="Open network"
                      link={view.links.networks[index]}
                      recordId={network.number ?? network.id}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">{view.networkNote}</p>
          )}
        </div>

        {view.notes.length ? (
          <div className="mkt-inset p-4 xl:col-span-2">
            <p className="eyebrow eyebrow-muted mb-2 inline-flex items-center gap-1.5">
              <ScrollText className="size-3.5" />
              Notes
            </p>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-4 text-sm text-ink">
              {view.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
        <span className="text-xs text-muted">Console v2:</span>
        <ConsoleLink label="Transactions" link={view.links.transactions} />
        {view.links.kyb ? (
          <ConsoleLink label="This shop's KYB" link={view.links.kyb} />
        ) : null}
      </div>
    </Card>
  );
}

export function OperatorChapter() {
  const market = useMarket();
  const transactions = market.view?.transactions;

  // Land on the newest held transaction, the one an analyst opens first.
  React.useEffect(() => {
    if (!market.inspecting && transactions?.length) {
      const first = defaultInspection(transactions);

      if (first) market.inspect(first);
    }
  }, [market.inspecting, transactions]);

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <Queue />
        <KybQueue />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {market.error?.scope === "operator" ? (
          <Notice tone="declined">{market.error.message}</Notice>
        ) : null}
        <Inspection />
      </div>
    </div>
  );
}
