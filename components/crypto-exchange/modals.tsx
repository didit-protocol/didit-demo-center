"use client";

import type {
  ActivityItem,
  Asset,
  AssetBalance,
  CxWallets,
  DepositSource,
  WithdrawalDestination,
} from "@/lib/crypto-exchange/transactions";

import * as React from "react";
import { Check, CircleSlash, X } from "lucide-react";

import { DiditRing } from "@/components/didit-live/icons";
import {
  eurValue,
  formatAmount,
  formatEur,
} from "@/lib/crypto-exchange/markets";
import {
  ASSETS,
  SANCTIONED_WALLET,
  isAddressFor,
  parseAmount,
  shortAddress,
  travelRuleLabel,
  withdrawalStage,
} from "@/lib/crypto-exchange/transactions";

function Layer({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose(): void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ks-layer">
      <div aria-hidden className="ks-scrim" onMouseDown={onClose} />
      <div
        aria-label={label}
        aria-modal="true"
        className="ks-modal"
        role="dialog"
      >
        <button
          aria-label="Close"
          className="ks-modal-x"
          type="button"
          onClick={onClose}
        >
          <X aria-hidden size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange(value: T): void;
}) {
  return (
    <div aria-label={label} className="ks-chips" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          aria-checked={option.value === value}
          className="ks-chip"
          disabled={option.disabled}
          role="radio"
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AmountField({
  asset,
  amount,
  onAmount,
}: {
  asset: Asset;
  amount: string;
  onAmount(value: string): void;
}) {
  const value = Number(amount.replace(",", ".")) || 0;

  return (
    <label className="ks-field">
      Amount
      <span className="ks-input is-mono">
        <input
          aria-label="Amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(event) => onAmount(event.target.value)}
        />
        <span className="unit">≈ {formatEur(eurValue(asset, value), 0)}</span>
      </span>
    </label>
  );
}

function NetworkField({
  asset,
  onAsset,
}: {
  asset: Asset;
  onAsset(asset: Asset): void;
}) {
  return (
    <label className="ks-field">
      Network
      <span className="ks-input">
        <select
          aria-label="Network"
          value={asset}
          onChange={(event) => onAsset(event.target.value as Asset)}
        >
          {(Object.keys(ASSETS) as Asset[]).map((item) => (
            <option key={item} value={item}>
              {ASSETS[item].network}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

/* ── Deposit ─────────────────────────────────────────────────────────── */

export function DepositModal({
  initialAsset = "BTC",
  wallets,
  busy,
  error,
  onDeposit,
  onClose,
}: {
  initialAsset?: Asset;
  wallets: CxWallets;
  busy: boolean;
  error: string | null;
  onDeposit(input: {
    asset: Asset;
    amount: string;
    source: DepositSource;
  }): void;
  onClose(): void;
}) {
  const [asset, setAsset] = React.useState<Asset>(initialAsset);
  const [amount, setAmount] = React.useState(
    initialAsset === "BTC" ? "0.25" : "1.5",
  );
  const [source, setSource] = React.useState<DepositSource>("own-wallet");
  const [problem, setProblem] = React.useState<string | null>(null);
  const from = source === "own-wallet" ? wallets[asset] : SANCTIONED_WALLET;

  return (
    <Layer label={`Deposit ${asset}`} onClose={onClose}>
      <h2>Deposit {asset}</h2>
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseAmount(amount);

          if (!parsed) return setProblem("Enter an amount between 0.01 and 5.");
          setProblem(null);
          onDeposit({ asset, amount: parsed, source });
        }}
      >
        <div className="ks-grid2">
          <AmountField amount={amount} asset={asset} onAmount={setAmount} />
          <NetworkField
            asset={asset}
            onAsset={(next) => {
              setAsset(next);
              if (next !== "ETH") setSource("own-wallet");
            }}
          />
        </div>
        <div className="ks-field">
          From
          <Chips<DepositSource>
            label="Sending wallet"
            options={[
              { value: "own-wallet", label: "Your wallet" },
              {
                value: "unknown-sender",
                label: "A wallet you do not know",
                disabled: asset !== "ETH",
              },
            ]}
            value={source}
            onChange={setSource}
          />
        </div>
        <span className="ks-input is-mono">
          <input readOnly aria-label="Sending wallet address" value={from} />
        </span>
        <p className="ks-fine">
          Kestrel credits a deposit once Didit has screened the wallet it came
          from. There is no chain behind this demo: the button plays the
          transfer arriving.
        </p>
        {problem || error ? (
          <p className="ks-err" role="alert">
            {problem ?? error}
          </p>
        ) : null}
        <button className="ks-btn is-teal" disabled={busy} type="submit">
          {busy ? "Screening the wallet…" : `Deposit ${amount || "0"} ${asset}`}
        </button>
        <span className="ks-secured">
          <DiditRing />
          Deposits screened by <b>Didit</b>
        </span>
      </form>
    </Layer>
  );
}

/* ── Withdraw ────────────────────────────────────────────────────────── */

export interface WithdrawPreset {
  asset: Asset;
  amount: string;
  destination: WithdrawalDestination;
  address: string;
}

function Step({
  n,
  state,
  title,
  detail,
  aside,
  callout,
}: {
  n: number;
  state: "done" | "on" | "todo";
  title: string;
  detail: string;
  aside?: React.ReactNode;
  callout?: string;
}) {
  return (
    <div
      className={`ks-step${state === "on" ? " is-on" : ""}`}
      data-callout={callout}
    >
      <span
        className={`n${state === "done" ? " is-ok" : state === "on" ? " is-on" : ""}`}
      >
        {state === "done" ? <Check aria-hidden size={14} /> : n}
      </span>
      <span className="x">
        <b>{title}</b>
        <span>{detail}</span>
      </span>
      {aside}
    </div>
  );
}

export function WithdrawModal({
  preset,
  wallets,
  balances,
  result,
  busy,
  error,
  onWithdraw,
  onAction,
  onAnother,
  onSupport,
  onClose,
}: {
  preset: WithdrawPreset;
  wallets: CxWallets;
  balances: Record<Asset, AssetBalance>;
  /** The submitted withdrawal, shown in place of the form. */
  result: ActivityItem | null;
  busy: boolean;
  error: string | null;
  onWithdraw(input: WithdrawPreset): void;
  onAction(item: ActivityItem): void;
  onAnother(): void;
  onSupport(): void;
  onClose(): void;
}) {
  const [asset, setAsset] = React.useState<Asset>(preset.asset);
  const [amount, setAmount] = React.useState(preset.amount);
  const [destination, setDestination] = React.useState(preset.destination);
  const [address, setAddress] = React.useState(preset.address);
  const [problem, setProblem] = React.useState<string | null>(null);
  const shownAsset = result?.asset ?? asset;
  const to =
    result?.wallet ?? (destination === "own-wallet" ? wallets[asset] : address);
  const available = balances[asset].available;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseAmount(amount);

    if (!parsed) return setProblem("Enter an amount between 0.01 and 5.");
    if (Number(parsed) > available)
      return setProblem(
        available > 0
          ? `You have ${formatAmount(available)} ${asset} available.`
          : `You have no ${asset} to withdraw yet. Deposit some first.`,
      );
    if (!isAddressFor(asset, to))
      return setProblem(`That is not a ${ASSETS[asset].network} address.`);
    setProblem(null);
    onWithdraw({ asset, amount: parsed, destination, address: to });
  };

  return (
    <Layer label={`Withdraw ${shownAsset}`} onClose={onClose}>
      <h2>Withdraw {shownAsset}</h2>
      <form className="flex flex-col gap-3.5" onSubmit={submit}>
        <div className="ks-grid2">
          {result ? (
            <label className="ks-field">
              Amount
              <span className="ks-input is-mono">
                <input
                  readOnly
                  aria-label="Amount"
                  value={formatAmount(Number(result.view.amount) || 0, 8)}
                />
                <span className="unit">
                  ≈{" "}
                  {formatEur(
                    eurValue(result.asset, Number(result.view.amount) || 0),
                    0,
                  )}
                </span>
              </span>
            </label>
          ) : (
            <AmountField amount={amount} asset={asset} onAmount={setAmount} />
          )}
          {result ? (
            <label className="ks-field">
              Network
              <span className="ks-input">
                <input
                  readOnly
                  aria-label="Network"
                  value={ASSETS[result.asset].network}
                />
              </span>
            </label>
          ) : (
            <NetworkField
              asset={asset}
              onAsset={(next) => {
                setAsset(next);
                if (destination === "address") setAddress("");
              }}
            />
          )}
        </div>
        {!result ? (
          <div className="ks-field">
            To
            <Chips<WithdrawalDestination>
              label="Destination"
              options={[
                { value: "own-wallet", label: "Your wallet" },
                { value: "address", label: "Another address" },
              ]}
              value={destination}
              onChange={setDestination}
            />
          </div>
        ) : null}
        <label className="ks-field">
          To address
          <span className="ks-input is-mono">
            <input
              aria-label="To address"
              placeholder={asset === "BTC" ? "bc1q…" : "0x…"}
              readOnly={Boolean(result) || destination === "own-wallet"}
              value={result ? shortAddress(to) : to}
              onChange={(event) => setAddress(event.target.value.trim())}
            />
          </span>
        </label>
        {result ? (
          <WithdrawalOutcome
            busy={busy}
            item={result}
            onAction={onAction}
            onAnother={onAnother}
            onSupport={onSupport}
          />
        ) : (
          <>
            <div className="ks-sum">
              <span>
                Available{" "}
                <b className="ks-mono">
                  {formatAmount(available)} {asset}
                </b>
              </span>
              {destination === "address" && address === SANCTIONED_WALLET ? (
                <span>A demo address linked to a sanctioned service</span>
              ) : null}
            </div>
            {problem || error ? (
              <p className="ks-err" role="alert">
                {problem ?? error}
              </p>
            ) : null}
            <button className="ks-btn is-teal" disabled={busy} type="submit">
              {busy ? "Checking with Didit…" : "Withdraw"}
            </button>
          </>
        )}
        {result && withdrawalStage(result.view) === "blocked" ? null : (
          <span className="ks-secured">
            <DiditRing />
            {result ? "Step-up secured by" : "Withdrawals checked by"}{" "}
            <b>Didit</b>
          </span>
        )}
      </form>
    </Layer>
  );
}

function WithdrawalOutcome({
  item,
  busy,
  onAction,
  onAnother,
  onSupport,
}: {
  item: ActivityItem;
  busy: boolean;
  onAction(item: ActivityItem): void;
  onAnother(): void;
  onSupport(): void;
}) {
  const view = item.view;
  const stage = withdrawalStage(view);
  const amount = `${Number(view.amount) || 0} ${item.asset}`;
  const selfHosted = view.walletType === "unhosted_wallet";
  const travel = (
    <Step
      aside={<span className="ks-pill is-tr">Travel Rule</span>}
      callout="travel-rule"
      detail={
        selfHosted
          ? "The Travel Rule asks you to prove it is yours"
          : `The Travel Rule: ${view.travelRule ? travelRuleLabel(view.travelRule.status).toLowerCase() : "not required"}`
      }
      n={1}
      state="done"
      title={selfHosted ? "A self-hosted wallet" : "Travel Rule data sent"}
    />
  );
  const proof = (state: "done" | "on") => (
    <Step
      aside={
        state === "done" ? (
          <span className="ks-pill is-ok">Proven</span>
        ) : (
          <button
            className="ks-btn is-teal is-sm"
            disabled={busy}
            type="button"
            onClick={() => onAction(item)}
          >
            Sign the message
          </button>
        )
      }
      detail={
        state === "done"
          ? `${shortAddress(view.wallet ?? item.wallet)} · signed with your wallet app`
          : "Sign a message with your wallet app. Nothing leaves your wallet."
      }
      n={2}
      state={state}
      title={
        state === "done"
          ? "Wallet proven by a signed message"
          : "Prove the wallet is yours"
      }
    />
  );
  const selfie = (state: "done" | "on" | "todo") => (
    <Step
      aside={
        state === "on" ? (
          <button
            className="ks-btn is-teal"
            disabled={busy}
            type="button"
            onClick={() => onAction(item)}
          >
            Take a selfie
          </button>
        ) : state === "done" ? (
          <span className="ks-pill is-ok">Matched</span>
        ) : undefined
      }
      detail="Matched to the face you verified with. Takes a few seconds."
      n={3}
      state={state}
      title="Confirm it is you with a selfie"
    />
  );

  switch (stage) {
    case "blocked":
      return (
        <div
          className="ks-stop"
          data-callout="declined"
          data-testid="kestrel-declined"
        >
          <span className="h">
            <span className="ks-pill is-no">
              <CircleSlash aria-hidden size={14} />
              Declined
            </span>
            <b>We can’t send to this address</b>
          </span>
          <p>
            {view.screening?.walletSanctioned || view.screening?.sanctionsHit
              ? "This wallet is linked to a sanctioned service."
              : "This wallet's risk is too high for Kestrel."}{" "}
            Your {amount} stays in your Kestrel account, and nothing was sent.
          </p>
          <span className="acts">
            <button className="ks-btn" type="button" onClick={onAnother}>
              Use another address
            </button>
            <button className="ks-btn" type="button" onClick={onSupport}>
              Contact support
            </button>
          </span>
        </div>
      );
    case "review":
      return (
        <div className="ks-step is-on">
          <span className="n">!</span>
          <span className="x">
            <b>Your withdrawal is in review</b>
            <span>
              Kestrel&apos;s compliance team checks this wallet before the{" "}
              {amount} leaves. Your funds are held, not lost.
            </span>
          </span>
        </div>
      );
    case "prove-ownership":
      return (
        <>
          {travel}
          {proof("on")}
          {selfie("todo")}
        </>
      );
    case "step-up":
    case "step-up-unavailable":
      return (
        <>
          {travel}
          {selfHosted ? proof("done") : null}
          {selfie("on")}
        </>
      );
    case "ready":
      return (
        <>
          {travel}
          {selfHosted ? proof("done") : null}
          {view.stepUp ? selfie("done") : null}
          <div className="ks-ok" role="status">
            <Check aria-hidden className="ks-up" size={18} />
            <span>
              <b>Sent.</b> {amount} is on its way to{" "}
              {shortAddress(view.wallet ?? item.wallet)}.
            </span>
          </div>
        </>
      );
    default:
      return (
        <>
          {travel}
          <div className="ks-step is-on">
            <span className="n">…</span>
            <span className="x">
              <b>Waiting for the Travel Rule exchange</b>
              <span>
                {view.travelRule
                  ? travelRuleLabel(view.travelRule.status)
                  : "Didit is still deciding"}
                . Your {amount} is held until it finishes.
              </span>
            </span>
          </div>
        </>
      );
  }
}
