"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { CircleAlert, Info, Loader2 } from "lucide-react";

import { VERDICT_STYLE } from "@/components/demo-center/tone";
import { cn } from "@/lib/utils";

/**
 * Small pieces every screen of the bank reuses. Colour always comes from the
 * demo centre's verdict tones (components/demo-center/tone.ts), so "held" is
 * the same amber here as "In Review" is in the catalogue.
 */
export type Tone = "approved" | "review" | "declined" | "neutral" | "info";

const TONE: Record<Tone, { surface: string; text: string; dot: string }> = {
  ...VERDICT_STYLE,
  info: { surface: "bg-blue-soft", text: "text-blue-deep", dot: "bg-blue" },
};

export function toneClasses(tone: Tone) {
  return TONE[tone];
}

/** The ring every custom control shows on keyboard focus, as `.btn-base` does. */
export const focusRing = "focus-visible:shadow-ring focus-visible:outline-none";

const ARROW_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Keyboard behaviour of a single-choice group (`role="radiogroup"`), as the
 * WAI-ARIA radio group pattern describes it: one Tab stop, on the chosen
 * option (the first one when none is chosen), and the arrow keys, Home and
 * End move the choice and the focus together. On a right-to-left page the
 * left and right arrows swap.
 */
export function useRadioGroup<T>(
  options: readonly T[],
  value: T | null,
  onChange: (value: T) => void,
) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const selected = value === null ? -1 : options.indexOf(value);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const current = refs.current.indexOf(event.currentTarget);
    let next: number | null = null;

    if (event.key in ARROW_STEP) {
      const rtl =
        getComputedStyle(event.currentTarget).direction === "rtl" &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight");
      const step = ARROW_STEP[event.key] * (rtl ? -1 : 1);

      next = (current + step + options.length) % options.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = options.length - 1;
    }
    if (next === null) return;

    event.preventDefault();
    onChange(options[next]);
    refs.current[next]?.focus();
  };

  return (index: number) => ({
    ref: (element: HTMLButtonElement | null) => {
      refs.current[index] = element;
    },
    role: "radio" as const,
    "aria-checked": index === selected,
    tabIndex: index === (selected >= 0 ? selected : 0) ? 0 : -1,
    onKeyDown,
  });
}

/** Euros in the visitor's language. */
export function useMoney() {
  const locale = useLocale();

  return React.useMemo(() => {
    const format = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    });

    return (amount: number) => format.format(amount);
  }, [locale]);
}

/** A short local time for an activity row. */
export function useWhen() {
  const locale = useLocale();

  return React.useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (iso: string) => (iso ? format.format(new Date(iso)) : "");
  }, [locale]);
}

export function Chip({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const style = TONE[tone];

  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 rounded-pill px-2.5 text-xs font-medium",
        style.surface,
        style.text,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-pill", style.dot)} />
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "info" | "declined" | "review";
  children: React.ReactNode;
}) {
  const style = TONE[tone];
  const Icon = tone === "info" ? Info : CircleAlert;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-sm px-3.5 py-3 text-[13px] leading-[18px]",
        style.surface,
        style.text,
      )}
      role={tone === "declined" ? "alert" : "status"}
    >
      <Icon aria-hidden className="mt-px size-4 flex-none" />
      <p className="m-0">{children}</p>
    </div>
  );
}

/** "Step 1 of 3" with its bar, shown above the onboarding screens. */
export function Progress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  return (
    <div className="mb-6">
      <p className="eyebrow eyebrow-muted mb-2.5">{label}</p>
      <div
        aria-label={label}
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={current}
        className="flex gap-1.5"
        role="progressbar"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-pill",
              i < current ? "bg-blue" : "bg-elevated",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ScreenTitle({
  title,
  body,
}: {
  title: string;
  body?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="m-0 text-balance text-[26px] font-display leading-[1.1] tracking-display text-ink">
        {title}
      </h2>
      {body ? (
        <p className="mt-2.5 text-pretty text-[15px] leading-[1.5] text-muted">
          {body}
        </p>
      ) : null}
    </div>
  );
}

/** Text input or select with its label and error, wired for screen readers. */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: React.ReactElement;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-ink" htmlFor={id}>
        {label}
      </label>
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error ? (
        <p className="m-0 text-xs text-danger" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-sm border border-line bg-canvas px-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-fast placeholder:text-table-head focus:border-blue focus:shadow-ring aria-[invalid=true]:border-danger";
