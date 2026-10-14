"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/** Alder's mark: a fictional brand, drawn here so it ships no asset. */
export function BankMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "inverted";
}) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 32 32">
      <rect
        className={tone === "brand" ? "fill-blue" : "fill-white/20"}
        height="32"
        rx="9"
        width="32"
      />
      <path
        d="M9 23.5V8.5m0 8.2 9.8-8.2M13.4 13.2l8.6 10.3"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}

/**
 * The bank app itself: a phone-width card with the brand bar on top. On a
 * phone it is simply the page; on larger screens it sits beside the "How this
 * uses Didit" panel so both sides of the integration are visible at once.
 */
export function BankFrame({
  holder,
  children,
}: {
  /** The account holder's name once the account exists. */
  holder: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslations("Fintech");
  const initials = holder
    ? holder
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : null;

  return (
    <div
      aria-label={t("bank.name")}
      className="flex min-h-[660px] flex-col overflow-hidden rounded-lg border border-line bg-canvas shadow-md"
      role="region"
    >
      <div className="flex flex-none items-center gap-2.5 border-b border-line px-5 py-3.5">
        <BankMark className="size-7" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[15px] font-semibold leading-[18px] tracking-tight text-ink">
            {t("bank.name")}
          </p>
          <p className="m-0 text-[11px] leading-[14px] text-muted">
            {t("bank.fictional")}
          </p>
        </div>
        {initials ? (
          <span
            aria-hidden
            className="flex size-8 flex-none items-center justify-center rounded-pill bg-elevated text-xs font-semibold text-ink"
          >
            {initials}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">{children}</div>
    </div>
  );
}

export type Theme = "light" | "dark";

const THEME_KEY = "fintech-demo-theme";

/**
 * The demo's own light/dark switch. It starts from the visitor's system
 * preference and remembers a manual choice; it only ever themes the demo
 * area, never the site chrome.
 */
export function useDemoTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);

    if (saved === "light" || saved === "dark") {
      setTheme(saved);

      return;
    }
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  const choose = React.useCallback((next: Theme) => {
    setTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  }, []);

  return [theme, choose];
}

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const t = useTranslations("Fintech");
  const options = [
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
  ] as const;

  return (
    <div
      aria-label={t("page.theme.label")}
      className="inline-flex h-9 items-center gap-0.5 rounded-pill border border-line bg-surface p-0.5"
      role="radiogroup"
    >
      {options.map(({ value, icon: Icon }) => (
        <button
          key={value}
          aria-checked={theme === value}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium transition-colors duration-fast",
            theme === value
              ? "bg-canvas text-ink shadow-sm"
              : "text-muted hover:text-ink",
          )}
          role="radio"
          type="button"
          onClick={() => onChange(value)}
        >
          <Icon aria-hidden className="size-3.5" />
          {t(`page.theme.${value}`)}
        </button>
      ))}
    </div>
  );
}
