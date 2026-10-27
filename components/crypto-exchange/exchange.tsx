"use client";

import type {
  ActivityItem,
  Asset,
  AssetBalance,
} from "@/lib/crypto-exchange/transactions";

import * as React from "react";
import {
  Apple,
  ArrowDown,
  ArrowUp,
  KeyRound,
  Search,
  ShieldCheck,
} from "lucide-react";

import { AreaLine, CandleChart, Sparkline } from "./charts";

import { DiditRing } from "@/components/didit-live/icons";
import {
  MARKETS,
  compact,
  eurValue,
  formatAmount,
  formatChange,
  formatEur,
  formatPrice,
  marketOf,
  orderBook,
} from "@/lib/crypto-exchange/markets";
import {
  shortAddress,
  statusLabel,
  withdrawalStage,
} from "@/lib/crypto-exchange/transactions";

export const AVATAR = "/demos/kestrel/p-arjun.webp";

const NAV = ["Markets", "Trade", "Portfolio", "Earn", "Wallet"] as const;

export function KestrelMark({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden height={size} viewBox="0 0 32 32" width={size}>
      <path d="M2 24 L12 6 L16 15 Z" fill="#1CC8B4" />
      <path d="M12 24 L22 8 L30 26 L20 18 Z" fill="#12A594" />
      <path d="M6 27 L16 15 L20 18 Z" fill="#0E7F72" />
    </svg>
  );
}

function Coin({ symbol }: { symbol: string }) {
  const market = marketOf(symbol);

  return (
    <span aria-hidden className="ks-coin" style={{ background: market.color }}>
      {market.glyph}
    </span>
  );
}

function Change({ value }: { value: number }) {
  return (
    <span className={`ks-mono ${value >= 0 ? "ks-up" : "ks-down"}`}>
      {formatChange(value)}
    </span>
  );
}

function Ticker() {
  return (
    <div aria-label="Markets" className="ks-tick ks-mono" role="marquee">
      {MARKETS.map((market) => (
        <span key={market.symbol}>
          <b>{market.symbol}/EUR</b>
          {formatPrice(market.price, market.decimals)}
          <Change value={market.change} />
        </span>
      ))}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.82h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.33Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96L6.4 13.9Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export const COUNTRIES = [
  "Portugal",
  "Spain",
  "France",
  "Germany",
  "Italy",
  "Ireland",
  "Netherlands",
  "Belgium",
  "Austria",
  "Poland",
];

export interface SignUpCardProps {
  authEnabled: boolean;
  busy: boolean;
  error: string | null;
  /** Hosted Didit sign-up: passkey first, Google and Apple there too. */
  onHosted(): void;
  onEmailStart(email: string): Promise<boolean>;
  onEmailVerify(code: string): void;
  /** Without Authentication: Kestrel's own sign-up. */
  onJoin(email: string, country: string): void;
}

/** "Create your account": Kestrel's card, with Didit Authentication inside. */
function SignUpCard({
  authEnabled,
  busy,
  error,
  onHosted,
  onEmailStart,
  onEmailVerify,
  onJoin,
}: SignUpCardProps) {
  const [email, setEmail] = React.useState("");
  const [country, setCountry] = React.useState(COUNTRIES[0]);
  const [code, setCode] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);

  return (
    <form
      aria-label="Create your account"
      className="ks-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!authEnabled) return onJoin(email.trim(), country);
        if (codeSent) return onEmailVerify(code.trim());
        onEmailStart(email.trim()).then(setCodeSent);
      }}
    >
      <h2>Create your account</h2>
      <p>
        {authEnabled
          ? "Your keys to your account: a passkey, not a password."
          : "Open an account in a minute. We verify your identity before your first deposit."}
      </p>
      {authEnabled && !codeSent ? (
        <>
          <button
            className="ks-btn is-teal"
            data-callout="passkey"
            disabled={busy}
            type="button"
            onClick={onHosted}
          >
            <KeyRound aria-hidden size={18} />
            Create a passkey
          </button>
          <span className="ks-socs">
            <button
              className="ks-btn"
              disabled={busy}
              type="button"
              onClick={onHosted}
            >
              <GoogleMark />
              Google
            </button>
            <button
              className="ks-btn"
              disabled={busy}
              type="button"
              onClick={onHosted}
            >
              <Apple aria-hidden fill="currentColor" size={16} />
              Apple
            </button>
          </span>
          <span className="ks-or">or with email</span>
        </>
      ) : null}
      {codeSent ? (
        <label className="ks-field">
          The 6-digit code we sent to {email}
          <span className="ks-input">
            <input
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </span>
        </label>
      ) : (
        <>
          <label className="ks-field">
            Email
            <span
              className="ks-input"
              data-callout={authEnabled ? undefined : "passkey"}
            >
              <input
                required
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label className="ks-field">
            Country of residence
            <span className="ks-input">
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {COUNTRIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </span>
          </label>
        </>
      )}
      {error ? (
        <p className="ks-err" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className={`ks-btn ${authEnabled ? "" : "is-teal"}`}
        disabled={busy}
        type="submit"
      >
        {!authEnabled
          ? busy
            ? "Creating your account…"
            : "Create account"
          : codeSent
            ? "Confirm the code"
            : "Email me a code"}
      </button>
      <p className="ks-fine">
        Crypto is volatile. Kestrel is a fictional exchange: a Didit demo on the
        sandbox, where no real money moves.
      </p>
      {authEnabled ? (
        <span className="ks-secured">
          <DiditRing />
          Sign-in secured by <b>Didit</b>
        </span>
      ) : null}
    </form>
  );
}

function Landing(props: SignUpCardProps) {
  return (
    <div className="ks-land">
      <div className="ks-hero">
        <span className="ks-promo">Travel Rule built in</span>
        <h1>Buy, hold and send crypto. Safely.</h1>
        <p>
          Euro deposits by SEPA Instant, withdrawals to any wallet, with the
          Travel Rule built in.
        </p>
        <div className="ks-coins">
          {MARKETS.slice(0, 3).map((market) => (
            <div key={market.symbol} className="ks-coincard">
              <span className="h">
                <Coin symbol={market.symbol} />
                {market.symbol}
                <Change value={market.change} />
              </span>
              <span className="p ks-mono">
                {formatEur(market.price, market.decimals)}
              </span>
              <Sparkline
                change={market.change}
                height={40}
                symbol={market.symbol}
                width={180}
              />
            </div>
          ))}
        </div>
      </div>
      <SignUpCard {...props} />
    </div>
  );
}

const itemTitle = (item: ActivityItem) =>
  `${item.kind === "deposit" ? "Deposit" : "Withdrawal"} · ${Number(item.view.amount) || 0} ${item.asset}`;

function itemPill(item: ActivityItem): { tone: string; label: string } {
  if (item.kind === "deposit") {
    if (item.view.status === "APPROVED")
      return { tone: "is-ok", label: "Screened" };
    if (item.view.status === "DECLINED")
      return { tone: "is-no", label: "Frozen" };

    return { tone: "is-hold", label: statusLabel(item.view.status) };
  }
  switch (withdrawalStage(item.view)) {
    case "ready":
      return { tone: "is-ok", label: "Sent" };
    case "blocked":
      return { tone: "is-no", label: "Declined" };
    case "review":
      return { tone: "is-hold", label: "In review" };
    case "prove-ownership":
    case "step-up":
      return { tone: "is-hold", label: "Action needed" };
    default:
      return { tone: "is-hold", label: "Waiting" };
  }
}

export type KycBanner =
  | { kind: "verify" }
  | { kind: "processing" }
  | { kind: "review" }
  | { kind: "declined" }
  | null;

export interface TradeProps {
  name: string | null;
  activity: ActivityItem[];
  balances: Record<Asset, AssetBalance>;
  banner: KycBanner;
  busy: boolean;
  onVerify(): void;
  onDeposit(): void;
  onWithdraw(): void;
  onItem(item: ActivityItem): void;
}

function KycBar({
  banner,
  busy,
  phone = false,
  onVerify,
}: Pick<TradeProps, "banner" | "busy" | "onVerify"> & { phone?: boolean }) {
  if (!banner) return null;
  const copy = {
    verify: [
      "Verify your identity to deposit.",
      "EU law asks every crypto exchange to know its customers. It takes about two minutes.",
    ],
    processing: [
      "Finishing your verification.",
      "Complete it in the window that opened, or continue it here.",
    ],
    review: [
      "Your verification is in review.",
      "A compliance analyst decides before your first deposit.",
    ],
    declined: [
      "We could not verify you.",
      "This account cannot deposit or withdraw.",
    ],
  }[banner.kind];

  return (
    <div className={`ks-banner${phone ? " is-phone" : ""}`} role="status">
      <ShieldCheck aria-hidden className="ks-up" size={18} />
      <b>{copy[0]}</b>
      <span>{copy[1]}</span>
      {banner.kind === "verify" || banner.kind === "processing" ? (
        <button
          className="ks-btn is-teal is-sm"
          disabled={busy}
          type="button"
          onClick={onVerify}
        >
          {banner.kind === "verify"
            ? "Verify my identity"
            : "Continue verification"}
        </button>
      ) : null}
    </div>
  );
}

function Activity({
  activity,
  banner,
  onItem,
}: Pick<TradeProps, "activity" | "banner" | "onItem">) {
  return (
    <section aria-label="Your activity" className="ks-activity">
      <div className="ks-h">Your activity</div>
      <div className="ks-rows">
        {activity.length === 0 ? (
          <p className="ks-empty">
            {banner ? (
              <span>
                <b>No activity yet.</b> Your first deposit opens once your
                identity is verified.
              </span>
            ) : (
              <span>
                <b>No activity yet.</b> Deposit from your wallet: Didit screens
                the sending wallet before it is credited.
              </span>
            )}
          </p>
        ) : null}
        {activity.map((item, index) => {
          const pill = itemPill(item);

          return (
            <div
              key={item.id}
              className="ks-row"
              data-callout={index === 0 ? "activity-latest" : undefined}
              data-testid="kestrel-activity-row"
            >
              <Coin symbol={item.asset} />
              <span className="x">
                <b>{itemTitle(item)}</b>
                <span className="ks-mono">
                  {item.kind === "deposit" ? "From" : "To"}{" "}
                  {shortAddress(item.view.wallet ?? item.wallet)}
                </span>
              </span>
              <span className="a ks-mono">
                {item.kind === "deposit" ? "+" : "-"}
                {formatAmount(Number(item.view.amount) || 0, 8)}
              </span>
              <button
                className={`ks-pill ${pill.tone}`}
                type="button"
                onClick={() => onItem(item)}
              >
                {pill.label}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Trade(props: TradeProps) {
  const book = React.useMemo(() => orderBook(), []);
  const btc = MARKETS[0];

  return (
    <>
      <KycBar
        banner={props.banner}
        busy={props.busy}
        onVerify={props.onVerify}
      />
      <div className="ks-trade">
        <div className="ks-col">
          <div className="ks-h">
            Markets <span>EUR</span>
            <Search aria-hidden className="ml-auto text-[#56677A]" size={16} />
          </div>
          <div className="ks-mkts">
            {MARKETS.map((market, index) => (
              <div
                key={market.symbol}
                className={`ks-mkt${index === 0 ? " is-on" : ""}`}
              >
                <Coin symbol={market.symbol} />
                <span className="x">
                  <b>{market.symbol}/EUR</b>
                  <span>{market.name}</span>
                </span>
                <Sparkline
                  change={market.change}
                  symbol={market.symbol}
                  width={70}
                />
                <span className="r ks-mono">
                  {formatPrice(market.price, market.decimals)}
                  <Change value={market.change} />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="ks-col is-mid">
          <div className="ks-pair">
            <Coin symbol="BTC" />
            <span className="n">
              <b>BTC/EUR</b>
              <span>Bitcoin</span>
            </span>
            <span className="p ks-mono">{formatPrice(btc.price)}</span>
            <span className="ks-stat">
              24h change
              <b className="ks-mono">{formatChange(btc.change)}</b>
            </span>
            <span className="ks-stat">
              Your BTC
              <b className="ks-mono" data-testid="kestrel-balance-btc">
                {formatAmount(props.balances.BTC.total, 8)}
              </b>
            </span>
            <span className="ks-stat">
              Your ETH
              <b className="ks-mono" data-testid="kestrel-balance-eth">
                {formatAmount(props.balances.ETH.total, 8)}
              </b>
            </span>
          </div>
          <div className="ks-tabs">
            {["15m", "1h", "4h", "1D", "1W"].map((label) => (
              <span
                key={label}
                className={label === "1h" ? "is-on" : undefined}
              >
                {label}
              </span>
            ))}
            <span className="r">
              <span>Candles</span>
              <span>Depth</span>
            </span>
          </div>
          <div className="ks-chart">
            <CandleChart />
          </div>
          <Activity
            activity={props.activity}
            banner={props.banner}
            onItem={props.onItem}
          />
        </div>
        <div className="ks-col">
          <div className="ks-h">
            Order book <span className="ml-auto ks-mono">0.1</span>
          </div>
          <div className="ks-book ks-mono">
            <div className="hd">
              <span>Price EUR</span>
              <span>Amount BTC</span>
              <span>Total</span>
            </div>
            {book.asks.map((row) => (
              <div key={`a${row.price}`}>
                <i
                  className="is-ask"
                  style={{ width: `${row.depth * 100}%` }}
                />
                <span className="ks-down">{formatPrice(row.price, 1)}</span>
                <span>{row.amount.toFixed(4)}</span>
                <span>{compact(row.total)}</span>
              </div>
            ))}
            <div className="ks-spread">
              <span className="ks-up">{formatPrice(btc.price)}</span>
            </div>
            {book.bids.map((row) => (
              <div key={`b${row.price}`}>
                <i
                  className="is-bid"
                  style={{ width: `${row.depth * 100}%` }}
                />
                <span className="ks-up">{formatPrice(row.price, 1)}</span>
                <span>{row.amount.toFixed(4)}</span>
                <span>{compact(row.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PhoneHome {...props} />
    </>
  );
}

/** A phone: the portfolio, the two actions and the holdings. */
function PhoneHome(props: TradeProps) {
  const assets: Asset[] = ["BTC", "ETH"];
  const total = assets.reduce(
    (sum, asset) => sum + eurValue(asset, props.balances[asset].total),
    0,
  );

  return (
    <div className="ks-phone">
      <KycBar
        phone
        banner={props.banner}
        busy={props.busy}
        onVerify={props.onVerify}
      />
      <div className="ks-pf">
        <small>Portfolio</small>
        <span className="v ks-mono" data-testid="kestrel-portfolio">
          {formatEur(total)}
        </span>
        <AreaLine symbol="PORTFOLIO" />
      </div>
      <div className="ks-pf-acts">
        <button
          className="ks-btn is-teal"
          type="button"
          onClick={props.onDeposit}
        >
          Deposit
        </button>
        <button className="ks-btn" type="button" onClick={props.onWithdraw}>
          Withdraw
        </button>
      </div>
      {assets.map((asset) => {
        const market = marketOf(asset);

        return (
          <div key={asset} className="ks-hold">
            <Coin symbol={asset} />
            <span className="x">
              <b>{asset}</b>
              <span>{market.name}</span>
            </span>
            <span className="r ks-mono">
              {formatAmount(props.balances[asset].total, 4)}
              <span>
                {formatEur(eurValue(asset, props.balances[asset].total), 0)}
              </span>
            </span>
          </div>
        );
      })}
      <Activity
        activity={props.activity}
        banner={props.banner}
        onItem={props.onItem}
      />
    </div>
  );
}

/**
 * Kestrel, the exchange: its nav, the ticker, and either the landing with
 * the sign-up card or the trading screen. Dialogs come in as children.
 */
export function Exchange({
  signedIn,
  signUp,
  trade,
  toast,
  onSignIn,
  onSignUp,
  children,
}: {
  signedIn: boolean;
  signUp: SignUpCardProps;
  trade: TradeProps;
  toast: { tone: "info" | "error"; text: string } | null;
  onSignIn(): void;
  onSignUp(): void;
  children?: React.ReactNode;
}) {
  return (
    <div className="ks" data-testid="kestrel-app">
      <header className="ks-nav">
        <span className="ks-logo">
          <KestrelMark />
          kestrel
        </span>
        <nav aria-label="Kestrel">
          {NAV.map((item) => (
            <span
              key={item}
              className={
                item === (signedIn ? "Trade" : "Markets") ? "is-on" : undefined
              }
            >
              {item}
            </span>
          ))}
        </nav>
        <span className="ks-nav-r">
          {signedIn ? (
            <>
              <span aria-hidden className="ks-iconbtn ks-hide-phone">
                <Search size={20} />
              </span>
              <button
                className="ks-btn is-teal ks-hide-phone"
                type="button"
                onClick={trade.onDeposit}
              >
                <ArrowDown aria-hidden size={18} />
                Deposit
              </button>
              <button
                className="ks-btn ks-hide-phone"
                type="button"
                onClick={trade.onWithdraw}
              >
                <ArrowUp aria-hidden size={18} />
                Withdraw
              </button>
              <img
                alt={trade.name ?? "Your account"}
                className="ks-ava"
                src={AVATAR}
              />
            </>
          ) : (
            <>
              <button className="ks-btn" type="button" onClick={onSignIn}>
                Log in
              </button>
              <button
                className="ks-btn is-teal"
                type="button"
                onClick={onSignUp}
              >
                Sign up
              </button>
            </>
          )}
        </span>
      </header>
      <Ticker />
      {signedIn ? <Trade {...trade} /> : <Landing {...signUp} />}
      {toast ? (
        <div
          className={`ks-toast${toast.tone === "error" ? " is-error" : ""}`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.text}
        </div>
      ) : null}
      {children}
    </div>
  );
}
