"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@website/i18n/navigation";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@website/components/ui/popover";
import { type Locale } from "@website/lib/site";
import { cn } from "@website/lib/utils";
import { useTranslations } from "next-intl";

interface LocaleEntry {
  code: Locale;
  /** Primary label — the language in its own script, so a native speaker
   *  recognises it instantly. */
  native: string;
  /** Quiet English endonym shown beside the native name as a cross-script
   *  aid (the macOS / iOS language-picker pattern). Empty when it would just
   *  repeat the native name (English). */
  english: string;
}

// One calm list, native-script first. The English endonym is a muted aid so a
// reader can find their language whether or not they read the native script.
// No two-letter ISO pills — they were developer-debug noise, not buyer clarity.
const LOCALE_ENTRIES: LocaleEntry[] = [
  { code: "en", native: "English", english: "" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "fr", native: "Français", english: "French" },
  { code: "ca", native: "Català", english: "Catalan" },
  { code: "pt-BR", native: "Português (BR)", english: "Portuguese" },
  { code: "pt-PT", native: "Português (PT)", english: "Portuguese" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian" },
  { code: "sw", native: "Kiswahili", english: "Swahili" },
  { code: "ar", native: "العربية", english: "Arabic" },
  { code: "zh", native: "中文", english: "Chinese" },
  { code: "ja", native: "日本語", english: "Japanese" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "ko", native: "한국어", english: "Korean" },
  { code: "ru", native: "Русский", english: "Russian" }
];

/**
 * Didit locale switcher — reductive, Apple-grade clarity on the Didit canvas.
 *
 * Trigger: a Globe glyph in a rounded pill (icon-only in the header, label +
 * globe in the footer / mobile drawer). Darkens on hover and while the
 * popover is open; a soft press-scale on tap.
 *
 * Popover: ONE quiet column on the white canvas. Each row is the language in
 * its native script with a muted English endonym beside it — no ISO pills, no
 * two-column grid. The active language fills with `blue-soft` and a single
 * Didit-Blue check (the one accent on the surface) and is auto-scrolled to the
 * centre when the menu opens, so you always land on where you are.
 *
 * Path-preserving: strips the current locale prefix and appends the new one
 * (or none for `en`, since `localePrefix: "as-needed"`). next-intl writes the
 * `NEXT_LOCALE` cookie so the middleware resolves the choice on the first
 * request — one soft navigation, no 307/308 bounce, no full reload.
 */
export interface LocaleSwitcherProps {
  /** Visual surface — default light pill works on canvas (header). */
  tone?: "default" | "ink";
  /** Popover side — header opens down, footer opens up. */
  side?: "top" | "bottom";
  /** Popover horizontal alignment. */
  align?: "start" | "center" | "end";
  /** Show the current locale's native label next to the globe. Footer-only. */
  showLabel?: boolean;
  /**
   * Full-width variant — the trigger stretches to fill its container and the
   * popover matches the trigger's width. Used inside the mobile menu drawer
   * where the picker reads as a list-item, not an icon pill.
   */
  fullWidth?: boolean;
}

export function LocaleSwitcher({
  tone = "default",
  side = "bottom",
  align = "end",
  showLabel = false,
  fullWidth = false
}: LocaleSwitcherProps = {}) {
  const tI18n = useTranslations("translation_v1.localeswitcher");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const isInk = tone === "ink";

  const scrollRef = React.useRef<HTMLUListElement>(null);
  const activeRowRef = React.useRef<HTMLButtonElement>(null);

  const onPick = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    // `pathname` is the locale-stripped route from next-intl's usePathname
    // (e.g. "/pricing/"); passing `{ locale }` makes next-intl build the
    // correctly-prefixed, trailing-slashed URL AND write NEXT_LOCALE itself,
    // so the middleware resolves the chosen locale on the first try.
    router.replace(pathname, { locale: next });
  };

  const current = LOCALE_ENTRIES.find((e) => e.code === locale) ?? LOCALE_ENTRIES[0];

  // On open, centre the current language in the scroll viewport so the user
  // always lands on where they are — no hunting through 15 rows. rAF waits for
  // the portal'd content to lay out before measuring.
  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const row = activeRowRef.current;
      if (!container || !row) return;
      const cRect = container.getBoundingClientRect();
      const rRect = row.getBoundingClientRect();
      container.scrollTop +=
        rRect.top - cRect.top - (container.clientHeight - row.clientHeight) / 2;
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const renderRow = (entry: LocaleEntry) => {
    const active = entry.code === locale;
    return (
      <li key={entry.code} role="presentation">
        <button
          ref={active ? activeRowRef : undefined}
          id={`locale-opt-${entry.code}`}
          type="button"
          role="option"
          aria-selected={active}
          lang={entry.code}
          onClick={() => onPick(entry.code)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors duration-fast focus:outline-none",
            active ? "bg-blue-soft" : "hover:bg-black/[0.045] focus-visible:bg-black/[0.06]"
          )}
        >
          <span
            dir="auto"
            className={cn(
              "min-w-0 flex-1 truncate text-[14px] tracking-[-0.005em]",
              active ? "font-medium text-blue" : "text-ink"
            )}
          >
            {entry.native}
          </span>
          {entry.english ? (
            <span
              className={cn(
                "shrink-0 text-[12.5px] tracking-[-0.005em]",
                active ? "text-blue/60" : "text-muted"
              )}
            >
              {entry.english}
            </span>
          ) : null}
          <span className="flex w-4 shrink-0 items-center justify-center" aria-hidden>
            {active ? <Check className="size-4 text-blue" /> : null}
          </span>
        </button>
      </li>
    );
  };

  return (
    <Popover data-didit-component="locale-switcher" open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Change language. Current language: ${current.native}.`}
          className={cn(
            "inline-flex h-10 items-center transition-[background-color,transform] duration-fast focus-visible:shadow-ring focus-visible:outline-none active:scale-[0.97]",
            fullWidth
              ? // Full-width variant (mobile drawer) — list-item shape.
                "w-full justify-start gap-3 rounded-pill bg-black/[0.04] px-4 text-ink hover:bg-black/[0.08] data-[state=open]:bg-black/[0.08]"
              : cn(
                  "justify-center gap-2 rounded-pill",
                  showLabel ? "px-3.5" : "w-10",
                  isInk
                    ? "bg-canvas/[0.08] text-canvas hover:bg-canvas/[0.14] data-[state=open]:bg-canvas/[0.16]"
                    : "bg-black/[0.04] text-ink hover:bg-black/[0.08] data-[state=open]:bg-black/[0.08]"
                )
          )}
        >
          {/* Globe glyph (other/global.svg) via CSS mask so it inherits the
              trigger's currentColor (ink on canvas, canvas on the ink footer). */}
          <span
            aria-hidden
            className={cn(
              "size-5 shrink-0 bg-current",
              fullWidth ? "text-ink/85" : isInk ? "text-canvas/85" : "text-ink/85"
            )}
            style={{
              WebkitMaskImage: "url(/icons/other/global.svg)",
              maskImage: "url(/icons/other/global.svg)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain"
            }}
          />
          {showLabel || fullWidth ? (
            <span
              className={cn(
                "text-[13.5px] font-medium",
                fullWidth ? "text-ink/90" : isInk ? "text-canvas/90" : "text-ink/90"
              )}
            >
              {current.native}
            </span>
          ) : (
            <span className="sr-only">{current.native}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={10}
        collisionPadding={12}
        className={cn(
          "rounded-editorial border-line p-1.5 shadow-lg",
          fullWidth
            ? "w-[var(--radix-popover-trigger-width)] bg-surface"
            : "w-[300px] max-w-[calc(100vw-1.5rem)] bg-canvas"
        )}
      >
        {/* Quiet eyebrow — the canonical Didit mono micro-label. */}
        <div className="px-2.5 pb-1.5 pt-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          {tI18n("language")}
        </div>
        <ul
          ref={scrollRef}
          role="listbox"
          aria-label={tI18n("ariaLabel.language")}
          aria-activedescendant={`locale-opt-${current.code}`}
          className={cn(
            "flex flex-col gap-px overflow-y-auto overscroll-contain",
            // Thin, calm scrollbar — the list scrolls inside a fixed height
            // instead of pushing the popover past the navbar.
            "[scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5",
            fullWidth ? "max-h-[40vh]" : "max-h-[min(58vh,392px)]"
          )}
        >
          {LOCALE_ENTRIES.map(renderRow)}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
