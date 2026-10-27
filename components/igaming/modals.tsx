"use client";

import type { ActivityItem } from "@/lib/igaming/ledger";

import * as React from "react";
import {
  Apple,
  CircleCheck,
  CircleSlash,
  CreditCard,
  IdCard,
  KeyRound,
  Timer,
  X,
} from "lucide-react";

import { DiditRing } from "@/components/didit-live/icons";
import {
  KYC_THRESHOLD,
  formatMoney,
  transactionView,
} from "@/lib/igaming/policy";

function Layer({
  label,
  onClose,
  children,
  className,
}: {
  label: string;
  onClose(): void;
  children: React.ReactNode;
  className: string;
}) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ap-layer">
      <div aria-hidden className="ap-scrim" onMouseDown={onClose} />
      <div aria-label={label} aria-modal="true" className={`ap-modal ${className}`} role="dialog">
        <button aria-label="Close" className="ap-modal-x" type="button" onClick={onClose}>
          <X aria-hidden size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Secured({ children }: { children: React.ReactNode }) {
  return (
    <span className="ap-secured">
      <DiditRing />
      {children} <b>Didit</b>
    </span>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
      <path d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.82h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.33Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96L6.4 13.9Z" fill="#FBBC05" />
      <path d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z" fill="#EA4335" />
    </svg>
  );
}

const age = (dob: string) => {
  const born = new Date(dob);

  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();

  if (
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  )
    years -= 1;

  return years;
};

export interface SignUpProps {
  authEnabled: boolean;
  busy: boolean;
  error: string | null;
  /** The account already opened on this device, for the bonus-abuse step. */
  previous: string | null;
  onClose(): void;
  /** Hosted Didit sign-up: passkey first, Google and Apple there too. */
  onHosted(): void;
  onEmailStart(email: string, dob: string): Promise<boolean>;
  onEmailVerify(code: string): void;
  /** Without Authentication: the casino's own sign-up. */
  onJoin(name: string, email: string, dob: string): void;
}

/** Aurora Play's own sign-up modal, with Didit Authentication inside it. */
export function SignUpModal({
  authEnabled,
  busy,
  error,
  previous,
  onClose,
  onHosted,
  onEmailStart,
  onEmailVerify,
  onJoin,
}: SignUpProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);
  const [local, setLocal] = React.useState<string | null>(null);

  const checkAge = () => {
    const years = age(dob);

    if (years === null) return "Enter your date of birth.";
    if (years < 18) return "You must be 18 or older to play.";

    return null;
  };

  return (
    <Layer className="ap-signup" label="Create your account" onClose={onClose}>
      <div className="ap-signup-art">
        <div>
          <small>Welcome offer</small>
          <b>
            100 free spins
            <br />+ 200 EUR match
          </b>
          <p>On your first deposit. 18+. Wagering 30x.</p>
        </div>
      </div>
      <form
        className="ap-signup-form"
        onSubmit={(event) => {
          event.preventDefault();
          const problem = codeSent ? null : checkAge();

          setLocal(problem);
          if (problem) return;
          if (!authEnabled) return onJoin(name.trim(), email.trim(), dob);
          if (codeSent) return onEmailVerify(code.trim());
          onEmailStart(email.trim(), dob).then(setCodeSent);
        }}
      >
        <h2>Create your account</h2>
        <p>
          {authEnabled
            ? "Join in seconds with a passkey. No password to remember."
            : "Join in seconds. Your age is checked once, before your first bet."}
        </p>
        {previous ? (
          <p className="ap-note">
            This is a second account on the same device as {previous}. Claim the
            welcome offer again to see what Didit does.
          </p>
        ) : null}
        {authEnabled && !codeSent ? (
          <>
            <button
              className="ap-btn is-grad"
              data-callout="passkey"
              disabled={busy}
              type="button"
              onClick={onHosted}
            >
              <KeyRound aria-hidden size={17} />
              Create a passkey
            </button>
            <span className="ap-socs">
              <button className="ap-soc" disabled={busy} type="button" onClick={onHosted}>
                <GoogleMark />
                Google
              </button>
              <button className="ap-soc" disabled={busy} type="button" onClick={onHosted}>
                <Apple aria-hidden fill="currentColor" size={16} />
                Apple
              </button>
            </span>
            <span className="ap-or">or with email</span>
          </>
        ) : null}
        {!authEnabled ? (
          <label className="ap-field">
            Full name
            <span className="ap-input">
              <input
                required
                autoComplete="name"
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </span>
          </label>
        ) : null}
        {codeSent ? (
          <label className="ap-field">
            The 6-digit code we sent to {email}
            <span className="ap-input">
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
            <label className="ap-field">
              Email
              <span className="ap-input">
                <input
                  required
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </span>
            </label>
            <label className="ap-field">
              Date of birth
              <span className="ap-input">
                <input
                  required
                  autoComplete="bday"
                  type="date"
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                />
              </span>
            </label>
          </>
        )}
        {local || error ? <p className="ap-err" role="alert">{local ?? error}</p> : null}
        <button
          className={`ap-btn ${authEnabled ? "is-ghost" : "is-grad"}`}
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
        <p className="ap-fine">
          By joining you confirm you are 18 or older and accept the Terms and the
          Privacy policy.
        </p>
        {authEnabled ? <Secured>Sign-in secured by</Secured> : null}
      </form>
    </Layer>
  );
}

const PRESETS = [200, 500, 1500];

export interface CashierProps {
  busy: boolean;
  /** Deposits Didit recorded in the window, whatever their status. */
  deposited: number;
  balance: number;
  limit: number | null;
  /** The latest cashier result, shown in place of the form. */
  result: ActivityItem | null;
  onClose(): void;
  onDeposit(amount: number): void;
  onWithdraw(amount: number): void;
  onVerify(): void;
}

/** The cashier: every deposit and withdrawal goes to Didit from the browser. */
export function CashierModal({
  busy,
  deposited,
  balance,
  limit,
  result,
  onClose,
  onDeposit,
  onWithdraw,
  onVerify,
}: CashierProps) {
  const [mode, setMode] = React.useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = React.useState(500);
  const [other, setOther] = React.useState(false);
  const status = result?.record?.status ?? null;
  const held = status === "AWAITING_USER" && result?.kind === "deposit";
  const shownTotal = Math.min(deposited, KYC_THRESHOLD * 2);
  const view = result
    ? result.record
      ? transactionView(result.kind, result.record.status)
      : null
    : null;

  return (
    <Layer className="ap-cashier" label="Cashier" onClose={onClose}>
      <div className="ap-cashier-h">
        <h2>Cashier</h2>
        {(["deposit", "withdrawal"] as const).map((item) => (
          <button
            key={item}
            aria-pressed={mode === item}
            className={`ap-chip${mode === item ? " is-on" : ""}`}
            type="button"
            onClick={() => setMode(item)}
          >
            {item === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        ))}
      </div>
      <div className="ap-amounts">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            className={!other && amount === preset ? "is-on" : undefined}
            type="button"
            onClick={() => {
              setOther(false);
              setAmount(preset);
            }}
          >
            {preset.toLocaleString("en-US")}
          </button>
        ))}
        <button className={other ? "is-on" : undefined} type="button" onClick={() => setOther(true)}>
          Other
        </button>
      </div>
      <label className="ap-field">
        Amount
        <span className="ap-input">
          <input
            aria-label="Amount"
            inputMode="decimal"
            min={1}
            type="number"
            value={amount}
            onChange={(event) => {
              setOther(true);
              setAmount(Number(event.target.value));
            }}
          />
          <span className="text-[var(--ap-muted)]">EUR</span>
        </span>
      </label>
      <div className="ap-field">
        {mode === "deposit" ? "Pay with" : "Pay out to"}
        <span className="ap-input">
          <CreditCard aria-hidden size={18} />
          Visa ending 4417
          <span className="ml-auto text-[13px] text-[var(--ap-muted)]">Instant</span>
        </span>
      </div>
      {mode === "deposit" ? (
        <div className="flex flex-col gap-2">
          <span className="ap-meter-row">
            Deposited in the last 30 days
            <b>
              {deposited.toLocaleString("en-US")} of{" "}
              {KYC_THRESHOLD.toLocaleString("en-US")} EUR
            </b>
          </span>
          <span className="ap-meter">
            <i style={{ width: `${Math.min(100, (shownTotal / KYC_THRESHOLD) * 100)}%` }} />
          </span>
        </div>
      ) : (
        <span className="ap-meter-row">
          Available to withdraw <b>{formatMoney(balance)}</b>
        </span>
      )}
      {held ? (
        <div className="ap-hold" data-callout="hold" data-testid="aurora-hold">
          <span className="flex flex-wrap items-center gap-3">
            <span className="ap-pill is-hold">
              <Timer aria-hidden size={14} />
              On hold
            </span>
            <h3>Confirm your ID to finish this deposit</h3>
          </span>
          <p>
            Licensed casinos check your ID once deposits reach{" "}
            {KYC_THRESHOLD.toLocaleString("en-US")} EUR in 30 days. It takes about
            two minutes. Your {result?.amount.toLocaleString("en-US")} EUR goes
            through as soon as it is approved.
          </p>
          <span className="flex gap-2.5">
            <button className="ap-btn is-gold flex-1" disabled={busy} type="button" onClick={onVerify}>
              <IdCard aria-hidden size={18} />
              Verify my ID
            </button>
            <button className="ap-btn is-ghost" type="button" onClick={onClose}>
              Cancel
            </button>
          </span>
        </div>
      ) : result && (view || result.error) ? (
        <div
          className={`ap-done${view?.tone === "declined" || result.error ? " is-no" : ""}`}
          data-testid="aurora-cashier-result"
          role="status"
        >
          {view?.tone === "approved" ? (
            <CircleCheck aria-hidden className="flex-none text-[#5EE7A0]" size={18} />
          ) : (
            <CircleSlash aria-hidden className="flex-none text-[#FF8A9C]" size={18} />
          )}
          <span>
            <b>
              {view?.label ?? "Not accepted"} · {formatMoney(result.amount)}
            </b>
            <br />
            {view?.message ?? result.error}
          </span>
        </div>
      ) : null}
      {!held ? (
        <button
          className="ap-btn is-green h-12"
          disabled={busy || !(amount > 0)}
          type="button"
          onClick={() => (mode === "deposit" ? onDeposit(amount) : onWithdraw(amount))}
        >
          {busy
            ? "Sending…"
            : `${mode === "deposit" ? "Deposit" : "Withdraw"} ${formatMoney(amount || 0)}`}
        </button>
      ) : null}
      <p className="ap-fine">
        {limit
          ? `Deposit limit: ${limit.toLocaleString("en-US")} EUR a day. Change it in Responsible gaming.`
          : "Set a daily deposit limit any time in Responsible gaming."}
      </p>
      <Secured>Payments monitored by</Secured>
    </Layer>
  );
}

/** The welcome offer, refused on a device that already claimed it. */
export function OfferModal({
  email,
  ago,
  status,
  onClose,
  onDeposit,
}: {
  email: string;
  ago: string;
  status: string;
  onClose(): void;
  onDeposit(): void;
}) {
  const declined = status === "DECLINED";

  return (
    <Layer className="ap-offer" label="Offer not available" onClose={onClose}>
      <div aria-hidden className="ap-offer-art" />
      <div className="ap-offer-x" data-testid="aurora-offer">
        <span className="ap-pill is-no self-start">
          <CircleSlash aria-hidden size={14} />
          Offer not available
        </span>
        <h2>The welcome offer is one per player</h2>
        <p>
          The 100 free spins were already claimed on this device. You can still
          deposit and play. Bonuses stay with the first account.
        </p>
        <div className="ap-acct" data-callout="account">
          <span aria-hidden className="ap-ava">
            {email.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <b>{email}</b>
            <small>New account · {ago}</small>
          </span>
          <span className="ap-pill is-no">{declined ? "Bonus declined" : "Bonus on hold"}</span>
        </div>
        <span className="flex gap-2.5">
          <button className="ap-btn is-green flex-1" type="button" onClick={onDeposit}>
            Deposit without the bonus
          </button>
          <button className="ap-btn is-ghost" type="button" onClick={onClose}>
            Back to the lobby
          </button>
        </span>
      </div>
    </Layer>
  );
}

/** Responsible gaming: a daily deposit limit and self-exclusion. */
export function ResponsibleModal({
  busy,
  limit,
  excluded,
  onClose,
  onLimit,
  onExclude,
}: {
  busy: boolean;
  limit: number | null;
  excluded: boolean;
  onClose(): void;
  onLimit(amount: number): void;
  onExclude(): void;
}) {
  return (
    <Layer className="ap-rgm" label="Responsible gaming" onClose={onClose}>
      <h2>Responsible gaming</h2>
      <p>
        A daily deposit limit applies from now. Taking a break pays your balance
        out and closes your account to deposits and bets.
      </p>
      <div className="ap-amounts">
        {[100, 250, 500, 1000].map((value) => (
          <button
            key={value}
            className={limit === value ? "is-on" : undefined}
            disabled={busy || excluded}
            type="button"
            onClick={() => onLimit(value)}
          >
            {value.toLocaleString("en-US")}
          </button>
        ))}
      </div>
      <button
        className="ap-btn is-ghost"
        disabled={busy || excluded}
        type="button"
        onClick={onExclude}
      >
        {excluded ? "You are on a break" : "Take a break"}
      </button>
    </Layer>
  );
}
