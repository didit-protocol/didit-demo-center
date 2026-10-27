"use client";

import type { PaymentItem } from "./use-alder";

import * as React from "react";
import {
  ArrowLeftRight,
  Bell,
  CreditCard,
  Landmark,
  LifeBuoy,
  Monitor,
  MoreHorizontal,
  Plus,
  Repeat,
  Search,
  Send,
  ShieldBan,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  BarChart3,
  Home as HomeIcon,
  KeyRound,
  Leaf,
} from "lucide-react";

import { formatMoney, isInbound, splitMoney } from "@/lib/fintech/alder";

/*
 * Alder: a fictional neobank with its own brand. The card, the payees and
 * the marketing copy are the bank's own content; Didit's part is the
 * sign-up, the onboarding check, the monitored payments, the step-up and the
 * blocked sign-in, and the live layer above shows each one.
 */

export type View = "home" | "payments" | "security";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="al-logo"
      style={{ width: size, height: size, borderRadius: size * 0.31 }}
    >
      <Leaf color="#C6F26B" fill="#C6F26B" size={size * 0.5} strokeWidth={1.5} />
    </span>
  );
}

export function Brand() {
  return (
    <span className="al-brand">
      <Logo />
      alder
    </span>
  );
}

/** The person's avatar: Lena's photo for the demo persona, else initials. */
export function Avatar({ name }: { name: string }) {
  if (/^lena\b/i.test(name.trim()))
    return <img alt="" className="al-ava" src="/demos/alder/lena.webp" />;

  return (
    <span aria-hidden className="al-ava is-initial">
      {(name.trim().charAt(0) || "A").toUpperCase()}
    </span>
  );
}

export function DebitCard({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <div className={`al-bcard ${className}`}>
      <span className="al-bcard-top">
        <span className="al-bcard-brand">
          <Leaf color="#C6F26B" fill="#C6F26B" size={16} strokeWidth={1.5} />
          alder
        </span>
        <small>DEBIT</small>
      </span>
      <span className="al-bcard-mid">
        <span className="al-chipc" />
        <span aria-hidden className="al-nfc">
          ((·))
        </span>
      </span>
      <span className="al-bcard-name">{name.toUpperCase()}</span>
      <span className="al-bcard-bot">
        <b>•••• 7712</b>
        <small>09/30</small>
      </span>
    </div>
  );
}

/* ── The public site, with the sign-up card ─────────────────────────── */

export function Site({
  onLogIn,
  children,
}: {
  onLogIn(): void;
  children: React.ReactNode;
}) {
  return (
    <div className="al-site" data-testid="alder-app">
      <header className="al-site-nav">
        <Brand />
        <nav aria-label="Alder">
          <span>Personal</span>
          <span>Business</span>
          <span>Pricing</span>
          <span>Help</span>
        </nav>
        <button className="al-btn al-login" type="button" onClick={onLogIn}>
          Log in
        </button>
      </header>
      <div className="al-site-body">
        <section className="al-hero">
          <span className="al-hero-chip">
            <ShieldCheck aria-hidden size={15} />
            Free personal account, no monthly fee
          </span>
          <h1>A bank account in five minutes.</h1>
          <p>
            Get your IBAN and a virtual card today, a metal card in three days.
            No branch visit, no paperwork, no password.
          </p>
          <ul>
            <li>
              <ShieldCheck aria-hidden size={18} />
              Deposits protected to 100,000 EUR
            </li>
            <li>
              <Landmark aria-hidden size={18} />
              Licensed bank in the EU
            </li>
            <li>
              <KeyRound aria-hidden size={18} />
              Passkey sign-in on every device
            </li>
          </ul>
          <div aria-hidden className="al-hero-art">
            <DebitCard className="is-tilt" name="Lena Fischer" />
            <span className="al-iban-card">
              <small>Your IBAN, ready today</small>
              <b>DE89 3704 0044 0532 0130 00</b>
            </span>
          </div>
        </section>
        <section className="al-signup-wrap">{children}</section>
      </div>
    </div>
  );
}

/* ── The signed-in app ───────────────────────────────────────────────── */

const NAV: {
  id: View | "cards" | "savings" | "insights";
  label: string;
  Icon: typeof HomeIcon;
}[] = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "payments", label: "Payments", Icon: ArrowLeftRight },
  { id: "cards", label: "Cards", Icon: CreditCard },
  { id: "savings", label: "Savings", Icon: Landmark },
  { id: "insights", label: "Insights", Icon: BarChart3 },
  { id: "security", label: "Security", Icon: ShieldCheck },
];

export function AppFrame({
  view,
  title,
  subtitle,
  name,
  alerts,
  toast,
  onView,
  onElsewhere,
  children,
  overlay,
}: {
  view: View;
  title: string;
  subtitle: string;
  name: string;
  /** Unread security alerts, on the Security item. */
  alerts: number;
  toast: { tone: "info" | "error"; text: string } | null;
  onView(view: View): void;
  /** A part of the bank this demo does not cover. */
  onElsewhere(label: string): void;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="al" data-testid="alder-app">
      <aside className="al-side">
        <Brand />
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-current={view === id ? "page" : undefined}
            className={`al-nav${view === id ? " is-on" : ""}`}
            type="button"
            onClick={() =>
              id === "home" || id === "payments" || id === "security"
                ? onView(id)
                : onElsewhere(label)
            }
          >
            <Icon aria-hidden size={19} strokeWidth={1.8} />
            <span>{label}</span>
            {id === "security" && alerts > 0 ? <b>{alerts}</b> : null}
          </button>
        ))}
        <span className="al-sec">ACCOUNT</span>
        <button
          className="al-nav"
          type="button"
          onClick={() => onElsewhere("Settings")}
        >
          <SlidersHorizontal aria-hidden size={19} strokeWidth={1.8} />
          <span>Settings</span>
        </button>
        <button
          className="al-nav"
          type="button"
          onClick={() => onElsewhere("Help")}
        >
          <LifeBuoy aria-hidden size={19} strokeWidth={1.8} />
          <span>Help</span>
        </button>
        <div className="al-invite">
          <b>Invite a friend, get 20 EUR</b>
          When they open an account and make a first payment.
          <span className="al-cta">Share your link</span>
        </div>
      </aside>
      <div className="al-main">
        <header className="al-top">
          <span className="al-phone-brand">
            <Logo size={40} />
          </span>
          <h1>
            {title}
            <small>{subtitle}</small>
          </h1>
          <span className="al-search">
            <Search aria-hidden size={17} />
            Search payments, people, cards
          </span>
          <span aria-hidden className="al-ib">
            <Bell size={18} />
          </span>
          <Avatar name={name} />
        </header>
        {toast ? (
          <div
            className={`al-toast${toast.tone === "error" ? " is-error" : ""}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            {toast.text}
          </div>
        ) : null}
        <div className="al-content">{children}</div>
      </div>
      {overlay}
    </div>
  );
}

const shortDate = (at: number) => {
  const date = new Date(at);
  const now = new Date();
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return date.toDateString() === now.toDateString()
    ? `today ${time}`
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function statusChip(item: PaymentItem) {
  if (item.error) return <span className="al-chip is-no">Refused</span>;
  switch (item.record?.status) {
    case "AWAITING_USER":
      return <span className="al-chip is-hold">On hold</span>;
    case "IN_REVIEW":
      return <span className="al-chip is-hold">In review</span>;
    case "DECLINED":
      return <span className="al-chip is-no">Declined</span>;
    default:
      return null;
  }
}

export function ActivityList({ items }: { items: PaymentItem[] }) {
  if (!items.length)
    return (
      <p className="al-empty">
        Your payments show up here, each one checked as it happens.
      </p>
    );

  return (
    <div data-testid="alder-activity">
      {items.map((item) => {
        const inbound = isInbound(item.kind);

        return (
          <div key={item.key} className="al-row">
            <span
              aria-hidden
              className="al-merch"
              style={{ background: item.color ?? "#6D28D9" }}
            >
              {item.counterparty.charAt(0)}
            </span>
            <span className="x">
              <b>{item.counterparty}</b>
              <span>
                {item.detail ?? (inbound ? "Transfer in" : "Transfer")} ·{" "}
                {shortDate(item.at)}
              </span>
            </span>
            <span className={`al-amt${inbound ? " is-in" : ""}`}>
              {inbound ? "+" : "-"}
              {formatMoney(item.amount)}
              {statusChip(item)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Balance({
  amount,
  pending,
}: {
  amount: number;
  /** Shown while Didit has not answered for the account yet. */
  pending?: boolean;
}) {
  const { whole, cents } = splitMoney(amount);

  return (
    <b data-testid="alder-balance">
      {pending ? "…" : whole}
      <em>{pending ? "" : cents} EUR</em>
    </b>
  );
}

export function HomeView({
  name,
  balance,
  activity,
  onSend,
  onAddMoney,
  onSeeAll,
}: {
  name: string;
  balance: number;
  activity: PaymentItem[];
  onSend(): void;
  onAddMoney(): void;
  onSeeAll(): void;
}) {
  const month = new Date().toLocaleDateString("en-US", { month: "long" });
  const spent = activity
    .filter(
      (item) =>
        !isInbound(item.kind) &&
        item.kind === "card_payment" &&
        item.record?.status === "APPROVED",
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const bars = activity
    .filter((item) => item.kind === "card_payment")
    .slice(0, 8)
    .reverse();
  const top = Math.max(1, ...bars.map((item) => item.amount));

  return (
    <div className="al-home">
      <div className="al-col">
        <div className="al-card al-bal">
          <small>
            Main account · EUR <span className="al-chip is-neu">DE89 •••• 4021</span>
          </small>
          <span className="al-bal-row">
            <span data-callout="balance">
              <Balance amount={balance} />
            </span>
          </span>
          <div className="al-acts">
            <button className="al-btn is-pri" type="button" onClick={onSend}>
              <Send aria-hidden size={17} />
              Send
            </button>
            <button className="al-btn" type="button" onClick={onAddMoney}>
              <Plus aria-hidden size={17} />
              Add money
            </button>
            <button className="al-btn al-desk" type="button" onClick={onAddMoney}>
              <Repeat aria-hidden size={17} />
              Exchange
            </button>
            <button
              aria-label="More"
              className="al-btn al-desk is-icon"
              type="button"
              onClick={onAddMoney}
            >
              <MoreHorizontal aria-hidden size={18} />
            </button>
          </div>
        </div>
        <div className="al-card">
          <h2 className="al-h2">
            Recent activity
            <button className="al-link" type="button" onClick={onSeeAll}>
              See all
            </button>
          </h2>
          <ActivityList items={activity.slice(0, 5)} />
        </div>
      </div>
      <div className="al-col is-side">
        <DebitCard name={name} />
        <div className="al-card al-desk">
          <h2 className="al-h2">Spent in {month}</h2>
          <b className="al-big">{formatMoney(spent)}</b>
          <div aria-hidden className="al-bars">
            {bars.map((item, index) => (
              <i
                key={item.key}
                className={index === bars.length - 1 ? "is-hi" : index % 2 ? "is-on" : ""}
                style={{ height: `${Math.max(14, (item.amount / top) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PendingHome({
  status,
  busy,
  onVerify,
}: {
  status: "start" | "open" | "checking" | "review" | "declined";
  busy: boolean;
  onVerify(): void;
}) {
  const steps: { label: string; state: string; chip: string }[] = [
    { label: "Your account", state: "Done", chip: "" },
    {
      label: "Your ID, a selfie and a quick screening",
      state:
        status === "review"
          ? "In review"
          : status === "declined"
            ? "Declined"
            : status === "checking"
              ? "Checking"
              : "In progress",
      chip:
        status === "declined" ? "is-no" : status === "start" ? "is-neu" : "is-hold",
    },
    { label: "Your IBAN and virtual card", state: "Next", chip: "is-neu" },
  ];

  return (
    <div className="al-home">
      <div className="al-col">
        <div className="al-card al-steps" data-testid="alder-onboarding">
          <h2 className="al-h2">Finish opening your account</h2>
          {steps.map((step) => (
            <div key={step.label} className="al-step-row">
              <span>{step.label}</span>
              <span className={`al-chip ${step.chip}`}>{step.state}</span>
            </div>
          ))}
          <p className="al-muted">
            {status === "review"
              ? "We are checking a few details. Your IBAN goes live as soon as that is done."
              : status === "declined"
                ? "We could not verify your identity, so we cannot open this account."
                : "Banks must check who you are before your IBAN goes live. It takes about two minutes."}
          </p>
          {status === "declined" || status === "review" ? null : (
            <button
              className="al-btn is-pri"
              disabled={busy}
              type="button"
              onClick={onVerify}
            >
              {status === "checking" ? "Checking…" : "Verify your identity"}
            </button>
          )}
        </div>
      </div>
      <div className="al-col is-side">
        <div className="al-card al-locked">
          <DebitCard className="is-locked" name="Your name" />
          <p className="al-muted">Your card appears here once you are verified.</p>
        </div>
      </div>
    </div>
  );
}

export function PaymentsView({
  balance,
  children,
}: {
  balance: number;
  children: React.ReactNode;
}) {
  return (
    <div className="al-home">
      <div className="al-col">{children}</div>
      <div className="al-col is-side">
        <div className="al-card">
          <h2 className="al-h2">From</h2>
          <p className="al-from">
            <b>Main account</b> {formatMoney(balance)}
          </p>
          <p className="al-muted">Instant SEPA, arrives in seconds. Free.</p>
        </div>
      </div>
    </div>
  );
}

export interface SecurityAttempt {
  at: number;
  device: string;
  botScore: number | null;
  decision: string;
}

export function SecurityView({
  attempt,
  device,
  signIn,
  onSecure,
  onItWasMe,
}: {
  attempt: SecurityAttempt | null;
  device: string | null;
  signIn: string;
  onSecure(): void;
  onItWasMe(): void;
}) {
  const at = (value: number) =>
    new Date(value).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="al-sec-page">
      {attempt ? (
        <div className="al-card al-blocked" data-testid="alder-blocked">
          <div className="al-blocked-h">
            <span aria-hidden className="al-blocked-ic" data-callout="blocked">
              <ShieldBan size={24} />
            </span>
            <span>
              <h2>We blocked a sign-in to your account</h2>
              <p>Today at {at(attempt.at)}. Nobody got in, and no money moved.</p>
            </span>
            <span className="al-chip is-no">Blocked</span>
          </div>
          <div className="al-tiles">
            <span>
              <small>Device</small>
              <b>{attempt.device}</b>
            </span>
            <span>
              <small>Bot score</small>
              <b>
                {attempt.botScore === null ? "Not read" : attempt.botScore.toFixed(2)}
              </b>
            </span>
            <span>
              <small>Didit decision</small>
              <b>{attempt.decision}</b>
            </span>
            <span>
              <small>Why</small>
              <b>Passkey check failed</b>
            </span>
          </div>
          <div className="al-acts">
            <button className="al-btn is-pri" type="button" onClick={onSecure}>
              This wasn&apos;t me, secure my account
            </button>
            <button className="al-btn" type="button" onClick={onItWasMe}>
              It was me
            </button>
          </div>
        </div>
      ) : null}
      <div className="al-two">
        <div className="al-card">
          <h2 className="al-h2">Your devices</h2>
          <div className="al-row">
            <span aria-hidden className="al-merch is-soft">
              <Monitor size={18} />
            </span>
            <span className="x">
              <b>{device ?? "This browser"}</b>
              <span>{signIn}</span>
            </span>
            <span className="al-chip">This device</span>
          </div>
        </div>
        <div className="al-card">
          <h2 className="al-h2">Recent sign-ins</h2>
          {attempt ? (
            <div className="al-row">
              <span aria-hidden className="al-merch is-red">
                <ShieldBan size={18} />
              </span>
              <span className="x">
                <b>Sign-in without the passkey</b>
                <span>Today {at(attempt.at)} · blocked</span>
              </span>
              <span className="al-chip is-no">Blocked</span>
            </div>
          ) : null}
          <div className="al-row">
            <span aria-hidden className="al-merch is-green">
              {/^passkey/i.test(signIn) ? <KeyRound size={18} /> : <Smartphone size={18} />}
            </span>
            <span className="x">
              <b>{device ?? "This browser"}</b>
              <span>{signIn}</span>
            </span>
            <span className="al-chip">You</span>
          </div>
        </div>
      </div>
    </div>
  );
}

