"use client";

import type { ChapterId } from "@/lib/marketplace/guide";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { Container } from "@website/components/ui/container";

import { BuyerChapter } from "./buyer-chapter";
import { DiditPanel } from "./didit-panel";
import { FraudChapter } from "./fraud-chapter";
import { MarketProvider, useMarket } from "./market-context";
import { OperatorChapter } from "./operator-chapter";
import { PayoutsChapter } from "./payouts-chapter";
import { SellerChapter } from "./seller-chapter";
import { ActionButton, Notice } from "./ui";

import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/marketplace/catalog";
import { GUIDE, getChapter, isChapterId } from "@/lib/marketplace/guide";

type Theme = "light" | "dark";

const THEME_KEY = "didit-marketplace-theme";

/** Light by default, dark when the visitor's system asks for it or they pick it. */
function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);

    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  const choose = React.useCallback((next: Theme) => {
    setTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  }, []);

  return [theme, choose];
}

const CHAPTERS: Record<ChapterId, () => React.ReactElement> = {
  seller: SellerChapter,
  buyer: BuyerChapter,
  payouts: PayoutsChapter,
  fraud: FraudChapter,
  operator: OperatorChapter,
};

function ChapterTabs() {
  const market = useMarket();

  return (
    <nav aria-label="Chapters" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ol className="m-0 flex min-w-max list-none gap-1.5 p-0">
        {GUIDE.map((chapter) => {
          const active = chapter.id === market.chapter;

          return (
            <li key={chapter.id}>
              <button
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-pill border px-3.5 text-[13px] font-medium transition-colors duration-fast",
                  active
                    ? "border-ink bg-ink text-canvas"
                    : "border-line bg-canvas text-muted hover:bg-surface hover:text-ink",
                )}
                type="button"
                onClick={() => market.setChapter(chapter.id)}
              >
                <span
                  className={cn(
                    "tnum flex size-5 items-center justify-center rounded-pill text-[11px]",
                    active ? "bg-canvas/20" : "bg-ink/[0.06]",
                  )}
                >
                  {chapter.number}
                </span>
                <span className="hidden sm:inline">{chapter.title}</span>
                <span className="sm:hidden">{chapter.short}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function GuideSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const market = useMarket();
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] md:hidden">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        aria-labelledby="mkt-guide-sheet-title"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-lg border-t border-line bg-canvas px-5 pb-8 pt-3 shadow-lg animate-modal-in"
        role="dialog"
        tabIndex={-1}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="mx-auto block h-1 w-10 rounded-pill bg-line" />
        </div>
        <button
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-pill bg-ink/[0.06] text-muted"
          type="button"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
        <DiditPanel
          chapter={getChapter(market.chapter)}
          headingId="mkt-guide-sheet-title"
        />
      </div>
    </div>
  );
}

function Shell({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  const market = useMarket();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [guideExpanded, setGuideExpanded] = React.useState(false);
  const Chapter = CHAPTERS[market.chapter];
  const guide = getChapter(market.chapter);
  const view = market.view;

  return (
    <div
      className={cn(
        "mkt-theme min-h-[80vh] pb-24 md:pb-16",
        theme === "dark" && "mkt-dark",
      )}
      data-theme={theme}
    >
      <div className="border-b border-line bg-surface">
        <Container className="pb-6 pt-8 sm:pt-10" size="xl">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="eyebrow eyebrow-accent mb-3 inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" />
                Didit demo · Marketplace
              </p>
              <h1 className="m-0 text-[30px] font-display leading-[1.05] tracking-tighter text-ink sm:text-[40px]">
                {BRAND.name}
              </h1>
              <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
                {BRAND.tagline} Sellers are verified as businesses before they
                get paid, big orders ask the buyer to verify, and every order,
                payout and sign-up is monitored - live, against Didit staging.
              </p>
            </div>
            <div className="flex flex-none items-center gap-2">
              <button
                aria-label={
                  theme === "dark" ? "Switch to light" : "Switch to dark"
                }
                className="mkt-btn-ghost size-10"
                title={theme === "dark" ? "Light theme" : "Dark theme"}
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </button>
              <ActionButton
                busy={market.busy === "reset"}
                className="h-10 px-3.5 text-[13px]"
                disabled={!view?.sellers.length && !view?.buyer}
                variant="ghost"
                onClick={() => market.reset()}
              >
                <RotateCcw className="size-3.5" />
                Start over
              </ActionButton>
            </div>
          </div>

          <div className="mt-6">
            <ChapterTabs />
          </div>
        </Container>
      </div>

      <Container className="pt-6 sm:pt-8" size="xl">
        {view && !view.availability.transactions ? (
          <div className="mb-5">
            <Notice
              title="This demo runs on staging"
              tone="review"
            >
              It verifies real businesses and people against the demo
              organization on Didit staging. Open it at{" "}
              <a
                className="font-medium underline"
                href={view.stagingUrl}
              >
                {view.stagingUrl.replace(/^https:\/\//, "")}
              </a>
              .
            </Notice>
          </div>
        ) : null}
        {market.error?.scope === "page" || market.error?.scope === "flow" ? (
          <div className="mb-5">
            <Notice
              action={
                <button
                  aria-label="Dismiss"
                  className="flex size-7 items-center justify-center rounded-pill hover:bg-ink/[0.08]"
                  type="button"
                  onClick={market.clearError}
                >
                  <X className="size-3.5" />
                </button>
              }
              tone="declined"
            >
              {market.error.message}
            </Notice>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0" id="mkt-chapter">
            <div className="mb-5">
              <p className="eyebrow eyebrow-muted mb-1.5">
                Chapter {guide.number} of {GUIDE.length}
              </p>
              <h2 className="m-0 text-2xl font-medium tracking-tight text-ink">
                {guide.title}
              </h2>
            </div>
            {market.loading ? (
              <div className="mkt-card h-64 animate-pulse bg-surface" />
            ) : (
              <Chapter />
            )}

            {/* Tablet: the guide folds under the chapter. */}
            <div className="mkt-card mt-6 hidden md:block lg:hidden">
              <button
                aria-controls="mkt-guide-inline"
                aria-expanded={guideExpanded}
                className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-medium text-ink"
                type="button"
                onClick={() => setGuideExpanded((open) => !open)}
              >
                <BookOpen className="size-4 text-blue" />
                <span className="flex-1">How this uses Didit</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted transition-transform duration-fast",
                    guideExpanded && "rotate-180",
                  )}
                />
              </button>
              {guideExpanded ? (
                <div className="border-t border-line px-5 pb-5 pt-4" id="mkt-guide-inline">
                  <DiditPanel chapter={guide} />
                </div>
              ) : null}
            </div>
          </main>

          {/* Desktop: the guide sits beside the chapter. */}
          <aside
            aria-labelledby="mkt-guide-title"
            className="hidden lg:block"
          >
            <div className="mkt-card sticky top-24 p-5">
              <DiditPanel chapter={guide} headingId="mkt-guide-title" />
            </div>
          </aside>
        </div>
      </Container>

      {/* Phone: the guide is a bottom sheet. */}
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          className="mkt-btn-ink h-11 w-full"
          type="button"
          onClick={() => setSheetOpen(true)}
        >
          <BookOpen className="size-4" />
          How this uses Didit
        </button>
      </div>
      <GuideSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

/**
 * The marketplace demo: one page, five chapters, every control live.
 * `?chapter=` deep-links a chapter so a walkthrough can start anywhere.
 */
export function MarketplaceDemo() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("chapter");
  const [theme, setTheme] = useTheme();

  const onChapterChange = React.useCallback(
    (chapter: ChapterId) => {
      router.replace(`${pathname}?chapter=${chapter}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pathname, router],
  );

  return (
    <MarketProvider
      initialChapter={isChapterId(requested) ? requested : "seller"}
      onChapterChange={onChapterChange}
    >
      <Shell setTheme={setTheme} theme={theme} />
    </MarketProvider>
  );
}
