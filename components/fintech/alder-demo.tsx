"use client";

import type { CalloutSpec } from "@/components/didit-live/callouts";
import type { ProductTile } from "@/components/didit-live/live-feed";
import type { StepId } from "@/lib/didit/config";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AppFrame,
  HomeView,
  PaymentsView,
  PendingHome,
  SecurityView,
  Site,
  type View,
} from "./bank";
import { SendForm, SignUpCard, StepUpModal, TakeoverModal } from "./modals";
import { type AlderSignal, useAlder } from "./use-alder";

import { DemoShell } from "@/components/didit-live/demo-shell";
import { alder } from "@/lib/didit/demos";
import { SIGNUP_INTENT, useDidit } from "@/lib/didit/provider";
import { useLive } from "@/lib/didit/use-live";
import { payeeById, ruleName } from "@/lib/fintech/alder";
import { alderConsole } from "@/lib/fintech/console-pages";
import {
  authEvent,
  deviceEvents,
  onboardingDecided,
  onboardingStarted,
  paymentEvents,
  paymentRefused,
  stepUpDecided,
  stepUpStarted,
  takeoverEvents,
} from "@/lib/fintech/live-events";

type Modal = "stepup" | "takeover" | null;

const OWN_SIGNUP = "alder-demo:signup";
const PHONE_KEY = "alder-demo:phone";
const SEEN_KEY = "alder-demo:seen";

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/**
 * /fintech: Alder, a fictional neobank, inside the Demo Center. Everything
 * Didit does here runs on the visitor's own sandbox records through
 * lib/didit: Authentication at sign-up, signals from the first load, KYC and
 * AML in the web SDK modal before the IBAN, every payment as a monitored
 * transaction from the browser, the step-up on a large transfer to a new
 * payee and a sign-in without the passkey blocked by a rule.
 */
export function AlderDemo() {
  const didit = useDidit();
  const live = useLive(alder.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = React.useState<View>("home");
  const [modal, setModal] = React.useState<Modal>(null);
  const [stepUpKey, setStepUpKey] = React.useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = React.useState(false);
  const [consoleTab, setConsoleTab] = React.useState("transaction");
  const [toast, setToast] = React.useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);
  const [seen, setSeen] = React.useState<Set<StepId>>(new Set());
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const opening = React.useRef(false);

  const emit = React.useCallback(
    (signal: AlderSignal) => {
      const inputs =
        signal.type === "check-started"
          ? signal.check === "onboarding"
            ? onboardingStarted()
            : stepUpStarted()
          : signal.type === "onboarding-decided"
            ? onboardingDecided(signal.summary)
            : signal.type === "step-up-decided"
              ? stepUpDecided(signal.summary, signal.record)
              : signal.type === "payment"
                ? signal.item.record
                  ? paymentEvents(signal.item.record, signal.item)
                  : paymentRefused(
                      signal.item.key,
                      signal.item,
                      signal.item.error ?? "Didit did not accept the payment",
                    )
                : takeoverEvents(signal.result, didit.device);

      // Oldest first, so the most important lands on top.
      for (const input of inputs) live.push(input);
    },
    [live.push, didit.device],
  );

  const bank = useAlder(emit);
  const { state, hydrated, balance } = bank;
  const auth = didit.auth;
  const authOn = didit.authEnabled;
  const onboarding = state?.onboarding ?? null;
  const approved = onboarding?.summary?.status === "Approved";
  const name =
    onboarding?.summary?.fullName ??
    (state?.name || state?.email || auth?.email || "");
  const signIn = authOn
    ? auth?.methods.includes("passkey")
      ? "Passkey"
      : auth?.methods.includes("code")
        ? "Email code"
        : "Didit"
    : null;

  /* ── Steps seen in this tab ── */

  React.useEffect(() => {
    try {
      setSeen(
        new Set(JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? "[]")),
      );
    } catch {
      // Starts with no step seen.
    }
  }, []);

  const markSeen = (step: StepId) =>
    setSeen((current) => {
      const next = new Set(current).add(step);

      window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(next)));

      return next;
    });

  /* ── Signals: this device, once per visit ── */

  React.useEffect(() => {
    if (!didit.device) return;
    if (live.events.some((event) => event.id === "sig-device")) return;
    for (const input of deviceEvents(didit.device)) live.push(input);
  }, [didit.device]);

  /* ── Authentication: the session, then the account and the KYC ── */

  React.useEffect(() => {
    if (!auth?.sessionId || auth.status !== "signed-in") return;
    if (live.events.some((event) => event.id === `auth-${auth.sessionId}`))
      return;
    const signUp = window.sessionStorage.getItem(OWN_SIGNUP) === "1";

    window.sessionStorage.removeItem(OWN_SIGNUP);
    live.push(
      authEvent({
        sessionId: auth.sessionId,
        email: auth.email,
        methods: auth.methods,
        signUp,
        device: didit.device
          ? `on this ${didit.device.os === "macOS" ? "Mac" : didit.device.os} device`
          : null,
      }),
    );
  }, [auth?.sessionId, auth?.status]);

  React.useEffect(() => {
    if (
      !authOn ||
      !hydrated ||
      auth?.status !== "signed-in" ||
      state ||
      opening.current
    )
      return;
    opening.current = true;
    const phone = window.sessionStorage.getItem(PHONE_KEY) ?? "";

    window.sessionStorage.removeItem(PHONE_KEY);
    bank
      .open({ name: "", email: auth.email ?? "", phone })
      .then((customer) => {
        if (customer) void bank.startOnboarding();
      })
      .finally(() => {
        opening.current = false;
      });
  }, [authOn, hydrated, auth?.status, state]);

  /* ── Notices ── */

  React.useEffect(() => {
    if (bank.notice) setToast(bank.notice);
  }, [bank.notice]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  // The hosted flow redirects here when it finishes on another device.
  React.useEffect(() => {
    if (!hydrated) return;
    const sessionId = searchParams.get("verificationSessionId");

    if (!sessionId) return;
    bank.resumeFromRedirect(sessionId);
    router.replace("/fintech", { scroll: false });
  }, [hydrated, searchParams]);

  // Approved before the first week was submitted (a reload in between).
  React.useEffect(() => {
    if (approved && state && !state.seeded && bank.busy === null)
      void bank.seed();
  }, [approved, state?.seeded]);

  /* ── Actions ── */

  const hostedSignUp = (phone: string) => {
    setAuthBusy(true);
    window.sessionStorage.setItem(SIGNUP_INTENT, "1");
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
    if (phone) window.sessionStorage.setItem(PHONE_KEY, phone);
    void auth?.signUp("/fintech");
  };

  const emailStart = async (email: string) => {
    if (!auth) return false;
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await auth.emailCode.start(email);

      if (result.status === "code_sent") return true;
      setAuthError(
        "Didit's bot protection asks for one more proof. Use a passkey instead.",
      );

      return false;
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "The code could not be sent.",
      );

      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const emailVerify = async (code: string, phone: string) => {
    if (!auth) return;
    setAuthBusy(true);
    setAuthError(null);
    window.sessionStorage.setItem(SIGNUP_INTENT, "1");
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
    if (phone) window.sessionStorage.setItem(PHONE_KEY, phone);
    try {
      const result = await auth.emailCode.verify(code);

      if (result.status !== "signed_in")
        setAuthError("That code did not work. Check it and try again.");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "That code did not work.",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const cookieOpen = async (details: {
    name: string;
    email: string;
    phone: string;
  }) => {
    const customer = await bank.open(details);

    if (!customer) return;
    setView("home");
    didit.refreshToken(alder.id);
    didit.track(alder.id, {
      category: "auth",
      actionType: "signup",
      payload: { method: "form" },
    });
    await bank.startOnboarding();
  };

  const verify = () => {
    if (!state) return;
    if (!onboarding) return void bank.startOnboarding();
    if (!onboarding.summary || onboarding.summary.status === "Not Started")
      return void bank.resumeOnboarding();
    if (onboarding.summary.status === "In Progress")
      return void bank.resumeOnboarding();
    if (!approved) return void bank.startOnboarding();
  };

  const requireApproved = (then: () => void) => {
    if (!state) return;
    if (!approved) {
      setToast({
        tone: "info",
        text: "Verify your identity first: payments open once Didit approves it.",
      });

      return verify();
    }
    then();
  };

  const send = async ({ payee, amount }: { payee: string; amount: number }) => {
    const chosen = payeeById(payee);

    if (!chosen) return;
    if (amount > balance) {
      setToast({
        tone: "error",
        text: "That is more than you have in your main account.",
      });

      return;
    }
    const item = await bank.pay({
      kind: "transfer",
      amount,
      counterparty: chosen.name,
      account: chosen.iban,
      newPayee: !chosen.known,
      detail: chosen.known ? "Transfer" : "Transfer · new payee",
      color: "#6D28D9",
    });

    if (!item) return;
    if (item.record?.status === "AWAITING_USER" || item.error) {
      setStepUpKey(item.key);
      setModal("stepup");
    } else if (item.record?.status === "APPROVED") {
      setToast({
        tone: "info",
        text: `Sent: ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} EUR to ${chosen.name}.`,
      });
      setView("home");
    } else {
      setStepUpKey(item.key);
      setModal("stepup");
    }
  };

  const attack = async () => {
    await bank.attemptTakeover();
    setModal(null);
    setView("security");
    markSeen("fraud");
  };

  const restart = async () => {
    bank.reset();
    live.clear();
    window.sessionStorage.removeItem(SEEN_KEY);
    setSeen(new Set());
    setModal(null);
    setView("home");
    setConsoleOpen(false);
    if (authOn && auth?.status === "signed-in") await auth.signOut("/fintech");
  };

  const openConsole = (open: boolean, tab?: string) => {
    setConsoleOpen(open);
    if (tab) setConsoleTab(tab);
    if (open) markSeen("console");
  };

  /* ── The five steps ── */

  const activity = state?.activity ?? [];
  const stepUpItem =
    activity.find((item) => item.key === stepUpKey) ??
    (state?.stepUp
      ? (activity.find(
          (item) => item.record?.id === state.stepUp?.transactionId,
        ) ?? null)
      : null);
  const done = new Set<StepId>();

  if (state || auth?.status === "signed-in") done.add("signup");
  if (approved) done.add("verify");
  if (
    activity.some(
      (item) => item.kind === "transfer" && item.record?.status === "APPROVED",
    )
  )
    done.add("transact");
  if (state?.takeover || seen.has("fraud")) done.add("fraud");
  if (seen.has("console")) done.add("console");

  const step: StepId = consoleOpen
    ? "console"
    : modal === "takeover" || view === "security"
      ? "fraud"
      : modal === "stepup" || view === "payments"
        ? "transact"
        : !state
          ? "signup"
          : !approved
            ? "verify"
            : ((
                ["signup", "verify", "transact", "fraud", "console"] as StepId[]
              ).find((id) => !done.has(id)) ?? "console");

  const onStep = (target: StepId) => {
    switch (target) {
      case "signup":
        if (!state) setView("home");
        break;
      case "verify":
        verify();
        break;
      case "transact":
        requireApproved(() => {
          setModal(null);
          setView("payments");
        });
        break;
      case "fraud":
        requireApproved(() => setModal("takeover"));
        break;
      default:
        openConsole(true, "transaction");
    }
  };

  /* ── What the live layer shows ── */

  const callouts: CalloutSpec[] = [];

  if (!state && didit.device) {
    callouts.push({
      id: "bot",
      anchor: "passkey",
      tone: "sig",
      side: "right",
      title: `${didit.device.botScore < 0.5 ? "Human" : "Likely a bot"} · bot score ${didit.device.botScore.toFixed(2)}`,
    });
  } else if (
    modal === "stepup" &&
    stepUpItem?.record?.status === "AWAITING_USER"
  ) {
    const hit = stepUpItem.record.ruleHits.find((rule) => rule.statusTarget);

    callouts.push({
      id: "rule",
      anchor: "stepup",
      tone: "hold",
      side: "left",
      title: hit
        ? `Rule hit: ${ruleName(hit.title)}`
        : "Step-up on a new payee",
    });
  } else if (!modal && view === "security" && state?.takeover) {
    callouts.push({
      id: "blocked",
      anchor: "blocked",
      tone: "stop",
      side: "left",
      title: "No passkey, no access",
    });
  } else if (!modal && view === "home" && approved && state?.seeded) {
    callouts.push({
      id: "monitored",
      anchor: "balance",
      tone: "txn",
      side: "right",
      title: "Every payment, scored live",
    });
  }

  const monitored = activity.filter((item) => item.record).length;
  const tiles: ProductTile[] | undefined =
    !modal && view === "home" && approved
      ? [
          {
            product: "authentication",
            label: "Authentication",
            value: signIn ?? "Alder sign-in",
          },
          {
            product: "signals",
            label: "Signals",
            value:
              didit.device?.firstVisit === false
                ? "Known device"
                : "New device",
          },
          {
            product: "verification",
            label: "Verification",
            value: "Approved",
          },
          {
            product: "transactions",
            label: "Transactions",
            value: `${monitored} monitored`,
          },
        ]
      : undefined;

  const consoleTabs = alderConsole({
    customer: state
      ? {
          customerId: state.customerId,
          name: state.name,
          email: state.email,
          createdAt: state.createdAt,
        }
      : null,
    onboarding: onboarding?.summary ?? null,
    stepUp: state?.stepUp?.summary ?? null,
    activity,
    events: live.events,
    device: didit.device,
    signIn,
    takeover: state?.takeover
      ? { at: state.takeover.at, status: state.takeover.status }
      : null,
    now: Date.now(),
  });

  const integration = [
    "// Alder: the whole Didit integration",
    ...(authOn ? ["<DiditAuth><SignUp /></DiditAuth>   // auth-nextjs"] : []),
    "configureEvents()                    // signals",
    "await startVerification({ url })     // sdk-web, KYC + AML",
    "const result = await submitTransaction({ transactionToken, transaction })",
    "if (result.actionRequired) await startVerification(result.actionRequired)",
    'submitEvent({ category: "security", actionType: "login_failed" })',
  ];

  /* ── The screen ── */

  const person = state ? name || null : (auth?.email ?? null);
  let screen: React.ReactNode;

  if (!state) {
    screen = (
      <Site
        onLogIn={() =>
          authOn
            ? void auth?.signIn("/fintech")
            : setToast({
                tone: "info",
                text: "Open an account first: this demo starts at sign-up.",
              })
        }
      >
        <SignUpCard
          authEnabled={authOn}
          busy={authBusy || bank.busy === "open" || bank.busy === "onboarding"}
          error={authError}
          onEmailStart={emailStart}
          onEmailVerify={(code, phone) => void emailVerify(code, phone)}
          onHosted={hostedSignUp}
          onOpen={(details) => void cookieOpen(details)}
        />
        {toast ? (
          <div
            className={`al-toast${toast.tone === "error" ? " is-error" : ""}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            {toast.text}
          </div>
        ) : null}
      </Site>
    );
  } else {
    const hello = firstName(name);
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const pendingStatus = !onboarding
      ? "start"
      : bank.busy === "onboarding"
        ? "checking"
        : onboarding.summary?.status === "In Review"
          ? "review"
          : onboarding.summary?.status === "Declined"
            ? "declined"
            : "open";
    const titles: Record<View, [string, string]> = {
      home: approved
        ? [`${greeting}${hello ? `, ${hello}` : ""}`, today]
        : [`Welcome to Alder${hello ? `, ${hello}` : ""}`, "Two minutes left"],
      payments: ["Payments", "Send money in seconds"],
      security: ["Security", "Your devices and sign-ins"],
    };
    const [title, subtitle] = titles[view];

    screen = (
      <AppFrame
        alerts={state.takeover ? 1 : 0}
        name={name}
        overlay={
          <>
            {modal === "stepup" && stepUpItem ? (
              <StepUpModal
                busy={bank.busy === "stepUp"}
                item={stepUpItem}
                onClose={() => {
                  setModal(null);
                  if (stepUpItem.record?.status === "APPROVED") setView("home");
                }}
                onConfirm={() => bank.confirmStepUp()}
              />
            ) : null}
            {modal === "takeover" ? (
              <TakeoverModal
                busy={bank.busy === "takeover"}
                email={state.email || "your email"}
                onAttempt={() => void attack()}
                onClose={() => setModal(null)}
              />
            ) : null}
          </>
        }
        subtitle={subtitle}
        title={title}
        toast={toast}
        view={view}
        onElsewhere={(label) =>
          setToast({
            tone: "info",
            text: `${label} is not part of this demo. Try Home, Payments or Security.`,
          })
        }
        onView={(next) =>
          next === "home" ? setView(next) : requireApproved(() => setView(next))
        }
      >
        {view === "payments" && approved ? (
          <PaymentsView balance={balance}>
            <SendForm
              busy={bank.busy === "send"}
              locked={!approved || bank.busy === "seed"}
              onSend={(input) => void send(input)}
            />
          </PaymentsView>
        ) : view === "security" && approved ? (
          <SecurityView
            attempt={
              state.takeover
                ? {
                    at: state.takeover.at,
                    device: didit.device
                      ? `${didit.device.browser} on ${didit.device.os}`
                      : "This browser",
                    botScore: didit.device?.botScore ?? null,
                    decision: state.takeover.status
                      ? `${state.takeover.status.charAt(0)}${state.takeover.status.slice(1).toLowerCase().replace(/_/g, " ")}${state.takeover.score !== null ? ` · score ${Math.round(state.takeover.score)}` : ""}`
                      : "Not stored",
                  }
                : null
            }
            device={
              didit.device
                ? `${didit.device.browser} on ${didit.device.os}`
                : null
            }
            signIn={signIn ? `${signIn} · today` : "Alder sign-in · today"}
            onItWasMe={() =>
              setToast({
                tone: "info",
                text: "Then sign in with your passkey: without it nobody gets in, you included.",
              })
            }
            onSecure={() =>
              setToast({
                tone: "info",
                text: "Your account is secure: the sign-in never got past the passkey.",
              })
            }
          />
        ) : approved ? (
          <HomeView
            activity={activity}
            balance={balance}
            name={name || "Alder customer"}
            onAddMoney={() =>
              setToast({
                tone: "info",
                text: "Adding money is not part of this demo. Try Send.",
              })
            }
            onSeeAll={() => setView("payments")}
            onSend={() => setView("payments")}
          />
        ) : (
          <PendingHome
            busy={bank.busy !== null}
            status={pendingStatus}
            onVerify={verify}
          />
        )}
      </AppFrame>
    );
  }

  return (
    <DemoShell
      app="alder"
      callouts={callouts}
      consoleOpen={consoleOpen}
      consoleTab={consoleTab}
      consoleTabs={consoleTabs}
      demo={alder}
      done={done}
      events={live.events}
      integration={integration}
      person={person}
      quiet={modal !== null}
      step={step}
      tiles={tiles}
      onConsole={openConsole}
      onRestart={() => void restart()}
      onStep={onStep}
    >
      {screen}
    </DemoShell>
  );
}
