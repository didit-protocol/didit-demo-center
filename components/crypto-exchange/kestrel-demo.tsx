"use client";

import type { CalloutSpec } from "@/components/didit-live/callouts";
import type { ProductTile } from "@/components/didit-live/live-feed";
import type { StepId } from "@/lib/didit/config";
import type { ActivityItem } from "@/lib/crypto-exchange/transactions";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { type KycBanner, Exchange } from "./exchange";
import { DepositModal, type WithdrawPreset, WithdrawModal } from "./modals";
import { type KestrelSignal, useKestrel } from "./use-kestrel";

import { DemoShell } from "@/components/didit-live/demo-shell";
import { kestrelConsole } from "@/lib/crypto-exchange/console-pages";
import {
  authEvent,
  deviceEvents,
  transactionEvents,
  verificationDecided,
  verificationStarted,
} from "@/lib/crypto-exchange/live-events";
import {
  SANCTIONED_WALLET,
  withdrawalStage,
} from "@/lib/crypto-exchange/transactions";
import { kestrel } from "@/lib/didit/demos";
import { SIGNUP_INTENT, useDidit } from "@/lib/didit/provider";
import { useLive } from "@/lib/didit/use-live";

type Modal = "deposit" | "withdraw" | null;

const SEEN_KEY = "kestrel-demo:seen";
const OWN_SIGNUP = "kestrel-demo:signup";

/**
 * /crypto-exchange: Kestrel, a fictional crypto exchange, inside the Demo
 * Center. Everything Didit does here runs on the visitor's own sandbox
 * records through lib/didit: Authentication at sign-up, signals from the
 * first load, the KYC and AML in the web SDK modal before the first deposit,
 * and every deposit and withdrawal as a monitored transaction from the
 * browser, with the Travel Rule, the selfie step-up and wallet screening.
 */
export function KestrelDemo() {
  const didit = useDidit();
  const live = useLive(kestrel.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modal, setModal] = React.useState<Modal>(null);
  const [depositAsset, setDepositAsset] = React.useState<"BTC" | "ETH">("BTC");
  const [preset, setPreset] = React.useState<WithdrawPreset | null>(null);
  const [presetKey, setPresetKey] = React.useState(0);
  const [resultId, setResultId] = React.useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = React.useState(false);
  const [consoleTab, setConsoleTab] = React.useState("transaction");
  const [toast, setToast] = React.useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);
  const [seen, setSeen] = React.useState<Set<StepId>>(new Set());
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const eventsRef = React.useRef(live.events);

  eventsRef.current = live.events;

  const emit = React.useCallback(
    (signal: KestrelSignal) => {
      const inputs =
        signal.type === "verify-started"
          ? verificationStarted()
          : signal.type === "verify-decided"
            ? verificationDecided(signal.account)
            : transactionEvents(signal.item);

      for (const input of inputs) {
        const existing = eventsRef.current.find(
          (event) => event.id === input.key,
        );

        // A re-read with nothing new does not move an event back to the top.
        if (
          existing &&
          existing.title === input.title &&
          existing.detail === input.detail
        )
          continue;
        live.push(input);
      }
    },
    [live.push],
  );

  const ks = useKestrel(emit);
  const auth = didit.auth;
  const authOn = didit.authEnabled;
  const account = ks.account;
  const approved = account?.stage === "approved";
  const signedIn = Boolean(
    auth?.status === "signed-in" || ks.profile || account,
  );
  const person = account?.fullName ?? auth?.email ?? ks.profile?.email ?? null;

  /* ── Steps already seen in this visit ── */

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

  /* ── Authentication: the session, then the KYC ── */

  React.useEffect(() => {
    if (!auth?.sessionId || auth.status !== "signed-in") return;
    if (live.events.some((event) => event.id === `auth-${auth.sessionId}`))
      return;
    const signUp = window.sessionStorage.getItem(OWN_SIGNUP) === "1";

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

  // Straight after sign-up, the KYC opens: no deposit before it.
  React.useEffect(() => {
    if (!ks.hydrated || !signedIn || account) return;
    if (window.sessionStorage.getItem(OWN_SIGNUP) !== "1") return;
    window.sessionStorage.removeItem(OWN_SIGNUP);
    void ks.verify();
  }, [ks.hydrated, signedIn, account]);

  // The hosted flow redirects here when it finishes on another device.
  React.useEffect(() => {
    if (!ks.hydrated || !searchParams.get("verificationSessionId")) return;
    void ks.refreshAccount();
    router.replace("/crypto-exchange", { scroll: false });
  }, [ks.hydrated, searchParams]);

  React.useEffect(() => {
    if (ks.error && !modal) setToast({ tone: "error", text: ks.error });
  }, [ks.error]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ── Actions ── */

  const hostedSignUp = () => {
    setAuthBusy(true);
    window.sessionStorage.setItem(SIGNUP_INTENT, "1");
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
    void auth?.signUp("/crypto-exchange");
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

  const emailVerify = async (code: string) => {
    if (!auth) return;
    setAuthBusy(true);
    setAuthError(null);
    window.sessionStorage.setItem(SIGNUP_INTENT, "1");
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
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

  const ownJoin = (email: string, country: string) => {
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
    ks.join({ email, country });
  };

  const scrollToSignUp = () =>
    document
      .querySelector<HTMLInputElement>(
        '[aria-label="Create your account"] input, [data-callout="passkey"]',
      )
      ?.focus();

  /** Money moves only for a verified customer; anyone else is sent to the KYC. */
  const requireApproved = (then: () => void) => {
    if (!signedIn) {
      scrollToSignUp();

      return setToast({ tone: "info", text: "Create your account first." });
    }
    if (approved) return then();
    if (account?.stage === "review")
      return setToast({
        tone: "info",
        text: "Your verification is in review. Deposits open once it is approved.",
      });
    if (account?.stage === "declined")
      return setToast({
        tone: "error",
        text: "Your verification was declined, so this account cannot move funds.",
      });
    void ks.verify();
  };

  const openDeposit = (asset: "BTC" | "ETH" = "BTC") => {
    ks.setError(null);
    setDepositAsset(asset);
    setModal("deposit");
  };

  const openWithdraw = (next: WithdrawPreset, result: string | null = null) => {
    ks.setError(null);
    setPreset(next);
    setPresetKey((key) => key + 1);
    setResultId(result);
    setModal("withdraw");
  };

  const ownWithdrawal = (): WithdrawPreset => {
    const asset =
      ks.balances.BTC.available > 0 || ks.balances.ETH.available <= 0
        ? "BTC"
        : "ETH";
    const available = ks.balances[asset].available;

    return {
      asset,
      amount:
        available > 0
          ? String(Math.min(available, asset === "BTC" ? 0.8 : 1.5))
          : "",
      destination: "own-wallet",
      address: ks.wallets?.[asset] ?? "",
    };
  };

  const fraudWithdrawal = () => {
    const available = ks.balances.ETH.available;

    if (available <= 0) {
      setToast({
        tone: "info",
        text: "Deposit some ETH first, then try sending it to a sanctioned wallet.",
      });

      return openDeposit("ETH");
    }
    openWithdraw({
      asset: "ETH",
      amount: String(available),
      destination: "address",
      address: SANCTIONED_WALLET,
    });
  };

  const restart = async () => {
    await ks.reset();
    live.clear();
    window.sessionStorage.removeItem(SEEN_KEY);
    window.sessionStorage.removeItem(OWN_SIGNUP);
    setSeen(new Set());
    setModal(null);
    setConsoleOpen(false);
    if (authOn && auth?.status === "signed-in")
      await auth.signOut("/crypto-exchange");
  };

  const openConsole = (open: boolean, tab?: string) => {
    setConsoleOpen(open);
    if (tab) setConsoleTab(tab);
    if (open) markSeen("console");
  };

  /* ── The five steps ── */

  const activity = ks.activity;
  const blocked = activity.find(
    (item) =>
      item.kind === "withdrawal" && withdrawalStage(item.view) === "blocked",
  );
  const done = new Set<StepId>();

  if (signedIn) done.add("signup");
  if (approved) done.add("verify");
  if (
    activity.some(
      (item) => item.kind === "deposit" && item.view.status === "APPROVED",
    )
  )
    done.add("transact");
  if (blocked || seen.has("fraud")) done.add("fraud");
  if (seen.has("console")) done.add("console");

  React.useEffect(() => {
    if (blocked && !seen.has("fraud")) markSeen("fraud");
  }, [Boolean(blocked)]);

  const fraudOpen =
    modal === "withdraw" &&
    preset?.destination === "address" &&
    preset.address === SANCTIONED_WALLET;
  const step: StepId = consoleOpen
    ? "console"
    : fraudOpen
      ? "fraud"
      : modal
        ? "transact"
        : ks.busy === "verify"
          ? "verify"
          : ((
              ["signup", "verify", "transact", "fraud", "console"] as StepId[]
            ).find((id) => !done.has(id)) ?? "console");

  const onStep = (target: StepId) => {
    switch (target) {
      case "signup":
        if (!signedIn) scrollToSignUp();
        else
          setToast({ tone: "info", text: "You are signed in. Next: verify." });
        break;
      case "verify":
        if (approved)
          setToast({ tone: "info", text: "Your identity is verified." });
        else requireApproved(() => undefined);
        break;
      case "transact":
        requireApproved(() =>
          done.has("transact") ? openWithdraw(ownWithdrawal()) : openDeposit(),
        );
        break;
      case "fraud":
        requireApproved(fraudWithdrawal);
        break;
      default:
        openConsole(true, "transaction");
    }
  };

  /* ── What the live layer shows ── */

  const result: ActivityItem | null =
    activity.find((item) => item.id === resultId) ?? null;
  const callouts: CalloutSpec[] = [];
  const latest = activity[0];

  if (!signedIn && didit.device) {
    callouts.push({
      id: "bot",
      anchor: "passkey",
      tone: "sig",
      side: "right",
      title: `${didit.device.botScore < 0.5 ? "Human" : "Likely a bot"} · bot score ${didit.device.botScore.toFixed(2)}`,
    });
  } else if (modal === "withdraw" && result) {
    const stage = withdrawalStage(result.view);
    const score = result.view.screening?.riskScore;

    if (stage === "blocked") {
      callouts.push({
        id: "declined",
        anchor: "declined",
        tone: "stop",
        side: "left",
        title: `Wallet risk ${score ?? "high"}${result.view.screening?.walletSanctioned ? " · sanctions" : ""}`,
      });
    } else if (stage !== "review") {
      callouts.push({
        id: "travel",
        anchor: "travel-rule",
        tone: "txn",
        side: "left",
        title: "Travel Rule, built in",
      });
    }
  } else if (!modal && approved && latest?.kind === "deposit") {
    callouts.push({
      id: "screened",
      anchor: "activity-latest",
      tone: latest.view.status === "APPROVED" ? "txn" : "stop",
      side: "left",
      title:
        latest.view.status === "APPROVED"
          ? "Sending wallet screened"
          : `Wallet risk ${latest.view.screening?.riskScore ?? "high"} · sanctions`,
    });
  }

  const topRisk = Math.max(
    0,
    ...activity.map((item) => item.view.screening?.riskScore ?? 0),
  );
  const tiles: ProductTile[] | undefined =
    !modal && approved
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
          { product: "verification", label: "Verification", value: "Approved" },
          {
            product: "transactions",
            label: "Transactions",
            value: activity.length
              ? topRisk >= 75
                ? "Risk caught"
                : "Low risk"
              : "No transfers yet",
          },
        ]
      : undefined;

  const signIn = authOn
    ? auth?.methods.includes("passkey")
      ? "Passkey"
      : auth?.methods.includes("code")
        ? "Email code"
        : auth?.status === "signed-in"
          ? "Didit"
          : null
    : null;
  const consoleTabs = kestrelConsole({
    userId: account?.userId ?? null,
    email: auth?.email ?? ks.profile?.email ?? null,
    account,
    activity,
    events: live.events,
    device: didit.device,
    signIn,
    now: Date.now(),
  });

  const integration = [
    "// Kestrel: the whole Didit integration",
    ...(authOn ? ["<DiditAuth><SignUp /></DiditAuth>   // auth-nextjs"] : []),
    "configureEvents()                    // signals",
    "await startVerification({ url })     // sdk-web, KYC + AML",
    "const r = await submitTransaction({ transactionToken, transaction })",
    "if (r.actionRequired) await startVerification({ url: r.actionRequired.url })",
  ];

  const banner: KycBanner =
    !signedIn || approved
      ? null
      : account?.stage === "review"
        ? { kind: "review" }
        : account?.stage === "declined"
          ? { kind: "declined" }
          : account?.stage === "processing"
            ? { kind: "processing" }
            : { kind: "verify" };

  return (
    <DemoShell
      app="kestrel"
      callouts={callouts}
      consoleOpen={consoleOpen}
      consoleTab={consoleTab}
      consoleTabs={consoleTabs}
      demo={kestrel}
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
      <Exchange
        signUp={{
          authEnabled: authOn,
          busy: authBusy,
          error: authError,
          onHosted: hostedSignUp,
          onEmailStart: emailStart,
          onEmailVerify: (code) => void emailVerify(code),
          onJoin: ownJoin,
        }}
        signedIn={signedIn}
        toast={toast}
        trade={{
          name: person,
          activity,
          balances: ks.balances,
          banner,
          busy: ks.busy !== null,
          onVerify: () => void ks.verify(),
          onDeposit: () => requireApproved(() => openDeposit()),
          onWithdraw: () =>
            requireApproved(() => openWithdraw(ownWithdrawal())),
          onItem: (item) => {
            if (item.kind === "withdrawal")
              openWithdraw(
                {
                  asset: item.asset,
                  amount: item.view.amount,
                  destination: "own-wallet",
                  address: item.wallet,
                },
                item.id,
              );
            else openConsole(true, "transaction");
          },
        }}
        onSignIn={() =>
          authOn ? void auth?.signIn("/crypto-exchange") : scrollToSignUp()
        }
        onSignUp={scrollToSignUp}
      >
        {modal === "deposit" && ks.wallets ? (
          <DepositModal
            key={depositAsset}
            busy={ks.busy === "deposit"}
            error={ks.error}
            initialAsset={depositAsset}
            wallets={ks.wallets}
            onClose={() => setModal(null)}
            onDeposit={async (input) => {
              const item = await ks.deposit(input);

              if (item) setModal(null);
            }}
          />
        ) : null}
        {modal === "withdraw" && preset && ks.wallets ? (
          <WithdrawModal
            key={presetKey}
            balances={ks.balances}
            busy={ks.busy !== null}
            error={ks.error}
            preset={preset}
            result={result}
            wallets={ks.wallets}
            onAction={(item) => void ks.runAction(item)}
            onAnother={() =>
              openWithdraw({ ...preset, destination: "address", address: "" })
            }
            onClose={() => setModal(null)}
            onSupport={() =>
              setToast({
                tone: "info",
                text: "Kestrel support would take it from here. In this demo, open the console view to see what your team sees.",
              })
            }
            onWithdraw={async (input) => {
              const item = await ks.withdraw(input);

              if (item) setResultId(item.id);
            }}
          />
        ) : null}
      </Exchange>
    </DemoShell>
  );
}
