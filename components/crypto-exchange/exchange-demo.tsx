"use client";

import type { PanelStepId } from "@/lib/crypto-exchange/panel";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { Container } from "@website/components/ui/container";

import { DiditPanel, DiditPanelButton } from "./didit-panel";
import { AccountScreen, SignUpScreen } from "./onboarding";
import { TransferDetail } from "./transfer-detail";
import { DepositForm, WithdrawForm } from "./transfer-forms";
import {
  KestrelMark,
  Notice,
  Spinner,
  StatusChip,
  onRadioGroupKeyDown,
} from "./ui";
import { useKestrel, type Kestrel } from "./use-kestrel";
import { WalletHome } from "./wallet";

import { CX_WORKFLOWS } from "@/lib/crypto-exchange/policy";
import { cn } from "@/lib/utils";

type Screen =
  | { name: "home" }
  | { name: "deposit" }
  | { name: "withdraw" }
  | { name: "transfer"; id: string };

type Theme = "light" | "dark";

const THEME_KEY = "kestrel-demo:theme";
const CONFIGURED = Boolean(CX_WORKFLOWS.onboarding && CX_WORKFLOWS.stepUp);

/**
 * Light or dark for the demo area only: the site chrome around it is light-only,
 * like didit.me. Defaults to the visitor's system preference.
 */
function useDemoTheme() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);

    if (stored === "light" || stored === "dark") setTheme(stored);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      setTheme("dark");
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  };

  return [theme, choose] as const;
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div
      aria-label="Theme"
      className="inline-flex h-9 items-center rounded-pill border border-line bg-canvas p-0.5"
      role="radiogroup"
    >
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          aria-checked={theme === option.value}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium transition-colors duration-fast focus-visible:shadow-ring focus-visible:outline-none",
            theme === option.value
              ? "bg-ink text-canvas"
              : "text-muted hover:text-ink",
          )}
          role="radio"
          tabIndex={theme === option.value ? 0 : -1}
          type="button"
          onClick={() => onChange(option.value)}
          onKeyDown={(event) =>
            onRadioGroupKeyDown(
              event,
              THEME_OPTIONS.map((item) => item.value),
              theme,
              onChange,
            )
          }
        >
          <option.icon className="size-3.5" />
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AppHeader({ kestrel }: { kestrel: Kestrel }) {
  const account = kestrel.account;
  const initials = (account?.fullName ?? "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-16 items-center gap-3 border-b border-line px-4 sm:px-6">
      <KestrelMark className="size-8" />
      <span className="text-[17px] font-semibold tracking-tight text-ink">
        Kestrel
      </span>
      <span className="hidden rounded-pill bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted sm:inline">
        Demo exchange
      </span>
      <span className="flex-1" />
      {account && account.stage === "approved" && (
        <span className="flex items-center gap-2">
          <span className="hidden text-right sm:block">
            <span className="block text-[13px] font-medium text-ink">
              {account.fullName}
            </span>
            <span className="block text-[11px] text-muted">
              {account.userId}
            </span>
          </span>
          <span className="flex size-9 items-center justify-center rounded-pill bg-blue-soft text-[13px] font-semibold text-blue-deep">
            {initials || "K"}
          </span>
        </span>
      )}
      {account && account.stage !== "approved" && (
        <StatusChip tone={account.stage === "declined" ? "declined" : "review"}>
          {account.status || "Verification"}
        </StatusChip>
      )}
    </header>
  );
}

function AppBody({
  kestrel,
  screen,
  go,
}: {
  kestrel: Kestrel;
  screen: Screen;
  go: (screen: Screen) => void;
}) {
  if (!CONFIGURED) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col gap-3 py-10 text-center">
        <h2 className="m-0 text-xl font-semibold tracking-tight text-ink">
          Kestrel is not set up on this environment
        </h2>
        <p className="m-0 text-sm leading-6 text-muted">
          The demo needs its onboarding and step-up workflows, published on the
          Didit application this site uses. They are configured for staging, at
          demos.staging.didit.me.
        </p>
      </div>
    );
  }

  if (!kestrel.hydrated || kestrel.accountStatus === "loading") {
    return (
      <div className="flex min-h-[360px] items-center justify-center gap-3 text-sm text-muted">
        <Spinner /> Loading your account
      </div>
    );
  }

  const account = kestrel.account;

  if (kestrel.accountStatus === "error" && !account) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col gap-4 py-10">
        <Notice tone="declined">{kestrel.accountError}</Notice>
        <button
          className="btn-base h-11 w-fit border border-line bg-canvas px-5 text-ink"
          type="button"
          onClick={kestrel.refreshAccount}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!account) return <SignUpScreen kestrel={kestrel} />;
  if (account.stage !== "approved") {
    return <AccountScreen account={account} kestrel={kestrel} />;
  }

  if (screen.name === "deposit") {
    return (
      <DepositForm
        kestrel={kestrel}
        onBack={() => go({ name: "home" })}
        onDone={(item) => go({ name: "transfer", id: item.id })}
      />
    );
  }
  if (screen.name === "withdraw") {
    return (
      <WithdrawForm
        kestrel={kestrel}
        onBack={() => go({ name: "home" })}
        onDone={(item) => go({ name: "transfer", id: item.id })}
      />
    );
  }
  if (screen.name === "transfer") {
    const item = kestrel.activity.find((entry) => entry.id === screen.id);

    if (item) {
      return (
        <TransferDetail
          item={item}
          kestrel={kestrel}
          onBack={() => go({ name: "home" })}
        />
      );
    }
  }

  return (
    <WalletHome
      account={account}
      kestrel={kestrel}
      onDeposit={() => go({ name: "deposit" })}
      onOpen={(item) => go({ name: "transfer", id: item.id })}
      onWithdraw={() => go({ name: "withdraw" })}
    />
  );
}

function activeStep(kestrel: Kestrel, screen: Screen): PanelStepId {
  if (!kestrel.account || kestrel.account.stage !== "approved")
    return "onboarding";
  if (screen.name === "deposit") return "deposit";
  if (screen.name === "withdraw") return "withdrawal";
  if (screen.name === "transfer") {
    const item = kestrel.activity.find((entry) => entry.id === screen.id);

    if (item?.kind === "withdrawal") return "withdrawal";
    if (item) return "review";
  }

  return kestrel.activity.length > 0 ? "review" : "deposit";
}

export function ExchangeDemo() {
  const kestrel = useKestrel();
  const [theme, setTheme] = useDemoTheme();
  const [screen, setScreen] = React.useState<Screen>({ name: "home" });
  const [panelOpen, setPanelOpen] = React.useState(false);
  const closePanel = React.useCallback(() => setPanelOpen(false), []);
  const frameRef = React.useRef<HTMLDivElement | null>(null);

  const go = React.useCallback((next: Screen) => {
    setScreen(next);
    // Keep the top of the new screen in view on small screens.
    const top = frameRef.current?.getBoundingClientRect().top ?? 0;

    if (top < 0) frameRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div className="kestrel bg-canvas text-ink" data-theme={theme}>
      <section className="border-b border-line bg-surface">
        <Container
          className="flex flex-col gap-5 pb-8 pt-8 lg:flex-row lg:items-end lg:pt-10"
          size="xl"
        >
          <div className="min-w-0 flex-1">
            <Link
              className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
              href="/"
            >
              <ArrowLeft className="size-4" />
              Demo Center
            </Link>
            <p className="eyebrow eyebrow-accent mb-3">
              Industry app · Crypto exchange
            </p>
            <h1 className="m-0 text-balance text-[32px] font-display leading-[1.05] tracking-tighter text-ink sm:text-[40px]">
              Kestrel, a crypto exchange running on Didit
            </h1>
            <p className="mt-3 max-w-[720px] text-[15px] leading-6 text-muted">
              Open an account with KYC and AML, deposit and withdraw ETH with
              wallet screening, the Travel Rule and a selfie step-up. Every
              decision on this page comes from Didit&apos;s API, and each one
              opens in the operator&apos;s compliance view.
            </p>
          </div>
          <div className="flex flex-none flex-wrap items-center gap-2.5">
            <ThemeToggle theme={theme} onChange={setTheme} />
            <DiditPanelButton onOpen={() => setPanelOpen(true)} />
            {kestrel.account && (
              <button
                className="btn-base h-9 border border-line bg-canvas px-3.5 text-[13px] text-muted hover:text-ink"
                type="button"
                onClick={() => {
                  kestrel.reset();
                  setScreen({ name: "home" });
                }}
              >
                Reset demo
              </button>
            )}
          </div>
        </Container>
      </section>

      <Container
        className="grid gap-6 pb-12 pt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:pb-16 lg:pt-8"
        size="xl"
      >
        <div
          ref={frameRef}
          className="min-w-0 scroll-mt-24 overflow-hidden rounded-lg border border-line bg-canvas shadow-md"
          data-testid="kestrel-app"
        >
          <AppHeader kestrel={kestrel} />
          <div className="min-h-[560px] p-4 sm:p-6 lg:p-8">
            <AppBody go={go} kestrel={kestrel} screen={screen} />
          </div>
        </div>
        <DiditPanel
          active={activeStep(kestrel, screen)}
          sheetOpen={panelOpen}
          onSheetClose={closePanel}
        />
      </Container>
    </div>
  );
}
