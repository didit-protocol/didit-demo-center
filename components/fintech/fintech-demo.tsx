"use client";

import type { StepKey } from "@/lib/fintech/steps";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowUpRight, FlaskConical, RotateCcw } from "lucide-react";
import { Container } from "@website/components/ui/container";

import {
  HomeScreen,
  MonitoringCard,
  MonitoringPreview,
  PayScreen,
  PaymentResultScreen,
} from "./account-screens";
import {
  api,
  type AccountView,
  type ApiError,
  type PaymentWithLink,
  type VerificationView,
} from "./api";
import { BankFrame, ThemeToggle, useDemoTheme } from "./bank-frame";
import {
  DiditPanel,
  OperatorView,
  PanelButton,
  PanelSheet,
} from "./didit-panel";
import {
  CheckingScreen,
  FailureText,
  OutcomeScreen,
  SignUpScreen,
  VerifyScreen,
  WelcomeScreen,
  outcomeKind,
} from "./onboarding-screens";
import { Notice, Spinner, focusRing } from "./ui";

import {
  MAX_PAYMENTS,
  balances as totals,
  type Balances,
  type PaymentKind,
} from "@/lib/fintech/model";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type SdkModule = typeof import("@didit-protocol/sdk-web").DiditSdk;

type Screen =
  | "loading"
  | "failed"
  | "welcome"
  | "signup"
  | "verify"
  | "checking"
  | "outcome"
  | "home"
  | "pay"
  | "payment";

/** How often each waiting screen re-reads Didit. */
const POLL_CHECKING_MS = 3000;
const POLL_REVIEW_MS = 10000;
const SLOW_AFTER_MS = 90000;

/** Run `task` every `ms` while `active`, and once straight away. */
function usePoll(active: boolean, ms: number, task: () => Promise<void>) {
  const taskRef = React.useRef(task);

  taskRef.current = task;

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      await taskRef.current();
      if (!cancelled) timer = window.setTimeout(tick, ms);
    };

    tick();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, ms]);
}

/** Below Tailwind's `sm` breakpoint the panel moves into a sheet. */
function useIsPhone() {
  const [phone, setPhone] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 639.98px)");
    const sync = () => setPhone(query.matches);

    sync();
    query.addEventListener("change", sync);

    return () => query.removeEventListener("change", sync);
  }, []);

  return phone;
}

/** Which screen an account in this onboarding state lands on. */
function screenFor(verification: VerificationView | null): Screen {
  if (!verification) return "verify";
  switch (verification.status) {
    case "approved":
      return "home";
    case "review":
    case "declined":
    case "expired":
      return "outcome";
    case "not_started":
      return "verify";
    default:
      return "checking";
  }
}

/**
 * Alder, the fintech demo: a neobank whose every step is a real Didit call
 * on staging. The bank app is on the left, and on the right (a sheet opened
 * from the page header on phones) the "How this uses Didit" panel follows the
 * visitor through the journey and shows the operator side of the same records.
 */
export function FintechDemo({
  live,
  stagingUrl,
}: {
  /** False on any build but staging: the demo then explains where it runs. */
  live: boolean;
  stagingUrl: string;
}) {
  const t = useTranslations("Fintech");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useDemoTheme();
  const isPhone = useIsPhone();
  const sdkRef = React.useRef<SdkModule | null>(null);

  const [screen, setScreen] = React.useState<Screen>(
    live ? "loading" : "welcome",
  );
  const [loadError, setLoadError] = React.useState<ApiError | null>(null);
  const [account, setAccount] = React.useState<AccountView | null>(null);
  const [verification, setVerification] =
    React.useState<VerificationView | null>(null);
  const [payments, setPayments] = React.useState<PaymentWithLink[]>([]);
  const [balances, setBalances] = React.useState<Balances>({
    available: 0,
    held: 0,
  });
  const [paymentsLoading, setPaymentsLoading] = React.useState(false);
  const [paymentsError, setPaymentsError] = React.useState<ApiError | null>(
    null,
  );
  const [payKind, setPayKind] = React.useState<PaymentKind>("deposit");
  const [openPaymentId, setOpenPaymentId] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [cancelled, setCancelled] = React.useState(false);
  const [verifyFailure, setVerifyFailure] = React.useState<string | null>(null);
  const [checkingSince, setCheckingSince] = React.useState(0);
  const [slow, setSlow] = React.useState(false);
  const [monitoringActive, setMonitoringActive] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);

  // ── Loading the visitor's account ─────────────────────────────────
  const load = React.useCallback(async () => {
    setScreen("loading");
    setLoadError(null);
    const result = await api.account();

    if (!result.ok) {
      setLoadError(result.error);
      setScreen("failed");

      return;
    }

    const { account: current, verification: decision = null } = result.data;

    const next = current ? screenFor(decision) : "welcome";

    setAccount(current);
    setVerification(decision);
    // Landing on "checking" after a reload starts its "taking longer" clock.
    if (next === "checking") setCheckingSince(Date.now());
    setScreen(next);
  }, []);

  React.useEffect(() => {
    if (live) load();
  }, [live, load]);

  // The hosted flow redirects here when it finishes on another device. The
  // cookie already knows the session, so the query string is only dropped.
  React.useEffect(() => {
    if (searchParams.get("verificationSessionId")) {
      router.replace("/fintech", { scroll: false });
    }
  }, [searchParams, router]);

  const refreshPayments = React.useCallback(async () => {
    setPaymentsLoading(true);
    const result = await api.payments();

    setPaymentsLoading(false);
    if (!result.ok) {
      setPaymentsError(result.error);

      return;
    }
    setPaymentsError(null);
    setPayments(result.data.payments);
    setBalances(result.data.balances);
  }, []);

  React.useEffect(() => {
    if (screen === "home") refreshPayments();
  }, [screen, refreshPayments]);

  /** Re-reads the decision; a settled one moves the bank to its outcome. */
  const readDecision = React.useCallback(async () => {
    const result = await api.verification();

    if (!result.ok) return;
    const next = result.data.verification;

    setVerification(next);
    if (outcomeKind(next.status)) setScreen("outcome");
  }, []);

  // ── The hosted verification flow (Didit web SDK) ──────────────────
  React.useEffect(() => {
    if (!live) return;
    let disposed = false;

    import("@didit-protocol/sdk-web").then(({ DiditSdk }) => {
      if (disposed) return;
      sdkRef.current = DiditSdk;
      DiditSdk.shared.onComplete = (result) => {
        if (result.type === "completed") {
          setCancelled(false);
          setCheckingSince(Date.now());
          setSlow(false);
          setScreen("checking");
        } else if (result.type === "cancelled") {
          setCancelled(true);
          setScreen("verify");
        } else {
          setVerifyFailure(result.error?.message ?? "");
          setScreen("verify");
        }
      };
    });

    return () => {
      disposed = true;
      if (sdkRef.current) sdkRef.current.shared.onComplete = undefined;
    };
  }, [live]);

  const startVerification = async () => {
    setStarting(true);
    setCancelled(false);
    setVerifyFailure(null);
    const result = await api.startVerification();

    setStarting(false);

    if (!result.ok) {
      if (
        result.error.error === "already_verified" &&
        result.error.verification
      ) {
        setVerification(result.error.verification);
        setScreen(screenFor(result.error.verification));

        return;
      }
      setVerifyFailure(result.error.detail ?? t("common.error"));

      return;
    }

    setAccount((current) =>
      current ? { ...current, hasSession: true } : current,
    );
    // The session exists from here on: show it in the operator view.
    readDecision();
    if (!sdkRef.current) {
      // The SDK is still loading: the hosted flow works as a plain page too.
      window.location.assign(result.data.url);

      return;
    }
    await sdkRef.current.shared.startVerification({
      url: result.data.url,
      configuration: {
        showCloseButton: true,
        showExitConfirmation: true,
        closeModalOnComplete: true,
      },
    });
  };

  // ── Waiting on decisions ──────────────────────────────────────────
  usePoll(screen === "checking", POLL_CHECKING_MS, async () => {
    await readDecision();
    if (checkingSince && Date.now() - checkingSince > SLOW_AFTER_MS) {
      setSlow(true);
    }
  });

  // A review can end while the visitor watches: an analyst decides in the
  // console and the next read shows it.
  usePoll(
    screen === "outcome" && verification?.status === "review",
    POLL_REVIEW_MS,
    readDecision,
  );

  const hasHeld = payments.some(
    (p) => p.status === "held" || p.status === "action",
  );

  usePoll(
    (screen === "home" || screen === "payment") && hasHeld,
    POLL_REVIEW_MS,
    refreshPayments,
  );

  // ── Actions ───────────────────────────────────────────────────────
  const signUp = async (input: {
    name: string;
    email: string;
    country: string;
  }) => {
    const result = await api.signUp(input);

    if (!result.ok) return result.error;
    setAccount(result.data.account);
    setVerification(null);
    setScreen("verify");

    return null;
  };

  const reset = async () => {
    await api.reset();
    setAccount(null);
    setVerification(null);
    setPayments([]);
    setBalances({ available: 0, held: 0 });
    setOpenPaymentId(null);
    setCancelled(false);
    setVerifyFailure(null);
    setMonitoringActive(false);
    setScreen("welcome");
  };

  const pay = async (input: {
    kind: PaymentKind;
    amount: number;
    counterparty: string | null;
  }) => {
    const result = await api.pay({
      kind: input.kind,
      amount: input.amount,
      ...(input.counterparty ? { counterparty: input.counterparty } : {}),
    });

    if (!result.ok) return result.error;

    const payment = result.data.payment;
    const next = [payment, ...payments];

    setPayments(next);
    setBalances(totals(next));
    setOpenPaymentId(payment.id);
    setScreen("payment");

    return null;
  };

  const openPayment = payments.find((p) => p.id === openPaymentId) ?? null;

  // ── The panel follows the journey ─────────────────────────────────
  const step: StepKey = (() => {
    switch (screen) {
      case "loading":
      case "failed":
      case "welcome":
      case "signup":
        return "signup";
      case "verify":
        return "verify";
      case "checking":
      case "outcome":
        return "decision";
      case "payment":
        return openPayment?.status === "held" ? "review" : "payments";
      default:
        if (monitoringActive) return "monitoring";

        return hasHeld ? "review" : "payments";
    }
  })();

  const approved = verification?.status === "approved";

  // Rendered in one place at a time: beside the bank from the `sm` size up,
  // in the sheet below it.
  const panel = (
    <DiditPanel
      current={step}
      operator={
        <OperatorView
          consoleHome={`${siteConfig.links.console}/console`}
          monitoring={
            approved ? (
              <MonitoringPreview onPreview={() => setMonitoringActive(true)} />
            ) : null
          }
          payments={payments}
          verification={verification}
        />
      }
    />
  );

  // ── The bank app's current screen ─────────────────────────────────
  const renderScreen = () => {
    if (!live) {
      return (
        <div className="flex h-full flex-col" data-testid="fx-staging-only">
          <span className="mb-6 flex size-12 items-center justify-center rounded-pill bg-blue-soft text-blue-deep">
            <FlaskConical aria-hidden className="size-6" />
          </span>
          <h2 className="m-0 text-[24px] font-display leading-[1.15] tracking-display text-ink">
            {t("page.unavailable.title")}
          </h2>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-muted">
            {t("page.unavailable.body")}
          </p>
          <div className="mt-auto pt-8">
            <a className="btn-primary h-12 w-full" href={stagingUrl}>
              {t("page.unavailable.cta")}
              <ArrowUpRight aria-hidden className="size-5" />
            </a>
          </div>
        </div>
      );
    }

    switch (screen) {
      case "loading":
        return (
          <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-muted">
            <Spinner />
            {t("common.loading")}
          </div>
        );
      case "failed":
        return (
          <div className="flex flex-1 flex-col justify-center gap-4">
            {loadError ? (
              <Notice tone="declined">
                <FailureText error={loadError} />
              </Notice>
            ) : null}
            <button className="btn-muted h-11" type="button" onClick={load}>
              {t("common.retry")}
            </button>
          </div>
        );
      case "welcome":
        return <WelcomeScreen onStart={() => setScreen("signup")} />;
      case "signup":
        return (
          <SignUpScreen onBack={() => setScreen("welcome")} onSubmit={signUp} />
        );
      case "verify":
        return (
          <VerifyScreen
            cancelled={cancelled}
            failure={verifyFailure}
            resume={Boolean(account?.hasSession)}
            starting={starting}
            onStart={startVerification}
          />
        );
      case "checking":
        return <CheckingScreen slow={slow} verification={verification} />;
      case "outcome": {
        const kind = verification ? outcomeKind(verification.status) : null;

        if (!kind)
          return <CheckingScreen slow={slow} verification={verification} />;

        return (
          <OutcomeScreen
            email={account?.email ?? ""}
            kind={kind}
            name={account?.name ?? ""}
            onContinue={() => setScreen("home")}
            onReset={reset}
          />
        );
      }
      case "pay":
        return (
          <PayScreen
            available={balances.available}
            kind={payKind}
            onCancel={() => setScreen("home")}
            onSubmit={pay}
          />
        );
      case "payment":
        if (openPayment) {
          return (
            <PaymentResultScreen
              payment={openPayment}
              onDone={() => {
                setOpenPaymentId(null);
                setScreen("home");
              }}
            />
          );
        }

        return null;
      case "home":
      default:
        return (
          <HomeScreen
            atLimit={payments.length >= MAX_PAYMENTS}
            balances={balances}
            failure={paymentsError}
            limit={MAX_PAYMENTS}
            loading={paymentsLoading}
            monitoring={<MonitoringCard />}
            name={account?.name ?? ""}
            payments={payments}
            onAdd={() => {
              setPayKind("deposit");
              setMonitoringActive(false);
              setScreen("pay");
            }}
            onOpen={(payment) => {
              setOpenPaymentId(payment.id);
              setScreen("payment");
            }}
            onRefresh={refreshPayments}
            onSend={() => {
              setPayKind("transfer");
              setMonitoringActive(false);
              setScreen("pay");
            }}
          />
        );
    }
  };

  return (
    <section
      className="fintech-theme border-b border-line"
      data-testid="fx-demo"
      data-theme={theme}
      dir={locale === "ar" ? "rtl" : undefined}
    >
      <Container className="pb-16 pt-6 lg:pt-8" size="xl">
        <Link
          className={cn(
            "inline-flex items-center gap-1.5 rounded-2xs text-[13px] font-medium text-muted hover:text-ink",
            focusRing,
          )}
          href="/"
        >
          <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
          {t("page.allDemos")}
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[720px]">
            <p className="eyebrow eyebrow-accent mb-3">{t("page.eyebrow")}</p>
            <h1 className="m-0 text-balance text-[32px] font-display leading-[1.05] tracking-tighter text-ink sm:text-[40px] lg:text-[44px]">
              {t("page.title")}
            </h1>
            <p className="mt-3.5 text-pretty text-[15px] leading-[1.55] text-muted">
              {t("page.lede")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {live ? (
              <span className="inline-flex h-9 items-center gap-2 rounded-pill bg-success-bg px-3 text-[13px] font-medium text-success">
                <span className="size-1.5 animate-pulse-dot rounded-pill bg-success" />
                {t("page.staging")}
              </span>
            ) : null}
            <ThemeToggle theme={theme} onChange={setTheme} />
            <PanelButton onOpen={() => setSheetOpen(true)} />
            {account ? (
              <button
                className="btn-outline h-9 px-3.5 text-[13px]"
                type="button"
                onClick={reset}
              >
                <RotateCcw aria-hidden className="size-3.5" />
                {t("page.reset")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:gap-12">
          <div className="mx-auto w-full min-w-0 max-w-[520px] lg:max-w-none">
            <BankFrame holder={account?.name ?? null}>
              {renderScreen()}
            </BankFrame>
          </div>
          {isPhone ? null : (
            <div className="hidden sm:block lg:sticky lg:top-[calc(var(--site-header-bottom,104px)+16px)]">
              {panel}
            </div>
          )}
        </div>
      </Container>
      <PanelSheet open={isPhone && sheetOpen} onClose={closeSheet}>
        {isPhone ? panel : null}
      </PanelSheet>
    </section>
  );
}
