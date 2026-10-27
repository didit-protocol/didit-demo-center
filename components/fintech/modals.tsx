"use client";

import type { PaymentItem } from "./use-alder";

import * as React from "react";
import {
  Apple,
  CircleCheck,
  KeyRound,
  ScanFace,
  ShieldBan,
  X,
} from "lucide-react";

import { DiditRing } from "@/components/didit-live/icons";
import {
  PAYEES,
  STEP_UP_AMOUNT,
  formatMoney,
  payeeById,
} from "@/lib/fintech/alder";

export function Secured({ children }: { children: React.ReactNode }) {
  return (
    <span className="al-secured">
      <DiditRing />
      {children} <b>Didit</b>
    </span>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden height="17" viewBox="0 0 24 24" width="17">
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

/* ── Step 1: the sign-up card on the public site ─────────────────────── */

export interface SignUpProps {
  authEnabled: boolean;
  busy: boolean;
  error: string | null;
  /** Hosted Didit sign-up: passkey first, Google and Apple there too. */
  onHosted(phone: string): void;
  onEmailStart(email: string): Promise<boolean>;
  onEmailVerify(code: string, phone: string): void;
  /** Without Authentication: the bank's own sign-up. */
  onOpen(details: { name: string; email: string; phone: string }): void;
}

export function SignUpCard({
  authEnabled,
  busy,
  error,
  onHosted,
  onEmailStart,
  onEmailVerify,
  onOpen,
}: SignUpProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);
  const fullPhone = phone.trim() ? `+49 ${phone.trim()}` : "";

  return (
    <form
      aria-label="Open your Alder account"
      className="al-signup"
      data-testid="alder-signup"
      onSubmit={(event) => {
        event.preventDefault();
        if (!authEnabled)
          return onOpen({
            name: name.trim(),
            email: email.trim(),
            phone: fullPhone,
          });
        if (codeSent) return onEmailVerify(code.trim(), fullPhone);
        onEmailStart(email.trim()).then(setCodeSent);
      }}
    >
      <span aria-hidden className="al-progress-steps">
        <i className="is-on" />
        <i />
        <i />
      </span>
      <small className="al-step-of">Step 1 of 3 · Your account</small>
      <h2>Open your Alder account</h2>
      <p className="al-muted">
        {authEnabled
          ? "Sign in with your face or fingerprint. No password, ever."
          : "Your name and email, then your ID and a selfie."}
      </p>
      {authEnabled && !codeSent ? (
        <>
          <button
            className="al-btn is-pri is-lg"
            data-callout="passkey"
            disabled={busy}
            type="button"
            onClick={() => onHosted(fullPhone)}
          >
            <KeyRound aria-hidden size={18} />
            Create a passkey
          </button>
          <span className="al-socs">
            <button
              className="al-btn is-lg"
              disabled={busy}
              type="button"
              onClick={() => onHosted(fullPhone)}
            >
              <GoogleMark />
              Google
            </button>
            <button
              className="al-btn is-lg"
              disabled={busy}
              type="button"
              onClick={() => onHosted(fullPhone)}
            >
              <Apple aria-hidden fill="currentColor" size={17} />
              Apple
            </button>
          </span>
        </>
      ) : null}
      {!authEnabled ? (
        <label className="al-field">
          Full name
          <span className="al-input" data-callout="passkey">
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
        <label className="al-field">
          The 6-digit code we sent to {email}
          <span className="al-input">
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
          <label className="al-field">
            Email
            <span className="al-input">
              <input
                required
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label className="al-field">
            Mobile number
            <span className="al-input">
              <span className="al-prefix">+49</span>
              <input
                autoComplete="tel-national"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </span>
          </label>
        </>
      )}
      {error ? (
        <p className="al-err" role="alert">
          {error}
        </p>
      ) : null}
      {!authEnabled || codeSent || email ? (
        <button
          className={`al-btn is-lg${authEnabled ? "" : " is-pri"}`}
          disabled={busy}
          type="submit"
        >
          {busy
            ? "One moment…"
            : !authEnabled
              ? "Open my account"
              : codeSent
                ? "Confirm the code"
                : "Continue with email"}
        </button>
      ) : null}
      <p className="al-fine">
        Next: your ID and a selfie, then your card. About 5 minutes.
      </p>
      <Secured>Sign-in secured by</Secured>
    </form>
  );
}

/* ── Step 3: the send form and the step-up ───────────────────────────── */

export function SendForm({
  busy,
  locked,
  onSend,
}: {
  busy: boolean;
  /** Payments wait for an approved KYC. */
  locked: boolean;
  onSend(input: { payee: string; amount: number }): void;
}) {
  const [payee, setPayee] = React.useState(PAYEES[0].id);
  const [amount, setAmount] = React.useState(STEP_UP_AMOUNT.toFixed(2));
  const chosen = payeeById(payee) ?? PAYEES[0];
  const value = Number(amount.replace(/[\s,]/g, ""));
  const valid = Number.isFinite(value) && value >= 1 && value <= 50000;

  return (
    <form
      aria-label="Send money"
      className="al-card al-send"
      data-testid="alder-send"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSend({ payee, amount: Math.round(value * 100) / 100 });
      }}
    >
      <div className="al-send-h">
        <h2 className="al-h2">Send money</h2>
        <span className="al-seg">
          <span className="is-on">Bank transfer</span>
          <span>To a contact</span>
        </span>
      </div>
      <fieldset className="al-payees">
        <legend className="al-field">To</legend>
        {PAYEES.map((item) => (
          <label
            key={item.id}
            className={`al-payee${payee === item.id ? " is-on" : ""}`}
          >
            <input
              checked={payee === item.id}
              name="payee"
              type="radio"
              value={item.id}
              onChange={() => setPayee(item.id)}
            />
            <span aria-hidden className="al-merch is-violet">
              {item.name.charAt(0)}
            </span>
            <span className="x">
              <b>{item.name}</b>
              <span>{item.iban}</span>
            </span>
            {item.known ? (
              <span className="al-chip is-neu">Saved</span>
            ) : (
              <span className="al-chip is-hold">New payee</span>
            )}
          </label>
        ))}
      </fieldset>
      <label className="al-field">
        Amount
        <span className="al-input is-amount">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <span className="al-prefix">EUR</span>
        </span>
      </label>
      {!chosen.known && valid && value >= STEP_UP_AMOUNT ? (
        <p className="al-muted">
          Your first payment of {STEP_UP_AMOUNT.toLocaleString("en-US")} EUR or
          more to {chosen.name}: we will ask you to confirm it is you.
        </p>
      ) : null}
      <button
        className="al-btn is-pri is-lg"
        disabled={busy || locked || !valid}
        type="submit"
      >
        {locked
          ? "Payments open once you are verified"
          : busy
            ? "Sending…"
            : `Send ${valid ? formatMoney(value) : ""}`}
      </button>
    </form>
  );
}

function Layer({
  label,
  className,
  onClose,
  children,
}: {
  label: string;
  className: string;
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
    <div className="al-layer">
      <div aria-hidden className="al-scrim" onMouseDown={onClose} />
      <div
        aria-label={label}
        aria-modal="true"
        className={`al-modal ${className}`}
        role="dialog"
      >
        <button
          aria-label="Close"
          className="al-modal-x"
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

export function StepUpModal({
  item,
  busy,
  passkey,
  onPasskey,
  onConfirm,
  onClose,
}: {
  item: PaymentItem;
  busy: boolean;
  /**
   * The passkey before the selfie: `ask` until Didit Authentication signs
   * the same person in again, then `done`. Null when Authentication is off,
   * where the customer has no Didit passkey and the selfie is the step-up.
   */
  passkey: "ask" | "done" | null;
  onPasskey(): void;
  onConfirm(): void;
  onClose(): void;
}) {
  const status = item.record?.status ?? null;
  const released = status === "APPROVED";
  const held = status === "AWAITING_USER";
  const askPasskey = held && passkey === "ask";

  return (
    <Layer
      className="al-stepup"
      label={released ? "Transfer sent" : "Confirm it is you"}
      onClose={onClose}
    >
      <span
        aria-hidden
        className={`al-stepup-ic${released ? " is-done" : ""}`}
        data-callout="stepup"
      >
        {released ? (
          <CircleCheck size={30} />
        ) : askPasskey ? (
          <KeyRound size={30} />
        ) : (
          <ScanFace size={30} />
        )}
      </span>
      <h2>{released ? "Sent" : "Confirm it is you"}</h2>
      <p className="al-muted" data-testid="alder-stepup-copy">
        {released
          ? `${formatMoney(item.amount)} is on its way to ${item.counterparty}. It arrives today.`
          : askPasskey
            ? `This is your first payment to ${item.counterparty}. Confirm it with your passkey, then one quick selfie to release the payment.`
            : held && passkey === "done"
              ? "Passkey confirmed. Now one quick selfie to release the payment."
              : held
                ? `This is your first payment to ${item.counterparty}. One quick selfie to release the payment, so we know it is you and not someone with your phone.`
                : `${item.counterparty} has not received this payment.`}
      </p>
      <dl className="al-summary">
        <div>
          <dt>To</dt>
          <dd>
            {item.counterparty}
            {item.account ? ` · ${item.account}` : ""}
          </dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{formatMoney(item.amount)}</dd>
        </div>
        {(held && passkey) || (released && passkey === "done") ? (
          <div>
            <dt>Confirmed with</dt>
            <dd data-testid="alder-stepup-steps">
              {released
                ? "Passkey and selfie"
                : passkey === "done"
                  ? "Passkey ✓, selfie next"
                  : "Passkey, then a selfie"}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{released ? "Status" : "Arrives"}</dt>
          <dd data-testid="alder-stepup-status">
            {released
              ? "Sent"
              : held
                ? "Today, instantly"
                : (status ?? "Not sent").toLowerCase().replace(/_/g, " ")}
          </dd>
        </div>
      </dl>
      {released ? (
        <button className="al-btn is-pri is-lg" type="button" onClick={onClose}>
          Done
        </button>
      ) : askPasskey ? (
        <>
          <button
            className="al-btn is-pri is-lg"
            disabled={busy}
            type="button"
            onClick={onPasskey}
          >
            <KeyRound aria-hidden size={19} />
            {busy ? "Opening…" : "Confirm with your passkey"}
          </button>
          <button className="al-btn is-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </>
      ) : held ? (
        <>
          <button
            className="al-btn is-pri is-lg"
            disabled={busy}
            type="button"
            onClick={onConfirm}
          >
            <ScanFace aria-hidden size={19} />
            {busy ? "Checking…" : "Confirm with a selfie"}
          </button>
          <button className="al-btn is-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </>
      ) : (
        <button className="al-btn is-lg" type="button" onClick={onClose}>
          Close
        </button>
      )}
      <Secured>Step-up secured by</Secured>
    </Layer>
  );
}

/* ── Step 4: the account-takeover attempt ────────────────────────────── */

export function TakeoverModal({
  email,
  busy,
  onAttempt,
  onClose,
}: {
  email: string;
  busy: boolean;
  onAttempt(): void;
  onClose(): void;
}) {
  return (
    <Layer className="al-attack" label="Sign in to Alder" onClose={onClose}>
      <span className="al-chip is-no al-attack-tag">
        <ShieldBan aria-hidden size={14} />
        You are the attacker now
      </span>
      <h2>Sign in to Alder</h2>
      <p className="al-muted">
        Someone has your email address and tries to sign in from their own
        device. Alder asks for the passkey on your phone or computer, which they
        do not have.
      </p>
      <label className="al-field">
        Email
        <span className="al-input">
          <input readOnly value={email} />
        </span>
      </label>
      <button
        className="al-btn is-pri is-lg"
        disabled={busy}
        type="button"
        onClick={onAttempt}
      >
        <KeyRound aria-hidden size={18} />
        {busy ? "Checking…" : "Try to sign in without the passkey"}
      </button>
      <Secured>Sign-in secured by</Secured>
    </Layer>
  );
}
