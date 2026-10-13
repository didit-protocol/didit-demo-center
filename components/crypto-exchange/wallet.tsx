"use client";

import type { ActivityItem, Kestrel, KestrelAccount } from "./use-kestrel";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import { OperatorLink } from "./onboarding";
import { Notice, StatusChip, formatEth, formatTime } from "./ui";

import {
  depositOutcome,
  shortAddress,
  withdrawalStage,
  type Tone,
  type WithdrawalStage,
} from "@/lib/crypto-exchange/transactions";
import { cn } from "@/lib/utils";

const DEPOSIT_CHIP = {
  credited: { tone: "approved", label: "Credited" },
  frozen: { tone: "declined", label: "Frozen" },
  review: { tone: "review", label: "In review" },
  pending: { tone: "neutral", label: "Pending" },
} as const;

export const WITHDRAWAL_CHIP: Record<
  WithdrawalStage,
  { tone: Tone; label: string }
> = {
  blocked: { tone: "declined", label: "Blocked" },
  review: { tone: "review", label: "In review" },
  "prove-ownership": { tone: "review", label: "Action needed" },
  "step-up": { tone: "review", label: "Action needed" },
  "step-up-unavailable": { tone: "review", label: "On hold" },
  "awaiting-counterparty": { tone: "review", label: "Travel Rule" },
  "travel-rule-stuck": { tone: "review", label: "Travel Rule" },
  ready: { tone: "approved", label: "Approved" },
};

export function activityChip(item: ActivityItem): {
  tone: Tone;
  label: string;
} {
  return item.kind === "deposit"
    ? DEPOSIT_CHIP[depositOutcome(item.view)]
    : WITHDRAWAL_CHIP[withdrawalStage(item.view)];
}

function ActivityRow({
  item,
  onOpen,
}: {
  item: ActivityItem;
  onOpen: () => void;
}) {
  const chip = activityChip(item);
  const incoming = item.kind === "deposit";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;

  return (
    <li>
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-fast hover:bg-surface sm:gap-4"
        type="button"
        onClick={onOpen}
      >
        <span
          className={cn(
            "flex size-9 flex-none items-center justify-center rounded-pill",
            incoming ? "bg-success-bg text-success" : "bg-elevated text-ink",
          )}
        >
          <Icon className="size-[18px]" />
        </span>
        {/* Wraps instead of truncating: on a phone the chip column leaves
            too little room for the destination and the time on one line. */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-ink">
            {incoming ? "Deposit" : "Withdrawal"}{" "}
            <span className="font-normal text-muted">
              {item.label.toLowerCase()}
            </span>
          </span>
          <span className="flex flex-wrap gap-x-1 text-xs text-muted">
            <span>
              {item.view.wallet ? shortAddress(item.view.wallet) : "-"} ·
            </span>
            <span className="whitespace-nowrap">
              {formatTime(item.createdAt)}
            </span>
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          <span className="tnum text-sm font-medium text-ink">
            {formatEth(incoming ? item.view.amount : `-${item.view.amount}`, {
              sign: true,
            })}
          </span>
          <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
        </span>
        <ChevronRight className="hidden size-4 flex-none text-muted sm:block" />
      </button>
    </li>
  );
}

export function WalletHome({
  kestrel,
  account,
  onDeposit,
  onWithdraw,
  onOpen,
}: {
  kestrel: Kestrel;
  account: KestrelAccount;
  onDeposit: () => void;
  onWithdraw: () => void;
  onOpen: (item: ActivityItem) => void;
}) {
  const { balances } = kestrel;
  const firstName = account.fullName?.split(" ")[0] ?? "there";
  const frozenDeposit = kestrel.activity.find(
    (item) => item.kind === "deposit" && item.view.status === "DECLINED",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="m-0 text-[22px] font-display tracking-display text-ink">
          Welcome, {firstName}
        </h2>
        <StatusChip tone="approved">
          <ShieldCheck className="-ml-0.5 size-3.5" />
          Verified
        </StatusChip>
      </div>

      <section
        aria-label="Balance"
        className="flex flex-col gap-5 rounded-md border border-line bg-surface p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"
      >
        <div className="flex flex-col gap-2">
          <p className="eyebrow eyebrow-muted">Ether balance</p>
          <p
            className="m-0 tnum text-[38px] font-display leading-none tracking-display text-ink sm:text-[44px]"
            data-testid="kestrel-balance"
          >
            {formatEth(balances.total)}
          </p>
          <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            <span>
              Available{" "}
              <span className="tnum text-ink">
                {formatEth(balances.available)}
              </span>
            </span>
            {balances.held > 0 && (
              <span>
                On hold{" "}
                <span className="tnum text-ink">
                  {formatEth(balances.held)}
                </span>
              </span>
            )}
            {balances.inReview > 0 && (
              <span>
                Deposits in review{" "}
                <span className="tnum text-ink">
                  {formatEth(balances.inReview)}
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            className="btn-base h-11 flex-1 bg-blue px-5 text-white hover:bg-blue-deep sm:flex-none"
            type="button"
            onClick={onDeposit}
          >
            <ArrowDownLeft className="size-4" />
            Deposit
          </button>
          <button
            className="btn-base h-11 flex-1 bg-ink px-5 text-canvas hover:bg-accent-black disabled:opacity-50 sm:flex-none"
            disabled={balances.available <= 0}
            title={
              balances.available <= 0
                ? "Deposit first: there is nothing to withdraw"
                : undefined
            }
            type="button"
            onClick={onWithdraw}
          >
            <ArrowUpRight className="size-4" />
            Withdraw
          </button>
        </div>
      </section>

      {frozenDeposit && (
        <Notice tone="declined">
          {formatEth(balances.frozen)} frozen: a deposit came from a wallet
          linked to sanctioned activity, so Kestrel did not credit it.{" "}
          <button
            className="font-medium underline underline-offset-2"
            type="button"
            onClick={() => onOpen(frozenDeposit)}
          >
            See why
          </button>
        </Notice>
      )}

      <section
        aria-label="Activity"
        className="overflow-hidden rounded-md border border-line"
      >
        <p className="eyebrow eyebrow-muted border-b border-line px-4 py-3">
          Activity
        </p>
        {kestrel.activity.length === 0 ? (
          <p className="m-0 px-4 py-8 text-center text-sm text-muted">
            No activity yet. Make a deposit to get started.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {kestrel.activity.map((item) => (
              <ActivityRow
                key={item.id}
                item={item}
                onOpen={() => onOpen(item)}
              />
            ))}
          </ul>
        )}
      </section>

      <OperatorLink account={account} />
    </div>
  );
}
