"use client";

import type { Aurora } from "./use-aurora";
import type { ActivityItem } from "@/lib/igaming/ledger";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Gift,
  Hourglass,
  IdCard,
  ShieldCheck,
  Trophy,
  UserPlus,
} from "lucide-react";

import { Notice, SectionHead, Spinner, StatusPill } from "./ui";

import { Modal } from "@/components/demo-center/modal";
import {
  KYC_THRESHOLD,
  SELF_EXCLUSION_PAYOUT,
  WELCOME_BONUS,
  depositProgress,
  formatMoney,
  licensedMarket,
  limitHeadroom,
  sessionView,
  transactionView,
} from "@/lib/igaming/policy";
import { cn } from "@/lib/utils";

const DEPOSITS = [50, 250, 1000, 2000];
const WITHDRAWALS = [20, 50, 100];
const STAKES = [5, 10, 25, 50];
const LIMITS = [100, 250, 500];
const MARKET = {
  title: "Madrid v Barcelona",
  league: "Football · Full time result",
  selections: [
    { label: "Madrid", odds: 2.1 },
    { label: "Draw", odds: 3.4 },
    { label: "Barcelona", odds: 3.2 },
  ],
};

/** Shown while Didit scores a transaction; staging can take several seconds. */
const CHECKING = "Checking with Didit…";

const EXCLUDED_UNTIL = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 182).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/* ── Wallet and cashier ── */

function Balance({
  amount,
  children,
}: {
  amount: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="ig-label mb-2">Balance</p>
        <p className="tnum m-0 text-[32px] font-display leading-none tracking-display text-ink">
          {formatMoney(amount)}
        </p>
      </div>
      {children}
    </div>
  );
}

function Cashier({ aurora }: { aurora: Aurora }) {
  const state = aurora.state!;
  const { totals } = aurora;
  const [mode, setMode] = React.useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = React.useState(250);
  const progress = depositProgress(totals.depositedTotal);
  const headroom = limitHeadroom(state.depositLimit, totals.depositedToday);
  const verified = Boolean(state.kyc?.listed);
  const busy = aurora.busy === mode;
  const overLimit =
    mode === "deposit" && headroom !== null && amount > headroom;
  const overBalance = mode === "withdrawal" && amount > totals.balance;
  const verb = mode === "deposit" ? "Deposit" : "Withdraw";
  const Icon = mode === "deposit" ? ArrowDownLeft : ArrowUpRight;

  return (
    <>
      <Balance amount={totals.balance}>
        <div
          className="inline-flex rounded-pill border border-line bg-surface p-1"
          role="tablist"
        >
          {(["deposit", "withdrawal"] as const).map((value) => (
            <button
              key={value}
              aria-selected={mode === value}
              className={cn(
                "h-8 rounded-pill px-3 text-xs font-medium transition-colors duration-fast",
                mode === value ? "bg-canvas text-ink shadow-sm" : "text-muted",
              )}
              role="tab"
              type="button"
              onClick={() => {
                setMode(value);
                setAmount(value === "deposit" ? 250 : 20);
              }}
            >
              {value === "deposit" ? "Deposit" : "Withdraw"}
            </button>
          ))}
        </div>
      </Balance>

      <div className="flex flex-wrap gap-2">
        {(mode === "deposit" ? DEPOSITS : WITHDRAWALS).map((value) => (
          <button
            key={value}
            aria-pressed={amount === value}
            className="ig-chip tnum"
            type="button"
            onClick={() => setAmount(value)}
          >
            {formatMoney(value)}
          </button>
        ))}
        <label className="relative w-[120px]">
          <span className="sr-only">Other amount</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">
            €
          </span>
          <input
            className="ig-input tnum h-9 rounded-pill pl-7 text-[13px]"
            inputMode="decimal"
            min={1}
            type="number"
            value={amount}
            onChange={(event) =>
              setAmount(Math.max(0, Number(event.target.value) || 0))
            }
          />
        </label>
      </div>

      <button
        className="ig-btn ig-btn-primary h-11 w-full"
        disabled={busy || amount <= 0 || overLimit || overBalance}
        type="button"
        onClick={() =>
          void (mode === "deposit"
            ? aurora.deposit(amount)
            : aurora.withdraw(amount))
        }
      >
        {busy ? <Spinner /> : <Icon aria-hidden className="size-4" />}
        {busy ? CHECKING : `${verb} ${formatMoney(amount)}`}
      </button>
      {overLimit ? (
        <p className="m-0 text-xs text-danger">
          Over your daily limit: {formatMoney(headroom ?? 0)} left today.
        </p>
      ) : null}
      {overBalance ? (
        <p className="m-0 text-xs text-danger">
          You can withdraw up to {formatMoney(Math.max(0, totals.balance))}.
        </p>
      ) : null}

      <div className="rounded-xs bg-surface p-3.5">
        {verified ? (
          <p className="m-0 flex items-center gap-2 text-[13px] text-ink">
            <ShieldCheck aria-hidden className="size-4 text-success" />
            ID verified. Deposits are no longer held.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-ink">
                <span className="tnum font-semibold">
                  {formatMoney(progress.total)}
                </span>{" "}
                deposited
              </span>
              <span className="text-muted">
                ID check at {formatMoney(KYC_THRESHOLD)}
              </span>
            </div>
            <div
              aria-label="Deposits towards the ID check"
              aria-valuemax={KYC_THRESHOLD}
              aria-valuemin={0}
              aria-valuenow={Math.min(progress.total, KYC_THRESHOLD)}
              className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-elevated"
              role="progressbar"
            >
              <div
                className={cn(
                  "h-full rounded-pill transition-[width] duration-slow ease-out",
                  progress.crossed ? "bg-warning" : "bg-blue",
                )}
                style={{ width: `${progress.ratio * 100}%` }}
              />
            </div>
          </>
        )}
        {state.depositLimit !== null ? (
          <p className="mb-0 mt-2.5 text-xs text-muted">
            Daily limit {formatMoney(state.depositLimit)} ·{" "}
            {formatMoney(headroom ?? 0)} left today
          </p>
        ) : null}
      </div>
    </>
  );
}

/**
 * Self-excluded: deposits and bets are closed, and the balance was paid back
 * before Didit blocked the player. "Try a deposit anyway" shows Didit itself
 * refusing them.
 */
function ClosedCashier({ aurora }: { aurora: Aurora }) {
  const state = aurora.state!;
  const busy = aurora.busy === "deposit";
  const payout = state.activity.find(
    (item) =>
      item.kind === "withdrawal" && item.detail === SELF_EXCLUSION_PAYOUT,
  );
  const view = payout?.record
    ? transactionView("withdrawal", payout.record.status)
    : null;

  return (
    <>
      <Balance amount={aurora.totals.balance} />
      <Notice
        action={
          <button
            className="text-xs font-semibold underline underline-offset-2"
            disabled={busy}
            type="button"
            onClick={() => void aurora.deposit(10)}
          >
            {busy ? "Sending…" : "Try a deposit anyway"}
          </button>
        }
        tone="declined"
      >
        Self-excluded until {EXCLUDED_UNTIL()}. Deposits, bets and offers are
        closed.
      </Notice>
      {payout ? (
        <div className="flex items-start justify-between gap-3 rounded-xs bg-surface p-3.5">
          <div className="min-w-0">
            <p className="m-0 text-[13px] text-ink">
              <span className="tnum font-semibold">
                {formatMoney(payout.amount)}
              </span>{" "}
              paid back to your card
            </p>
            <p className="mb-0 mt-1 text-xs leading-5 text-muted">
              {view?.message ?? `Refused by Didit: ${payout.error}`}
            </p>
          </div>
          <StatusPill tone={view?.tone ?? "declined"}>
            {view?.label ?? "Refused"}
          </StatusPill>
        </div>
      ) : null}
    </>
  );
}

function Wallet({ aurora }: { aurora: Aurora }) {
  return (
    <section className="ig-card flex flex-col gap-4 p-5">
      {aurora.state!.selfExcluded ? (
        <ClosedCashier aurora={aurora} />
      ) : (
        <Cashier aurora={aurora} />
      )}
    </section>
  );
}

/* ── The held deposit ── */

function KycBanner({ aurora }: { aurora: Aurora }) {
  const kyc = aurora.state?.kyc;
  const held = aurora.state?.activity.find(
    (item) => item.record?.id === kyc?.transactionId,
  );

  if (
    !kyc ||
    kyc.listed ||
    aurora.state?.selfExcluded ||
    held?.record?.status !== "AWAITING_USER"
  )
    return null;
  const view = kyc.summary ? sessionView("kyc", kyc.summary.status) : null;
  const verifying = aurora.busy === "verify";

  return (
    <section className="flex flex-col gap-3 rounded-sm border border-blue/30 bg-blue-soft p-4 sm:flex-row sm:items-center">
      <IdCard aria-hidden className="size-6 flex-none text-blue-deep" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-ink">
          {formatMoney(held.amount)} deposit on hold: verify your ID
        </p>
        <p className="mb-0 mt-1 text-[13px] leading-5 text-muted">
          {view && view.tone !== "neutral"
            ? view.message
            : `Your deposits reached ${formatMoney(KYC_THRESHOLD)}. Didit asks for a photo of your ID and a selfie before the money is credited.`}
        </p>
      </div>
      <div className="flex flex-none gap-2">
        <button
          className="ig-btn ig-btn-primary"
          disabled={verifying || !aurora.sdkReady}
          type="button"
          onClick={aurora.startKyc}
        >
          Verify now
        </button>
        <button
          className="ig-btn ig-btn-quiet"
          disabled={verifying}
          type="button"
          onClick={() => void aurora.checkKyc()}
        >
          {verifying ? <Spinner /> : null}
          Check status
        </button>
      </div>
    </section>
  );
}

/* ── Sportsbook ── */

function BetSlip({ aurora }: { aurora: Aurora }) {
  const [pick, setPick] = React.useState(0);
  const [stake, setStake] = React.useState(10);
  const selection = MARKET.selections[pick];
  const busy = aurora.busy === "bet";
  const short = stake > aurora.totals.balance;
  const blocked = Boolean(aurora.state?.selfExcluded);
  let label = `Bet ${formatMoney(stake)} · returns ${formatMoney(stake * selection.odds)}`;

  if (short) label = "Deposit to place a bet";
  if (blocked) label = "Closed while you are self-excluded";
  if (busy) label = CHECKING;

  return (
    <section className="ig-card flex flex-col gap-4 p-5">
      <SectionHead
        action={<Trophy aria-hidden className="size-5 text-muted" />}
        label={MARKET.league}
        title={MARKET.title}
      />
      <div className="grid grid-cols-3 gap-2">
        {MARKET.selections.map((option, index) => (
          <button
            key={option.label}
            aria-pressed={pick === index}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xs border px-2 py-2.5 transition-colors duration-fast focus-visible:shadow-ring focus-visible:outline-none",
              pick === index
                ? "border-blue bg-blue-soft"
                : "border-line bg-canvas hover:bg-surface",
            )}
            type="button"
            onClick={() => setPick(index)}
          >
            <span className="text-xs text-muted">{option.label}</span>
            <span className="tnum text-[15px] font-semibold text-ink">
              {option.odds.toFixed(2)}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {STAKES.map((value) => (
          <button
            key={value}
            aria-pressed={stake === value}
            className="ig-chip tnum"
            type="button"
            onClick={() => setStake(value)}
          >
            {formatMoney(value)}
          </button>
        ))}
      </div>
      <button
        className="ig-btn ig-btn-dark h-11 w-full"
        disabled={busy || short || blocked}
        type="button"
        onClick={() =>
          void aurora.bet(
            stake,
            `${MARKET.title}: ${selection.label} @ ${selection.odds.toFixed(2)}`,
          )
        }
      >
        {busy ? <Spinner /> : null}
        {label}
      </button>
    </section>
  );
}

/* ── Welcome bonus ── */

function BonusCard({ aurora }: { aurora: Aurora }) {
  const state = aurora.state!;
  const claim = state.activity.find((item) => item.kind === "bonus_claim");
  const busy = aurora.busy === "bonus_claim";
  const view = claim?.record
    ? transactionView("bonus_claim", claim.record.status)
    : null;

  return (
    <section className="ig-card flex flex-col gap-4 p-5">
      <SectionHead
        action={<Gift aria-hidden className="size-5 text-muted" />}
        label="Welcome offer"
        title={`${formatMoney(WELCOME_BONUS)} free bet`}
      />
      {state.secondAccount ? (
        <Notice tone="info">
          This is the second account on this device. Claim the bonus and watch
          the operator view.
        </Notice>
      ) : null}
      {claim ? (
        <div className="flex flex-col gap-2">
          {view ? (
            <StatusPill className="self-start" tone={view.tone}>
              {view.label}
            </StatusPill>
          ) : (
            <StatusPill className="self-start" tone="declined">
              Refused
            </StatusPill>
          )}
          <p className="m-0 text-[13px] leading-5 text-muted">
            {view?.message ?? claim.error}
          </p>
        </div>
      ) : (
        <button
          className="ig-btn ig-btn-primary w-full"
          disabled={busy || state.selfExcluded}
          type="button"
          onClick={() => void aurora.claimBonus()}
        >
          {busy ? <Spinner /> : null}
          {busy ? CHECKING : "Claim free bet"}
        </button>
      )}
      {claim && !state.secondAccount && !state.selfExcluded ? (
        <div className="border-t border-line pt-4">
          <p className="m-0 text-[13px] leading-5 text-muted">
            Try the abuse case: open a second account on this browser and claim
            the bonus again.
          </p>
          <button
            className="ig-btn ig-btn-quiet mt-3 w-full text-[13px]"
            type="button"
            onClick={aurora.openSecondAccount}
          >
            <UserPlus aria-hidden className="size-4" />
            Second account on this device
          </button>
        </div>
      ) : null}
    </section>
  );
}

/* ── Safer gambling ── */

function SaferGambling({
  aurora,
  onExclude,
}: {
  aurora: Aurora;
  onExclude: () => void;
}) {
  const state = aurora.state!;
  const [limit, setLimit] = React.useState(state.depositLimit ?? 250);
  const [now, setNow] = React.useState(() => Date.now());
  const busy = aurora.busy === "deposit_limit";
  const staked = state.activity
    .filter((item) => item.kind === "bet" && item.record)
    .reduce((sum, item) => sum + item.amount, 0);
  const minutes = Math.max(1, Math.round((now - state.createdAt) / 60000));

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="ig-card flex flex-col gap-4 p-5">
      <SectionHead
        action={<Hourglass aria-hidden className="size-5 text-muted" />}
        label="Safer gambling"
        title="Stay in control"
      />
      <p className="m-0 rounded-xs bg-surface px-3.5 py-3 text-[13px] leading-5 text-ink">
        Reality check: playing for {minutes} min · {aurora.totals.bets} bets ·{" "}
        {formatMoney(staked)} staked.
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-ink">
          Daily deposit limit
          {state.depositLimit !== null
            ? `: ${formatMoney(state.depositLimit)}`
            : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          {LIMITS.map((value) => (
            <button
              key={value}
              aria-pressed={limit === value}
              className="ig-chip tnum"
              type="button"
              onClick={() => setLimit(value)}
            >
              {formatMoney(value)}
            </button>
          ))}
          <button
            className="ig-btn ig-btn-quiet h-9"
            disabled={
              busy || state.selfExcluded || state.depositLimit === limit
            }
            type="button"
            onClick={() => void aurora.setLimit(limit)}
          >
            {busy ? <Spinner /> : null}
            {state.depositLimit === null ? "Set limit" : "Change limit"}
          </button>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        {state.selfExcluded ? (
          <p className="m-0 flex items-start gap-2 text-[13px] leading-5 text-ink">
            <Ban aria-hidden className="mt-0.5 size-4 flex-none text-danger" />
            You are self-excluded. If gambling is causing you harm, free and
            confidential support is available 24/7 from your national helpline.
          </p>
        ) : (
          <>
            <p className="m-0 text-[13px] leading-5 text-muted">
              Need a longer break? Self-exclusion pays your balance back and
              closes your account for 6 months. Didit then refuses every
              transaction on it.
            </p>
            <button
              className="ig-btn ig-btn-danger mt-3"
              type="button"
              onClick={onExclude}
            >
              <Ban aria-hidden className="size-4" />
              Self-exclude for 6 months
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ── Activity ── */

const KIND_TITLE: Record<ActivityItem["kind"], string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  bet: "Bet",
  bonus_claim: "Welcome bonus",
  deposit_limit: "Deposit limit",
};

function signedAmount(item: ActivityItem): string {
  const amount = formatMoney(item.amount);

  if (!item.record || item.kind === "deposit_limit") return amount;

  return item.kind === "withdrawal" || item.kind === "bet"
    ? `-${amount}`
    : `+${amount}`;
}

function ActivityList({ aurora }: { aurora: Aurora }) {
  const activity = aurora.state?.activity ?? [];
  const excluded = Boolean(aurora.state?.selfExcluded);

  return (
    <section className="ig-card p-5">
      <SectionHead label="Your account" title="Activity" />
      {activity.length === 0 ? (
        <p className="mb-0 mt-3 text-[13px] text-muted">
          Deposits, bets and withdrawals appear here with the decision Didit
          returned.
        </p>
      ) : (
        <ul className="m-0 mt-3 list-none p-0">
          {activity.map((item) => {
            const view = item.record
              ? transactionView(item.kind, item.record.status, excluded)
              : null;
            const detail =
              item.kind === "bet" || item.kind === "withdrawal"
                ? item.detail
                : null;

            return (
              <li
                key={item.key}
                className="flex items-start gap-3 border-t border-line py-3 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-medium text-ink">
                    {KIND_TITLE[item.kind]}
                    {detail ? (
                      <span className="font-normal text-muted">
                        {" "}
                        · {detail}
                      </span>
                    ) : null}
                  </p>
                  <p className="mb-0 mt-0.5 text-xs leading-5 text-muted">
                    {view?.message ?? `Refused by Didit: ${item.error}`}
                  </p>
                </div>
                <div className="flex flex-none flex-col items-end gap-1.5">
                  <span className="tnum text-sm font-semibold text-ink">
                    {signedAmount(item)}
                  </span>
                  {view ? (
                    <StatusPill tone={view.tone}>{view.label}</StatusPill>
                  ) : (
                    <StatusPill tone="declined">Refused</StatusPill>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ── The screen ── */

export function PlayerHome({ aurora }: { aurora: Aurora }) {
  const state = aurora.state!;
  const [confirmExclude, setConfirmExclude] = React.useState(false);
  const summary = state.age?.summary;
  const market = licensedMarket(summary?.ip?.countryCode);
  const held = state.activity.find(
    (item) => item.record?.id === state.kyc?.transactionId,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 mr-2 text-xl font-display tracking-display text-ink">
          Hi, {state.name.split(" ")[0]}
        </h2>
        <StatusPill tone="approved">
          18+{summary?.estimatedAge ? ` · est. ${summary.estimatedAge}` : ""}
        </StatusPill>
        {summary?.ip ? (
          <StatusPill tone={market ? "approved" : "review"}>
            {summary.ip.country ?? "Unknown"} ·{" "}
            {market ? "licensed" : "not licensed"}
          </StatusPill>
        ) : null}
        {state.kyc?.listed ? (
          <StatusPill tone="approved">ID verified</StatusPill>
        ) : null}
        {state.selfExcluded ? (
          <StatusPill tone="declined">Self-excluded</StatusPill>
        ) : null}
      </div>

      {aurora.notice ? (
        <Notice tone={aurora.notice.tone === "error" ? "declined" : "info"}>
          {aurora.notice.text}
        </Notice>
      ) : null}

      <KycBanner aurora={aurora} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Wallet aurora={aurora} />
          <BetSlip aurora={aurora} />
        </div>
        <div className="flex flex-col gap-4">
          <BonusCard aurora={aurora} />
          <SaferGambling
            aurora={aurora}
            onExclude={() => setConfirmExclude(true)}
          />
        </div>
      </div>

      <ActivityList aurora={aurora} />

      <Modal
        label="Verify your identity"
        open={aurora.kycPrompt && Boolean(held) && !state.selfExcluded}
        width="max-w-[480px]"
        onClose={() => aurora.setKycPrompt(false)}
      >
        <div className="flex flex-col gap-4 p-6">
          <span className="flex size-11 items-center justify-center rounded-sm bg-blue-soft text-blue-deep">
            <IdCard aria-hidden className="size-6" />
          </span>
          <div>
            <h2 className="m-0 text-xl font-display tracking-display text-ink">
              Verify your identity
            </h2>
            <p className="mb-0 mt-2 text-sm leading-6 text-muted">
              Your deposits have reached {formatMoney(KYC_THRESHOLD)}. Before{" "}
              {held ? formatMoney(held.amount) : "this deposit"} is credited we
              need a photo of your ID and a quick selfie. It takes about a
              minute.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2.5">
            <button
              className="ig-btn ig-btn-quiet"
              type="button"
              onClick={() => aurora.setKycPrompt(false)}
            >
              Later
            </button>
            <button
              className="ig-btn ig-btn-primary"
              disabled={!aurora.sdkReady}
              type="button"
              onClick={aurora.startKyc}
            >
              <IdCard aria-hidden className="size-4" />
              Verify now
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        label="Self-exclude"
        open={confirmExclude}
        width="max-w-[480px]"
        onClose={() => setConfirmExclude(false)}
      >
        <div className="flex flex-col gap-4 p-6">
          <span className="flex size-11 items-center justify-center rounded-sm bg-danger-bg text-danger">
            <Ban aria-hidden className="size-6" />
          </span>
          <div>
            <h2 className="m-0 text-xl font-display tracking-display text-ink">
              Self-exclude until {EXCLUDED_UNTIL()}?
            </h2>
            <p className="mb-0 mt-2 text-sm leading-6 text-muted">
              You won&apos;t be able to deposit, bet or claim offers until then,
              and this can&apos;t be undone early.{" "}
              {aurora.totals.balance > 0
                ? `Your ${formatMoney(aurora.totals.balance)} balance is paid back to your card first. `
                : ""}
              Aurora Play then blocks you on Didit, so Didit refuses every
              transaction on this account.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2.5">
            <button
              className="ig-btn ig-btn-quiet"
              type="button"
              onClick={() => setConfirmExclude(false)}
            >
              Cancel
            </button>
            <button
              className="ig-btn ig-btn-danger"
              disabled={aurora.busy === "exclude" || !aurora.sdkReady}
              type="button"
              onClick={async () => {
                await aurora.selfExclude();
                setConfirmExclude(false);
              }}
            >
              {aurora.busy === "exclude" ? <Spinner /> : null}
              Self-exclude
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
