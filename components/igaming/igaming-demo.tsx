"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Layers, LogOut, RotateCcw } from "lucide-react";
import { Container } from "@website/components/ui/container";

import { DiditPanel, type PanelTab } from "./didit-panel";
import { AgeResult, JoinCard } from "./join";
import { Lobby } from "./lobby";
import { PlayerHome } from "./player-home";
import { ThemeToggle, useDemoTheme } from "./theme";
import { Spinner } from "./ui";
import { useAurora } from "./use-aurora";

import { Modal } from "@/components/demo-center/modal";
import { OPERATOR_NAME, formatMoney } from "@/lib/igaming/policy";
import { cn } from "@/lib/utils";

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

function AuroraMark() {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="ig-mark size-6 rounded-pill" />
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        {OPERATOR_NAME}
      </span>
    </span>
  );
}

/**
 * /igaming: a fictional operator's casino and sportsbook, wired to Didit.
 *
 * Left, the product a prospect's players would use. Right (a drawer on
 * phones), what Didit does at each step, what the operator sees, and the log
 * of every call. Light and dark apply to this area only.
 */
export function IgamingDemo() {
  const aurora = useAurora();
  const theme = useDemoTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joining, setJoining] = React.useState(false);
  const [tab, setTab] = React.useState<PanelTab>("how");
  const [drawer, setDrawer] = React.useState(false);
  const { state, hydrated } = aurora;

  // The hosted flow redirects here when it finishes on another device.
  React.useEffect(() => {
    if (!hydrated) return;
    const sessionId = searchParams.get("verificationSessionId");

    if (!sessionId) return;
    aurora.resumeFromRedirect(sessionId);
    router.replace("/igaming", { scroll: false });
  }, [hydrated, searchParams]);

  const stage = !state
    ? joining || aurora.secondPending
      ? "join"
      : "lobby"
    : !state.age
      ? "join"
      : state.age.summary?.status === "Approved" && state.ageSeen
        ? "home"
        : "age";

  const panel = (className?: string) => (
    <DiditPanel
      aurora={aurora}
      className={className}
      tab={tab}
      onTab={setTab}
    />
  );

  return (
    <div
      className={cn("igaming-theme pb-16", theme.dark && "dark")}
      data-theme={theme.dark ? "dark" : "light"}
    >
      <Container className="flex flex-col gap-5 pb-6 pt-8 lg:pt-10" size="xl">
        <Link
          className="inline-flex items-center gap-1 self-start text-xs font-medium text-muted hover:text-ink"
          href="/"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Demo Center
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <p className="eyebrow eyebrow-accent mb-3">
              Industry demo · iGaming
            </p>
            <h1 className="m-0 text-balance text-[32px] font-display leading-[1.05] tracking-tighter text-ink sm:text-[40px]">
              {OPERATOR_NAME}, verified by Didit
            </h1>
            <p className="mt-3 max-w-[720px] text-pretty text-[15px] leading-6 text-muted">
              A fictional casino and sportsbook running Didit end to end: age
              estimation at sign-up, licensed-market checks, monitored deposits
              and withdrawals, an ID check once deposits reach 2,000 EUR,
              bonus-abuse detection and self-exclusion. Every call is live
              against Didit {isStaging ? "staging" : "production"}.
            </p>
          </div>
          <div className="flex flex-none flex-wrap items-center gap-2">
            <ThemeToggle choice={theme.choice} onChoose={theme.choose} />
            <button
              className="ig-btn ig-btn-quiet"
              type="button"
              onClick={() => {
                aurora.reset();
                setJoining(false);
              }}
            >
              <RotateCcw aria-hidden className="size-4" />
              Reset demo
            </button>
          </div>
        </div>
      </Container>

      <Container
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]"
        size="xl"
      >
        <div className="ig-card overflow-hidden">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <AuroraMark />
            <span className="flex-1" />
            {state?.ageSeen ? (
              <>
                <span className="tnum hidden rounded-pill bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink sm:inline">
                  {formatMoney(aurora.totals.balance)}
                </span>
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-pill bg-ink text-xs font-semibold text-canvas"
                >
                  {state.name.slice(0, 1).toUpperCase()}
                </span>
                <button
                  aria-label="Log out (resets the demo player)"
                  className="flex size-8 items-center justify-center rounded-pill text-muted hover:bg-surface hover:text-ink"
                  title="Log out"
                  type="button"
                  onClick={() => {
                    aurora.reset();
                    setJoining(false);
                  }}
                >
                  <LogOut aria-hidden className="size-4" />
                </button>
              </>
            ) : stage === "lobby" ? (
              <button
                className="ig-btn ig-btn-primary h-9"
                type="button"
                onClick={() => setJoining(true)}
              >
                Join now
              </button>
            ) : null}
          </header>

          <div className="min-h-[560px] bg-[rgb(var(--ig-page))] p-4 sm:p-5">
            {!hydrated ? (
              <div className="flex min-h-[520px] items-center justify-center text-muted">
                <Spinner className="size-6" />
              </div>
            ) : stage === "lobby" ? (
              <Lobby onJoin={() => setJoining(true)} />
            ) : stage === "join" ? (
              <JoinCard
                aurora={aurora}
                onCancel={() => {
                  setJoining(false);
                  if (aurora.secondPending) aurora.reset();
                }}
              />
            ) : stage === "age" ? (
              <AgeResult aurora={aurora} />
            ) : (
              <PlayerHome aurora={aurora} />
            )}
          </div>

          <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-[11px] leading-4 text-muted sm:px-5">
            <span className="font-semibold text-ink">18+</span>
            <span>Gambling can be addictive. Play responsibly.</span>
            <span className="flex-1" />
            <span>
              {OPERATOR_NAME} is a fictional operator built for this demo.
            </span>
          </footer>
        </div>

        <aside
          className="sticky hidden lg:block"
          style={{ top: "calc(var(--site-header-bottom, 104px) + 16px)" }}
        >
          {panel("max-h-[calc(100vh-var(--site-header-bottom,104px)-32px)]")}
        </aside>
      </Container>

      <button
        className="ig-btn ig-btn-dark fixed bottom-4 right-4 z-[60] h-11 shadow-lg lg:hidden"
        type="button"
        onClick={() => setDrawer(true)}
      >
        <Layers aria-hidden className="size-4" />
        How this uses Didit
      </button>
      <Modal
        label="How this uses Didit"
        open={drawer}
        width="max-w-[560px] h-[calc(100dvh-32px)]"
        onClose={() => setDrawer(false)}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-none justify-end px-3 pt-3">
            <button
              className="ig-btn ig-btn-quiet h-8 px-3 text-xs"
              type="button"
              onClick={() => setDrawer(false)}
            >
              Close
            </button>
          </div>
          {panel("min-h-0 flex-1 rounded-none border-0")}
        </div>
      </Modal>
    </div>
  );
}
