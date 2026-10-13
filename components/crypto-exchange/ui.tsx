"use client";

import type { Tone } from "@/lib/crypto-exchange/transactions";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Small pieces every Kestrel screen shares. Colours come from the site's token
 * sheet only; the dark theme swaps the tokens themselves (see
 * styles/crypto-exchange.css), so nothing here needs a `dark:` variant.
 */

export const TONE: Record<
  Tone,
  { chip: string; dot: string; text: string; surface: string }
> = {
  approved: {
    chip: "bg-success-bg text-success",
    dot: "bg-success",
    text: "text-success",
    surface: "bg-success-bg border-success/30",
  },
  review: {
    chip: "bg-warning-bg text-warning",
    dot: "bg-warning",
    text: "text-warning",
    surface: "bg-warning-bg border-warning/30",
  },
  declined: {
    chip: "bg-danger-bg text-danger",
    dot: "bg-danger",
    text: "text-danger",
    surface: "bg-danger-bg border-danger/30",
  },
  neutral: {
    chip: "bg-elevated text-muted",
    dot: "bg-table-head",
    text: "text-muted",
    surface: "bg-surface border-line",
  },
};

export function StatusChip({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-xs font-medium",
        TONE[tone].chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-pill", TONE[tone].dot)} />
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-4 flex-none animate-spin rounded-pill border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

/** 0-100 risk score on a five-step scale, coloured by band. */
export function RiskMeter({
  score,
  tone,
}: {
  score: number | null;
  tone: Tone;
}) {
  const filled = score === null ? 0 : Math.max(1, Math.ceil(score / 20));

  return (
    <div aria-hidden className="flex gap-1">
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={cn(
            "h-1.5 w-7 rounded-pill",
            step <= filled ? TONE[tone].dot : "bg-elevated",
          )}
        />
      ))}
    </div>
  );
}

export function formatEth(value: number | string, { sign = false } = {}) {
  const amount = typeof value === "string" ? Number(value) : value;
  const text = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  if (!sign) return `${amount < 0 ? "-" : ""}${text} ETH`;

  return `${amount < 0 ? "-" : "+"}${text} ETH`;
}

export function formatUsd(value: string | null) {
  if (!value) return null;

  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Kestrel's mark: a fictional exchange, so a simple geometric glyph. */
export function KestrelMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="rgb(var(--blue))" height="32" rx="9" width="32" />
      <path
        d="M10 8v16M10 16.5 20.5 8M13.6 13.6 21 24"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function Notice({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border px-4 py-3 text-[13px] leading-5",
        TONE[tone].surface,
        tone === "neutral" ? "text-muted" : TONE[tone].text,
      )}
      role={tone === "declined" ? "alert" : undefined}
    >
      {children}
    </div>
  );
}

const RADIO_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Keyboard behaviour of a `role="radiogroup"` made of buttons: the arrow keys
 * move both the selection and the focus, wrapping at either end. Pair it with
 * `tabIndex={checked ? 0 : -1}` on each radio so the group is one Tab stop.
 */
export function onRadioGroupKeyDown<T>(
  event: React.KeyboardEvent<HTMLElement>,
  values: readonly T[],
  value: T,
  onChange: (value: T) => void,
) {
  const step = RADIO_STEP[event.key];

  if (!step) return;
  event.preventDefault();
  const next = (values.indexOf(value) + step + values.length) % values.length;

  onChange(values[next]);
  event.currentTarget
    .querySelectorAll<HTMLElement>('[role="radio"]')
    [next]?.focus();
}
