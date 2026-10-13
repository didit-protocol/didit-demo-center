"use client";

import type { ActivityItem, Kestrel } from "./use-kestrel";

import * as React from "react";
import { ArrowLeft, Building2, Globe, Wallet } from "lucide-react";

import { Notice, Spinner, formatEth } from "./ui";

import {
  SANCTIONED_WALLET,
  isEvmAddress,
  parseAmount,
  shortAddress,
  type DepositSource,
  type WithdrawalDestination,
} from "@/lib/crypto-exchange/transactions";
import { cn } from "@/lib/utils";

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      type="button"
      onClick={onBack}
    >
      <ArrowLeft className="size-4" />
      Wallet
    </button>
  );
}

interface Choice<T extends string> {
  value: T;
  title: string;
  detail: string;
  icon: typeof Wallet;
  tag?: string;
}

function ChoiceList<T extends string>({
  name,
  choices,
  value,
  onChange,
}: {
  name: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div aria-label={name} className="flex flex-col gap-2" role="radiogroup">
      {choices.map((choice) => (
        <button
          key={choice.value}
          aria-checked={value === choice.value}
          className={cn(
            "flex w-full items-center gap-3 rounded-sm border px-4 py-3 text-left transition-colors duration-fast",
            value === choice.value
              ? "border-blue bg-blue-tint"
              : "border-line bg-canvas hover:border-subtle-gray/50",
          )}
          role="radio"
          type="button"
          onClick={() => onChange(choice.value)}
        >
          <span
            className={cn(
              "flex size-9 flex-none items-center justify-center rounded-pill",
              value === choice.value
                ? "bg-blue text-white"
                : "bg-elevated text-muted",
            )}
          >
            <choice.icon className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
              {choice.title}
              {choice.tag && (
                <span className="rounded-pill bg-danger-bg px-2 py-0.5 text-[11px] font-medium text-danger">
                  {choice.tag}
                </span>
              )}
            </span>
            <span className="truncate text-xs text-muted">{choice.detail}</span>
          </span>
          <span
            aria-hidden
            className={cn(
              "size-4 flex-none rounded-pill border-2",
              value === choice.value
                ? "border-blue bg-blue shadow-[inset_0_0_0_2px_rgb(var(--canvas))]"
                : "border-line",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function AmountField({
  value,
  onChange,
  presets,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink" htmlFor="kestrel-amount">
        Amount
      </label>
      <div className="flex h-12 items-center rounded-sm border border-line bg-canvas pr-4 focus-within:border-blue">
        <input
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-lg text-ink tnum outline-none"
          id="kestrel-amount"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-sm font-medium text-muted">ETH</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            className={cn(
              "h-7 rounded-pill border px-3 text-xs font-medium tnum transition-colors duration-fast",
              value === preset
                ? "border-ink bg-ink text-canvas"
                : "border-line bg-canvas text-muted hover:text-ink",
            )}
            type="button"
            onClick={() => onChange(preset)}
          >
            {preset} ETH
          </button>
        ))}
        {hint && <span className="ml-auto text-xs text-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function DepositForm({
  kestrel,
  onBack,
  onDone,
}: {
  kestrel: Kestrel;
  onBack: () => void;
  onDone: (item: ActivityItem) => void;
}) {
  const [source, setSource] = React.useState<DepositSource>("own-wallet");
  const [amount, setAmount] = React.useState("1.25");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ownWallet = kestrel.wallets?.ownWallet ?? "";

  const choices: Choice<DepositSource>[] = [
    {
      value: "own-wallet",
      title: "From your wallet",
      detail: `${shortAddress(ownWallet)} · your self-hosted MetaMask`,
      icon: Wallet,
    },
    {
      value: "unknown-sender",
      title: "From an unknown sender",
      detail: `${shortAddress(SANCTIONED_WALLET)} · a wallet you have never used`,
      icon: Globe,
      tag: "Risky",
    },
  ];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseAmount(amount);

    if (!parsed) {
      setError("Enter an amount between 0.01 and 5 ETH.");

      return;
    }
    setBusy(true);
    setError(null);
    const result = await kestrel.deposit(source, parsed);

    setBusy(false);
    if ("error" in result && result.error) setError(result.error);
    else if ("item" in result && result.item) onDone(result.item);
  };

  return (
    <form
      className="mx-auto flex w-full max-w-[560px] flex-col gap-6"
      onSubmit={submit}
    >
      <BackLink onBack={onBack} />
      <div>
        <h2 className="m-0 text-[22px] font-display tracking-display text-ink">
          Deposit ETH
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">
          Your Kestrel deposit address receives the transfer. Before the funds
          are credited, Didit screens the wallet they came from.
        </p>
      </div>
      <ChoiceList
        choices={choices}
        name="Deposit source"
        value={source}
        onChange={setSource}
      />
      <AmountField
        presets={["0.5", "1.25", "2"]}
        value={amount}
        onChange={setAmount}
      />
      <Notice tone="neutral">
        There is no blockchain behind Kestrel, so this button stands in for the
        node that detects the transfer. Kestrel&apos;s backend then reports it
        to Didit with <code className="text-ink">POST /v3/transactions/</code>,
        exactly as it would live.
      </Notice>
      {error && <Notice tone="declined">{error}</Notice>}
      <button
        className="btn-base h-12 bg-blue px-5 text-white hover:bg-blue-deep disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? (
          <>
            <Spinner /> Screening the sending wallet
          </>
        ) : (
          "Receive deposit"
        )}
      </button>
    </form>
  );
}

export function WithdrawForm({
  kestrel,
  onBack,
  onDone,
}: {
  kestrel: Kestrel;
  onBack: () => void;
  onDone: (item: ActivityItem) => void;
}) {
  const fullName = kestrel.account?.fullName ?? "";
  const [destination, setDestination] =
    React.useState<WithdrawalDestination>("own-wallet");
  const [amount, setAmount] = React.useState("0.4");
  const [address, setAddress] = React.useState("");
  const [recipient, setRecipient] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const wallets = kestrel.wallets;
  const available = kestrel.balances.available;

  const choices: Choice<WithdrawalDestination>[] = [
    {
      value: "own-wallet",
      title: "Your wallet",
      detail: `${shortAddress(wallets?.ownWallet ?? "")} · self-hosted`,
      icon: Wallet,
    },
    {
      value: "exchange",
      title: "Your account at another exchange",
      detail: `${shortAddress(wallets?.exchangeDeposit ?? "")} · a deposit address there`,
      icon: Building2,
    },
    {
      value: "address",
      title: "Another address",
      detail: "Paste any Ethereum address",
      icon: Globe,
    },
  ];

  const target =
    destination === "own-wallet"
      ? (wallets?.ownWallet ?? "")
      : destination === "exchange"
        ? (wallets?.exchangeDeposit ?? "")
        : address.trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseAmount(amount);

    if (!parsed) {
      setError("Enter an amount between 0.01 and 5 ETH.");

      return;
    }
    if (Number(parsed) > available) {
      setError(`You can withdraw up to ${formatEth(available)}.`);

      return;
    }
    if (!isEvmAddress(target)) {
      setError(
        "Enter a valid Ethereum address (0x followed by 40 hex characters).",
      );

      return;
    }
    setBusy(true);
    setError(null);
    const result = await kestrel.withdraw({
      destination,
      amount: parsed,
      address: target,
      beneficiaryName: destination === "address" ? recipient : fullName,
    });

    setBusy(false);
    if ("error" in result && result.error) setError(result.error);
    else if ("item" in result && result.item) onDone(result.item);
  };

  return (
    <form
      className="mx-auto flex w-full max-w-[560px] flex-col gap-6"
      onSubmit={submit}
    >
      <BackLink onBack={onBack} />
      <div>
        <h2 className="m-0 text-[22px] font-display tracking-display text-ink">
          Withdraw ETH
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">
          Didit screens the destination, runs the Travel Rule exchange and asks
          you for a selfie before Kestrel releases the funds.
        </p>
      </div>
      <ChoiceList
        choices={choices}
        name="Withdrawal destination"
        value={destination}
        onChange={setDestination}
      />
      {destination === "address" && (
        <div className="flex flex-col gap-3 rounded-sm border border-line bg-surface p-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Destination address
            <input
              className="h-11 rounded-xs border border-line bg-canvas px-3 font-mono text-[13px] font-normal text-ink outline-none focus:border-blue"
              placeholder="0x..."
              spellCheck={false}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Who owns it
            <input
              className="h-11 rounded-xs border border-line bg-canvas px-3 text-sm font-normal text-ink outline-none focus:border-blue"
              placeholder="Recipient's full name"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            />
          </label>
          <button
            className="w-fit text-xs font-medium text-danger underline underline-offset-2"
            type="button"
            onClick={() => {
              setAddress(SANCTIONED_WALLET);
              setRecipient("Unknown recipient");
            }}
          >
            Try a sanctioned address (Lazarus Group, OFAC)
          </button>
        </div>
      )}
      <AmountField
        hint={<>Available {formatEth(available)}</>}
        presets={["0.1", "0.4", "1"]}
        value={amount}
        onChange={setAmount}
      />
      {error && <Notice tone="declined">{error}</Notice>}
      <button
        className="btn-base h-12 bg-ink px-5 text-canvas hover:bg-accent-black disabled:opacity-60"
        disabled={busy || !kestrel.sdkReady}
        type="submit"
      >
        {busy ? (
          <>
            <Spinner /> Submitting with the Didit SDK
          </>
        ) : (
          "Withdraw"
        )}
      </button>
    </form>
  );
}
