"use client";

import type { TransactionSummary } from "@/lib/marketplace/summaries";

import * as React from "react";
import { ScanEye } from "lucide-react";

import { useMarket } from "./market-context";
import { ActionButton, StatusPill } from "./ui";

import { formatEur, getListing } from "@/lib/marketplace/catalog";
import { transactionStatus } from "@/lib/marketplace/status";

const KIND_LABEL: Record<TransactionSummary["kind"], string> = {
  signup: "Seller sign-up",
  purchase: "Order",
  payout: "Payout",
  other: "Transaction",
};

export function transactionTitle(tx: TransactionSummary): string {
  if (tx.kind === "purchase") {
    return getListing(tx.listing ?? "")?.title ?? tx.label ?? "Order";
  }

  return tx.label ?? KIND_LABEL[tx.kind];
}

/**
 * One monitored transaction, as Didit decided it: status, score, the rules
 * that fired and - when a rule asked for it - the customer's verification.
 */
export function TransactionCard({
  tx,
  compact,
  footer,
}: {
  tx: TransactionSummary;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  const market = useMarket();
  const meta = transactionStatus(tx.status);
  const waiting = market.busy === `order:${tx.uuid}`;

  return (
    <div className="mkt-inset p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow eyebrow-muted mb-1.5">{KIND_LABEL[tx.kind]}</p>
          <p className="m-0 text-sm font-medium text-ink">
            {transactionTitle(tx)}
          </p>
          <p className="m-0 mt-0.5 text-xs text-muted">
            {tx.kind === "signup" ? "No amount" : formatEur(tx.amount)} · score{" "}
            {tx.score}
            {tx.severity ? ` · ${tx.severity.toLowerCase()} severity` : ""}
          </p>
        </div>
        <StatusPill meta={meta} />
      </div>

      {compact ? null : (
        <p className="mb-0 mt-2.5 text-[13px] leading-[18px] text-muted">
          {tx.reason ?? meta.description}
        </p>
      )}

      {tx.rules.length ? (
        <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
          {tx.rules.map((rule) => (
            <li
              key={rule.title}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]"
            >
              <span className="font-medium text-ink">{rule.title}</span>
              <span className="text-muted">
                {rule.scoreDelta ? `+${rule.scoreDelta}` : ""}
                {rule.statusTarget
                  ? `${rule.scoreDelta ? " · " : ""}sets ${transactionStatus(rule.statusTarget).label.toLowerCase()}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {tx.tags.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tx.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-6 items-center rounded-2xs bg-ink/[0.06] px-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted"
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      ) : null}

      {tx.verification && tx.status === "AWAITING_USER" ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
          <p className="m-0 min-w-0 flex-1 text-[13px] text-muted">
            The order waits for a quick age check: a selfie, and an ID only if
            the estimate is close to the limit.
          </p>
          <ActionButton
            busy={waiting}
            className="h-9 px-3.5 text-[13px]"
            onClick={() => market.verifyOrder(tx)}
          >
            <ScanEye className="size-4" />
            {waiting ? "Waiting for the decision" : "Verify age to complete"}
          </ActionButton>
        </div>
      ) : null}

      {footer}
    </div>
  );
}
