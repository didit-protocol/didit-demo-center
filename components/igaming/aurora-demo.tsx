"use client";

import type { CalloutSpec } from "@/components/didit-live/callouts";
import type { ProductTile } from "@/components/didit-live/live-feed";
import type { StepId } from "@/lib/didit/config";
import type { ActivityItem } from "@/lib/igaming/ledger";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Casino, type NavId } from "./casino";
import {
  CashierModal,
  OfferModal,
  ResponsibleModal,
  SignUpModal,
} from "./modals";
import { type AuroraSignal, useAurora } from "./use-aurora";

import { DemoShell } from "@/components/didit-live/demo-shell";
import { authErrorMessage } from "@/lib/didit/auth-errors";
import { auroraPlay } from "@/lib/didit/demos";
import { ago } from "@/lib/didit/live";
import { SIGNUP_INTENT, useDidit } from "@/lib/didit/provider";
import { useLive } from "@/lib/didit/use-live";
import { type DeviceAccount, auroraConsole } from "@/lib/igaming/console-pages";
import {
  authEvent,
  checkDecided,
  checkStarted,
  deviceEvents,
  recordEvents,
  ruleName,
  transactionEvents,
} from "@/lib/igaming/live-events";
import { WELCOME_BONUS, formatMoney, sessionView } from "@/lib/igaming/policy";

type Modal = "signup" | "cashier" | "offer" | "responsible" | null;

const ACCOUNTS_KEY = "aurora-play-demo:device-accounts";
const SECOND_KEY = "aurora-play-demo:second";
const OWN_SIGNUP = "aurora-play-demo:signup";
const SEEN_KEY = "aurora-play-demo:seen";

function readAccounts(): DeviceAccount[] {
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * /igaming: Aurora Play, a fictional casino and sportsbook, inside the Demo
 * Center. Everything Didit does here runs on the visitor's own sandbox
 * records through lib/didit: Authentication at sign-up, signals from the
 * first load, the age check and the ID step-up in the web SDK modal, and
 * every cashier action as a monitored transaction from the browser.
 */
export function AuroraDemo() {
  const didit = useDidit();
  const live = useLive(auroraPlay.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modal, setModal] = React.useState<Modal>(null);
  const [cashierKey, setCashierKey] = React.useState<string | null>(null);
  const [offerKey, setOfferKey] = React.useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = React.useState(false);
  const [consoleTab, setConsoleTab] = React.useState("person");
  const [toast, setToast] = React.useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);
  const [accounts, setAccounts] = React.useState<DeviceAccount[]>([]);
  const [seen, setSeen] = React.useState<Set<StepId>>(new Set());
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const joining = React.useRef(false);
  const contextRef = React.useRef({
    person: "",
    depositedBefore: 0,
    previous: null as string | null,
    accounts: 1,
  });

  const emit = React.useCallback(
    (signal: AuroraSignal) => {
      const context = contextRef.current;
      const inputs =
        signal.type === "check-started"
          ? checkStarted(signal.check)
          : signal.type === "check-decided"
            ? checkDecided(signal.check, signal.summary)
            : signal.type === "transaction"
              ? transactionEvents(signal.item, {
                  person: context.person,
                  depositedBefore: context.depositedBefore,
                  previous: context.previous,
                  accountsOnDevice: context.accounts,
                })
              : recordEvents(
                  signal.record,
                  {
                    kind: signal.record.actionType as ActivityItem["kind"],
                    amount: signal.record.amount,
                  },
                  {
                    person: context.person,
                    depositedBefore:
                      context.depositedBefore - signal.record.amount,
                    previous: context.previous,
                    accountsOnDevice: context.accounts,
                  },
                ).filter(
                  (input) =>
                    !input.key?.endsWith("-next") &&
                    !input.key?.endsWith("-rule"),
                );

      // Oldest first, so the most important lands on top.
      for (const input of inputs) live.push(input);
    },
    [live.push],
  );

  const aurora = useAurora(emit);
  const { state, hydrated, totals } = aurora;
  const auth = didit.auth;
  const authOn = didit.authEnabled;
  const ageStatus = state?.age?.summary?.status ?? null;
  const ageApproved = ageStatus === "Approved";
  const person = state
    ? (state.kyc?.summary?.fullName ?? (state.name || state.email))
    : (auth?.email ?? null);
  const previous =
    accounts.find((account) => account.playerId !== state?.playerId)?.label ??
    null;

  contextRef.current = {
    person: person ?? "the player",
    depositedBefore: totals.depositedTotal,
    previous,
    accounts: Math.max(accounts.length, 1),
  };

  /* ── This browser's accounts, for the shared-device step ── */

  React.useEffect(() => {
    setAccounts(readAccounts());
    try {
      setSeen(
        new Set(JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? "[]")),
      );
    } catch {
      // Starts with no step seen.
    }
  }, []);

  React.useEffect(() => {
    if (!state) return;
    const label = state.kyc?.summary?.fullName ?? (state.name || state.email);
    const current = readAccounts();
    const known = current.find(
      (account) => account.playerId === state.playerId,
    );

    if (known?.label === label) return;
    const next = known
      ? current.map((account) =>
          account.playerId === state.playerId ? { ...account, label } : account,
        )
      : [
          ...current,
          { playerId: state.playerId, label, createdAt: state.createdAt },
        ];

    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
    setAccounts(next);
  }, [state?.playerId, state?.name, state?.kyc?.summary?.fullName]);

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

  /* ── Authentication: the session, then the player and the age check ── */

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
      joining.current
    )
      return;
    joining.current = true;
    setModal(null);
    aurora.join("", auth.email ?? "").finally(() => {
      joining.current = false;
    });
  }, [authOn, hydrated, auth?.status, state]);

  // Back from the hosted sign-out for a second account: straight to sign-up.
  React.useEffect(() => {
    if (!hydrated || state) return;
    if (
      window.sessionStorage.getItem(SECOND_KEY) === "1" &&
      auth?.status !== "signed-in"
    ) {
      setModal("signup");
    }
  }, [hydrated, state, auth?.status]);

  /* ── The age check result ── */

  React.useEffect(() => {
    if (!state?.age?.summary || state.ageSeen) return;
    if (ageApproved) {
      aurora.enterLobby();
      setToast({
        tone: "info",
        text: "You're 18 or over. Welcome to Aurora Play.",
      });
    } else {
      setToast({
        tone: "error",
        text: sessionView("age", state.age.summary.status).message,
      });
    }
  }, [state?.age?.summary?.status, state?.ageSeen]);

  React.useEffect(() => {
    if (!aurora.notice) return;
    setToast({ tone: aurora.notice.tone, text: aurora.notice.text });
  }, [aurora.notice]);

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
    aurora.resumeFromRedirect(sessionId);
    router.replace("/igaming", { scroll: false });
  }, [hydrated, searchParams]);

  /* ── Actions ── */

  const requireAccount = (then: () => void) => {
    if (!state) return setModal("signup");
    if (!ageApproved) {
      if (state.age && !state.age.summary) return aurora.resumeAge();

      return setToast({
        tone: "info",
        text: "Confirm your age first: it takes a selfie and a few seconds.",
      });
    }
    then();
  };

  const hostedSignUp = () => {
    setAuthBusy(true);
    window.sessionStorage.setItem(SIGNUP_INTENT, "1");
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
    window.sessionStorage.removeItem(SECOND_KEY);
    void auth?.signUp("/igaming");
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
      setAuthError(authErrorMessage(error, "start"));

      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const emailVerify = async (code: string) => {
    if (!auth) return;
    setAuthBusy(true);
    setAuthError(null);
    window.sessionStorage.setItem(SIGNUP_INTENT, "1");
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
    window.sessionStorage.removeItem(SECOND_KEY);
    try {
      const result = await auth.emailCode.verify(code);

      if (result.status !== "signed_in")
        setAuthError("That code did not work. Check it and try again.");
    } catch (error) {
      setAuthError(authErrorMessage(error, "verify"));
    } finally {
      setAuthBusy(false);
    }
  };

  const cookieJoin = async (name: string, email: string) => {
    window.sessionStorage.removeItem(SECOND_KEY);
    await aurora.join(name, email);
    setModal(null);
    didit.refreshToken(auroraPlay.id);
    didit.track(auroraPlay.id, {
      category: "auth",
      actionType: "signup",
      payload: { method: "form" },
    });
  };

  const deposit = async (amount: number) => {
    const item = await aurora.deposit(amount);

    if (item) setCashierKey(item.key);
  };

  const withdraw = async (amount: number) => {
    const item = await aurora.withdraw(amount);

    if (item) setCashierKey(item.key);
  };

  const claim = () =>
    requireAccount(async () => {
      if (totals.bonusClaimed)
        return setToast({
          tone: "info",
          text: "Your welcome offer is already in your balance.",
        });
      const item = await aurora.claimBonus();
      const status = item?.record?.status;

      if (status === "APPROVED") {
        setToast({
          tone: "info",
          text: `Welcome offer added: ${formatMoney(WELCOME_BONUS)} in free spins.`,
        });
      } else if (item?.record) {
        setOfferKey(item.key);
        setModal("offer");
      }
    });

  const play = (game: string) =>
    requireAccount(async () => {
      if (totals.balance < 10) return setModal("cashier");
      const item = await aurora.bet(10, game);

      setToast({
        tone: item?.record?.status === "APPROVED" ? "info" : "error",
        text: item?.record
          ? `${game}: a 10.00 EUR spin, ${item.record.status === "APPROVED" ? "approved" : item.record.status.toLowerCase().replace(/_/g, " ")}.`
          : (item?.error ?? "The spin did not go through."),
      });
    });

  const startSecondAccount = async () => {
    setModal(null);
    if (authOn && auth?.status === "signed-in") {
      window.sessionStorage.setItem(SECOND_KEY, "1");
      aurora.reset();
      await auth.signOut("/igaming");

      return;
    }
    window.sessionStorage.setItem(SECOND_KEY, "1");
    aurora.openSecondAccount();
    setModal("signup");
  };

  // Signs the player out of the casino: Didit Authentication's session when it
  // is on, else the casino's own player cookie. The device's account list
  // stays, as the shared-device check needs it.
  const signOut = async () => {
    setModal(null);
    setConsoleOpen(false);
    if (authOn && auth?.status === "signed-in") {
      // Not joined again while the hosted sign-out redirects.
      joining.current = true;
      aurora.reset();
      await auth.signOut("/igaming");

      return;
    }
    aurora.reset();
    await fetch("/api/igaming/player", { method: "DELETE" }).catch(
      () => undefined,
    );
  };

  const restart = async () => {
    aurora.reset();
    live.clear();
    window.localStorage.removeItem(ACCOUNTS_KEY);
    window.sessionStorage.removeItem(SECOND_KEY);
    window.sessionStorage.removeItem(SEEN_KEY);
    setAccounts([]);
    setSeen(new Set());
    setModal(null);
    setConsoleOpen(false);
    if (authOn && auth?.status === "signed-in") await auth.signOut("/igaming");
  };

  /* ── The five steps ── */

  const activity = state?.activity ?? [];
  const fraudCaught = activity.some(
    (item) =>
      item.kind === "bonus_claim" &&
      ["IN_REVIEW", "DECLINED"].includes(item.record?.status ?? ""),
  );
  const done = new Set<StepId>();

  if (state || auth?.status === "signed-in") done.add("signup");
  if (ageApproved) done.add("verify");
  if (
    activity.some(
      (item) => item.kind === "deposit" && item.record?.status === "APPROVED",
    )
  )
    done.add("transact");
  if (fraudCaught || seen.has("fraud")) done.add("fraud");
  if (seen.has("console")) done.add("console");

  React.useEffect(() => {
    if (fraudCaught && !seen.has("fraud")) markSeen("fraud");
  }, [fraudCaught]);

  const step: StepId = consoleOpen
    ? "console"
    : modal === "offer"
      ? "fraud"
      : modal === "cashier"
        ? "transact"
        : modal === "signup"
          ? previous && !state
            ? "fraud"
            : "signup"
          : ((
              ["signup", "verify", "transact", "fraud", "console"] as StepId[]
            ).find((id) => !done.has(id)) ?? "console");

  const onStep = (target: StepId) => {
    switch (target) {
      case "signup":
        if (!state) setModal("signup");
        break;
      case "verify":
        if (!state) setModal("signup");
        else if (!ageApproved) {
          if (state.age && !state.age.summary) aurora.resumeAge();
          else void aurora.retryAge();
        }
        break;
      case "transact":
        requireAccount(() => setModal("cashier"));
        break;
      case "fraud":
        if (!state) setModal("signup");
        else if (!totals.bonusClaimed && !state.secondAccount) {
          setToast({
            tone: "info",
            text: "Claim the welcome offer first, then open a second account on this device.",
          });
        } else void startSecondAccount();
        break;
      default:
        openConsole(true);
    }
  };

  const openConsole = (open: boolean, tab?: string) => {
    setConsoleOpen(open);
    if (tab) setConsoleTab(tab);
    if (open) markSeen("console");
  };

  /* ── What the live layer shows ── */

  const cashierItem = activity.find((item) => item.key === cashierKey) ?? null;
  const offerItem = activity.find((item) => item.key === offerKey) ?? null;
  const callouts: CalloutSpec[] = [];

  if (modal === "signup" && authOn && didit.device) {
    callouts.push({
      id: "bot",
      anchor: "passkey",
      tone: "sig",
      side: "right",
      title: `${didit.device.botScore < 0.5 ? "Human" : "Likely a bot"} · bot score ${didit.device.botScore.toFixed(2)}`,
    });
  } else if (
    modal === "cashier" &&
    cashierItem?.record?.status === "AWAITING_USER"
  ) {
    const hit = cashierItem.record.ruleHits[0];

    callouts.push({
      id: "rule",
      anchor: "hold",
      tone: "hold",
      side: "left",
      title: hit ? `Rule hit: ${ruleName(hit.title)}` : "Held for an ID check",
    });
  } else if (modal === "offer" && previous) {
    callouts.push({
      id: "device",
      anchor: "account",
      tone: "sig",
      side: "left",
      title: `Same device as ${previous}`,
    });
  } else if (!modal && state && ageApproved) {
    callouts.push({
      id: "monitored",
      anchor: "balance",
      tone: "txn",
      side: "left",
      title: "Every deposit is monitored",
    });
  }

  const latest = (product: string) =>
    live.events.find((event) => event.product === product);
  const approved = activity.filter(
    (item) => item.record?.status === "APPROVED",
  ).length;
  const tiles: ProductTile[] | undefined =
    !modal && state && ageApproved
      ? [
          ...(authOn
            ? [
                {
                  product: "authentication" as const,
                  label: "Authentication",
                  value: auth?.methods.includes("passkey")
                    ? "Passkey"
                    : auth?.methods.includes("code")
                      ? "Email code"
                      : "Signed in",
                },
              ]
            : []),
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
            value:
              state.kyc?.summary?.status === "Approved"
                ? "ID verified"
                : state.age?.summary?.estimatedAge
                  ? `Age ${state.age.summary.estimatedAge}`
                  : "Age approved",
          },
          {
            product: "transactions",
            label: "Transactions",
            value: `${approved} approved`,
          },
        ]
      : undefined;

  const consoleTabs = auroraConsole({
    player: state
      ? {
          playerId: state.playerId,
          name: state.kyc?.summary?.fullName ?? state.name,
          email: state.email,
          createdAt: state.createdAt,
        }
      : null,
    age: state?.age?.summary ?? null,
    kyc: state?.kyc?.summary ?? null,
    ageCheck: state?.age
      ? {
          sessionId: state.age.sessionId,
          startedAt: state.age.startedAt ?? null,
        }
      : null,
    kycCheck: state?.kyc
      ? {
          sessionId: state.kyc.sessionId,
          startedAt: state.kyc.startedAt ?? null,
        }
      : null,
    activity,
    events: live.events,
    device: didit.device,
    accounts: accounts.length
      ? accounts
      : state
        ? [
            {
              playerId: state.playerId,
              label: person ?? state.email,
              createdAt: state.createdAt,
            },
          ]
        : [],
    signIn: authOn
      ? auth?.methods.includes("passkey")
        ? "Passkey"
        : auth?.methods.includes("code")
          ? "Email code"
          : "Didit"
      : null,
    totals,
    now: Date.now(),
  });

  const integration = [
    "// Aurora Play: the whole Didit integration",
    ...(authOn ? ["<DiditAuth><SignUp /></DiditAuth>   // auth-nextjs"] : []),
    "configureEvents()                    // signals",
    "await startVerification({ url })     // sdk-web",
    "await submitTransaction({ transactionToken, transaction })",
    latest("transactions")?.code ?? "",
  ].filter(Boolean);

  return (
    <DemoShell
      app="aurora"
      callouts={callouts}
      consoleOpen={consoleOpen}
      consoleTab={consoleTab}
      consoleTabs={consoleTabs}
      demo={auroraPlay}
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
      <Casino
        account={
          state || (authOn && auth?.status === "signed-in")
            ? {
                initial: (person || "A").charAt(0).toUpperCase(),
                name: person || "Player",
                email: state?.email || auth?.email || null,
                // The cashier opens once the age check is approved.
                balance: state && ageApproved ? totals.balance : null,
              }
            : null
        }
        toast={toast}
        onClaim={claim}
        onDeposit={() => setModal("cashier")}
        onGame={play}
        onNav={(nav: NavId) => {
          if (nav === "cashier") requireAccount(() => setModal("cashier"));
          if (nav === "promotions") claim();
        }}
        onResponsible={() => requireAccount(() => setModal("responsible"))}
        onSignOut={() => void signOut()}
        onSignIn={() =>
          authOn ? void auth?.signIn("/igaming") : setModal("signup")
        }
        onSignUp={() => setModal("signup")}
        onTerms={() =>
          setToast({
            tone: "info",
            text: "Welcome offer: 100 free spins and a 100% match up to 200 EUR on the first deposit. Wagering 30x. 18+.",
          })
        }
      >
        {modal === "signup" ? (
          <SignUpModal
            authEnabled={authOn}
            busy={authBusy || aurora.busy === "join"}
            error={authError}
            previous={!state ? previous : null}
            onClose={() => {
              setModal(null);
              setAuthBusy(false);
            }}
            onEmailStart={emailStart}
            onEmailVerify={(code) => void emailVerify(code)}
            onHosted={hostedSignUp}
            onJoin={(name, email) => void cookieJoin(name, email)}
          />
        ) : null}
        {modal === "cashier" ? (
          <CashierModal
            balance={totals.balance}
            busy={aurora.busy !== null}
            deposited={totals.depositedTotal}
            limit={state?.depositLimit ?? null}
            result={cashierItem}
            onClose={() => {
              setModal(null);
              setCashierKey(null);
            }}
            onDeposit={(amount) => void deposit(amount)}
            onVerify={() => aurora.startKyc()}
            onWithdraw={(amount) => void withdraw(amount)}
          />
        ) : null}
        {modal === "offer" && offerItem?.record ? (
          <OfferModal
            ago={(() => {
              const since = ago(state?.createdAt ?? Date.now(), Date.now());

              return since === "now" ? "just now" : `${since} ago`;
            })()}
            email={state?.email || person || "This account"}
            status={offerItem.record.status}
            onClose={() => setModal(null)}
            onDeposit={() => setModal("cashier")}
          />
        ) : null}
        {modal === "responsible" ? (
          <ResponsibleModal
            busy={aurora.busy !== null}
            excluded={state?.selfExcluded ?? false}
            limit={state?.depositLimit ?? null}
            onClose={() => setModal(null)}
            onExclude={() => void aurora.selfExclude()}
            onLimit={(amount) => void aurora.setLimit(amount)}
          />
        ) : null}
      </Casino>
    </DemoShell>
  );
}
