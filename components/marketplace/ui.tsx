"use client";

import type { StatusMeta, StatusTone } from "@/lib/marketplace/status";
import type { ConsoleLink as ConsoleLinkValue } from "@/lib/marketplace/console-links";

import * as React from "react";
import {
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The marketplace's small shared pieces. Colour comes only from the design
 * tokens, so every one of them follows the light and dark theme of the
 * `.mkt-theme` wrapper without a dark: variant.
 */

export const TONE_STYLE: Record<
  StatusTone,
  { pill: string; dot: string; text: string; icon: typeof CircleCheck }
> = {
  approved: {
    pill: "bg-success-bg text-success",
    dot: "bg-success",
    text: "text-success",
    icon: CircleCheck,
  },
  review: {
    pill: "bg-warning-bg text-warning",
    dot: "bg-warning",
    text: "text-warning",
    icon: Clock,
  },
  declined: {
    pill: "bg-danger-bg text-danger",
    dot: "bg-danger",
    text: "text-danger",
    icon: CircleX,
  },
  neutral: {
    pill: "bg-ink/[0.06] text-muted",
    dot: "bg-table-head",
    text: "text-muted",
    icon: Info,
  },
};

export function StatusPill({
  meta,
  className,
}: {
  meta: Pick<StatusMeta, "tone" | "label">;
  className?: string;
}) {
  const style = TONE_STYLE[meta.tone];

  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-xs font-medium",
        style.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-pill", style.dot)} />
      {meta.label}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Comp = "section",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <Comp className={cn("mkt-card p-5 sm:p-6", className)} {...rest}>
      {children}
    </Comp>
  );
}

export function CardHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h3 className="m-0 text-lg font-medium tracking-tight text-ink">
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 max-w-[640px] text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {aside}
    </div>
  );
}

export function Rows({
  rows,
}: {
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="m-0 divide-y divide-line">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 py-2.5 text-sm"
        >
          <dt className="flex-none text-muted">{row.label}</dt>
          <dd className="m-0 min-w-0 break-words text-right text-ink">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
  action,
}: {
  tone?: StatusTone;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const style = TONE_STYLE[tone];
  const Icon = tone === "declined" ? TriangleAlert : style.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xs px-4 py-3 text-sm",
        tone === "neutral" ? "bg-surface text-muted" : style.pill,
      )}
      role={tone === "declined" ? "alert" : undefined}
    >
      <Icon className="mt-0.5 size-4 flex-none" />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title ? <p className="m-0 font-medium">{title}</p> : null}
        <div className={tone === "neutral" ? "text-muted" : "opacity-90"}>
          {children}
        </div>
      </div>
      {action}
    </div>
  );
}

// Spelled out in full so Tailwind keeps every variant in the build.
const BUTTON_VARIANT = {
  primary: "mkt-btn-primary",
  ink: "mkt-btn-ink",
  muted: "mkt-btn-muted",
  ghost: "mkt-btn-ghost",
} as const;

export function ActionButton({
  busy,
  children,
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: keyof typeof BUTTON_VARIANT;
}) {
  return (
    <button
      aria-busy={busy || undefined}
      className={cn(BUTTON_VARIANT[variant], "h-10 px-4", className)}
      disabled={busy || rest.disabled}
      type="button"
      {...rest}
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

/** A link into Console v2, honest about whether it lands on the record. */
export function ConsoleLink({
  link,
  label,
  recordId,
}: {
  link: ConsoleLinkValue;
  label: string;
  recordId?: string;
}) {
  return (
    <a
      className="mkt-btn-ghost h-9 px-3.5 text-[13px]"
      href={link.href}
      rel="noreferrer"
      target="_blank"
      title={
        link.direct || !recordId
          ? undefined
          : `Opens the console home. Search for ${recordId}.`
      }
    >
      {label}
      <ExternalLink className="size-3.5" />
    </a>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 rounded-xs border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <code className="mkt-code">{children}</code>;
}
