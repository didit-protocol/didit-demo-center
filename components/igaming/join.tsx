"use client";

import type { Aurora } from "./use-aurora";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleX,
  type LucideIcon,
  MapPin,
  ScanFace,
  Timer,
} from "lucide-react";

import { Notice, Spinner, StatusPill } from "./ui";

import {
  OPERATOR_NAME,
  type Tone,
  licensedMarket,
  sessionView,
} from "@/lib/igaming/policy";
import { cn } from "@/lib/utils";

const STEPS = ["Your details", "Age check", "Play"];

function stepStyle(index: number, current: number): string {
  if (index < current) return "bg-success text-canvas";
  if (index === current) return "bg-ink text-canvas";

  return "bg-surface text-muted";
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="m-0 flex list-none items-center gap-2 p-0">
      {STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-pill text-[11px] font-semibold",
              stepStyle(index, current),
            )}
          >
            {index + 1}
          </span>
          <span
            className={cn(
              "hidden text-xs font-medium sm:inline",
              index === current ? "text-ink" : "text-muted",
            )}
          >
            {step}
          </span>
          {index < STEPS.length - 1 ? (
            <span className="h-px w-5 bg-line" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Registration: name, email, the 18+ declaration, then the age check. */
export function JoinCard({
  aurora,
  onCancel,
}: {
  aurora: Aurora;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(aurora.state?.name ?? "");
  const [email, setEmail] = React.useState(aurora.state?.email ?? "");
  const [adult, setAdult] = React.useState(false);
  const busy = aurora.busy === "join";
  const ready =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    adult;

  return (
    <form
      className="ig-card mx-auto flex w-full max-w-[520px] flex-col gap-5 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) void aurora.join(name.trim(), email.trim());
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <Stepper current={0} />
        <button
          className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
          type="button"
          onClick={onCancel}
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Lobby
        </button>
      </div>
      <div>
        <h2 className="m-0 text-2xl font-display tracking-display text-ink">
          Create your {OPERATOR_NAME} account
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Next comes a quick selfie: Didit estimates your age in seconds and
          only asks for an ID if the estimate is close to 18.
        </p>
      </div>

      {aurora.secondPending ? (
        <Notice tone="info">
          Second account on this device. Register with any other name: when it
          claims the welcome bonus, Didit sees the same device fingerprint as
          the first account.
        </Notice>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink">Full name</span>
        <input
          autoComplete="name"
          className="ig-input"
          maxLength={80}
          name="name"
          placeholder="Alex Morgan"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink">Email</span>
        <input
          autoComplete="email"
          className="ig-input"
          maxLength={120}
          name="email"
          placeholder="alex@example.com"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <span className="text-xs text-muted">
          Stored on your Didit user. The demo never sends email.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-[13px] leading-5 text-ink">
        <input
          checked={adult}
          className="mt-0.5 size-4 flex-none accent-[rgb(var(--blue))]"
          type="checkbox"
          onChange={(event) => setAdult(event.target.checked)}
        />
        I am 18 or over and accept the terms. I understand {OPERATOR_NAME} will
        check my age and location.
      </label>

      {aurora.notice?.tone === "error" ? (
        <Notice tone="declined">{aurora.notice.text}</Notice>
      ) : null}

      <button
        className="ig-btn ig-btn-primary h-11 w-full"
        disabled={!ready || busy || !aurora.sdkReady}
        type="submit"
      >
        {busy ? <Spinner /> : <ScanFace aria-hidden className="size-4" />}
        Continue to age check
      </button>
    </form>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-40 flex-none text-[13px] text-muted">{label}</span>
      <span className="min-w-0 flex-1 text-sm font-medium text-ink">
        {value}
      </span>
      {children}
    </div>
  );
}

const RESULT_ICON: Record<Tone, { Icon: LucideIcon; className: string }> = {
  approved: { Icon: CircleCheck, className: "bg-success-bg text-success" },
  declined: { Icon: CircleX, className: "bg-danger-bg text-danger" },
  review: { Icon: Timer, className: "bg-surface text-muted" },
  info: { Icon: Timer, className: "bg-surface text-muted" },
  neutral: { Icon: Timer, className: "bg-surface text-muted" },
};

/** What the player can do next, by the age check's outcome. */
function AgeActions({ aurora, tone }: { aurora: Aurora; tone: Tone }) {
  const checking = aurora.busy === "age";

  if (tone === "approved")
    return (
      <button
        className="ig-btn ig-btn-primary pl-5 pr-3"
        type="button"
        onClick={aurora.enterLobby}
      >
        Enter the lobby
        <ArrowRight aria-hidden className="size-5" />
      </button>
    );
  if (tone === "declined")
    return (
      <button
        className="ig-btn ig-btn-quiet"
        type="button"
        onClick={aurora.reset}
      >
        Start over
      </button>
    );
  if (tone === "review")
    return (
      <button
        className="ig-btn ig-btn-quiet"
        disabled={checking}
        type="button"
        onClick={() => aurora.checkAge()}
      >
        {checking ? <Spinner /> : null}
        Check again
      </button>
    );

  return (
    <>
      <button
        className="ig-btn ig-btn-primary"
        disabled={!aurora.sdkReady}
        type="button"
        onClick={() => aurora.resumeAge()}
      >
        <ScanFace aria-hidden className="size-4" />
        Continue the age check
      </button>
      <button
        className="ig-btn ig-btn-quiet"
        type="button"
        onClick={() => void aurora.retryAge()}
      >
        Start a new check
      </button>
    </>
  );
}

/** What the age check decided, and the location it saw. */
export function AgeResult({ aurora }: { aurora: Aurora }) {
  const state = aurora.state;
  const age = state?.age;
  const summary = age?.summary ?? null;
  const checking = aurora.busy === "age";

  if (!state || !age) return null;

  if (!summary) {
    return (
      <div className="ig-card mx-auto flex w-full max-w-[520px] flex-col gap-5 p-6">
        <Stepper current={1} />
        <div>
          <h2 className="m-0 text-2xl font-display tracking-display text-ink">
            {checking ? "Reading your result" : "Finish your age check"}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            {checking
              ? "Didit is returning the decision for your session."
              : "The age check opens in a secure Didit window. Take the selfie there, then come back here."}
          </p>
        </div>
        {aurora.notice ? (
          <Notice tone={aurora.notice.tone === "error" ? "declined" : "info"}>
            {aurora.notice.text}
          </Notice>
        ) : null}
        <div className="flex flex-wrap gap-2.5">
          <button
            className="ig-btn ig-btn-primary"
            disabled={checking || !aurora.sdkReady}
            type="button"
            onClick={() => aurora.resumeAge()}
          >
            <ScanFace aria-hidden className="size-4" />
            Open the age check
          </button>
          <button
            className="ig-btn ig-btn-quiet"
            disabled={checking}
            type="button"
            onClick={() => aurora.checkAge()}
          >
            {checking ? <Spinner /> : null}I&apos;ve finished
          </button>
        </div>
      </div>
    );
  }

  const view = sessionView("age", summary.status);
  const approved = view.tone === "approved";
  const market = licensedMarket(summary.ip?.countryCode);
  const { Icon, className: iconStyle } = RESULT_ICON[view.tone];
  const firstName = state.name.split(" ")[0];

  return (
    <div className="ig-card mx-auto flex w-full max-w-[560px] flex-col gap-5 p-6">
      <Stepper current={approved ? 2 : 1} />
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "flex size-11 flex-none items-center justify-center rounded-sm",
            iconStyle,
          )}
        >
          <Icon aria-hidden className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-2xl font-display tracking-display text-ink">
            {approved ? `You're in, ${firstName}` : "Age check: " + view.label}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">{view.message}</p>
        </div>
      </div>

      <div className="rounded-xs border border-line px-4">
        <Row
          label="Didit decision"
          value={<StatusPill tone={view.tone}>{summary.status}</StatusPill>}
        />
        <Row
          label="Estimated age"
          value={
            summary.estimatedAge !== null
              ? `${summary.estimatedAge} years`
              : "Not estimated"
          }
        />
        {summary.documentAge !== null ? (
          <Row label="Age on ID" value={`${summary.documentAge} years`} />
        ) : null}
        <Row
          label="Playing from"
          value={
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5 text-muted" />
              {summary.ip?.country ?? "Unknown"}
            </span>
          }
        >
          {summary.ip ? (
            <StatusPill tone={market ? "approved" : "review"}>
              {market ? `Licensed (${market.regulator})` : "Not licensed"}
            </StatusPill>
          ) : null}
        </Row>
        {summary.ip?.isVpnOrTor || summary.ip?.isDataCenter ? (
          <Row
            label="Network"
            value={[
              summary.ip.isVpnOrTor ? "VPN or Tor" : null,
              summary.ip.isDataCenter ? "Data-centre IP" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <StatusPill tone="review">Flagged</StatusPill>
          </Row>
        ) : null}
      </div>

      {approved && summary.ip && !market ? (
        <Notice tone="review">
          {OPERATOR_NAME} is not licensed in{" "}
          {summary.ip.country ?? "this country"}. A live operator stops
          real-money play here; the demo carries on so you can see the rest, and
          Didit scores every cashier action from this IP.
        </Notice>
      ) : null}

      {aurora.notice ? (
        <Notice tone={aurora.notice.tone === "error" ? "declined" : "info"}>
          {aurora.notice.text}
        </Notice>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <AgeActions aurora={aurora} tone={view.tone} />
      </div>
    </div>
  );
}
