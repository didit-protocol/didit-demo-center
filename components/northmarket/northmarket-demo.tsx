"use client";

import type { CalloutSpec } from "@/components/didit-live/callouts";
import type { ProductTile } from "@/components/didit-live/live-feed";
import type { StepId } from "@/lib/didit/config";
import type { LiveInput } from "@/lib/didit/live";
import type { TransactionSummary } from "@/lib/marketplace/summaries";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  CheckoutScreen,
  HubScreen,
  OutletScreen,
  SignUpScreen,
  Store,
} from "./store";
import { useNorthmarket } from "./use-northmarket";

import { DemoShell } from "@/components/didit-live/demo-shell";
import { STEPS } from "@/lib/didit/config";
import { northmarket } from "@/lib/didit/demos";
import { ago } from "@/lib/didit/live";
import { SIGNUP_INTENT, useDidit } from "@/lib/didit/provider";
import { useLive } from "@/lib/didit/use-live";
import { northmarketConsole } from "@/lib/marketplace/console-pages";
import {
  ageStarted,
  authEvent,
  companyName,
  deviceEvents,
  kybDecided,
  kybStarted,
  ruleName,
  sellerVerified,
  transactionEvents,
} from "@/lib/marketplace/live-events";
import {
  CHECKOUT,
  SELLER,
  payoutDay as nextPayoutDay,
} from "@/lib/marketplace/northmarket";

type Screen = "signup" | "hub" | "checkout" | "outlet";

const OWN_SIGNUP = "northmarket-demo:signup";
const PENDING_SHOP = "northmarket-demo:shop";
const SECOND_KEY = "northmarket-demo:second";
const SEEN_KEY = "northmarket-demo:seen";

const STEP_IDS = STEPS.map((item) => item.id) as StepId[];

/**
 * /marketplace: Northmarket, a fictional resale marketplace, inside the Demo
 * Center. Everything Didit does here runs on the visitor's own sandbox
 * records through lib/didit: Authentication when a seller opens a shop,
 * signals from the first load, the seller KYB and the buyer's age check in
 * the web SDK modal, and every sign-up and order as a monitored transaction
 * from the browser.
 */
export function NorthmarketDemo() {
  const didit = useDidit();
  const live = useLive(northmarket.id);
  const market = useNorthmarket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [screen, setScreen] = React.useState<Screen | null>(null);
  const [second, setSecond] = React.useState(false);
  const [consoleOpen, setConsoleOpen] = React.useState(false);
  const [consoleTab, setConsoleTab] = React.useState("business");
  const [seen, setSeen] = React.useState<Set<StepId>>(new Set());
  const [toast, setToast] = React.useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const opening = React.useRef(false);
  const stepParam = React.useRef<string | null>(null);

  const auth = didit.auth;
  const authOn = didit.authEnabled;
  const view = market.view;
  const sellers = view?.sellers ?? [];
  const first = sellers[0] ?? null;
  const outlet = sellers[1] ?? null;
  const transactions = view?.transactions ?? [];
  const order = transactions.find((tx) => tx.kind === "purchase") ?? null;
  const outletSignup = outlet?.signup
    ? (transactions.find((tx) => tx.uuid === outlet.signup) ?? null)
    : null;
  const kyb = first?.kyb ?? null;
  const approved = kyb?.status.toLowerCase() === "approved";
  const company = first ? companyName(kyb, first.company) : null;
  const current: Screen =
    screen ?? (!first ? "signup" : outlet ? "outlet" : "hub");

  const push = (inputs: LiveInput[]) => {
    for (const input of inputs) live.push(input);
  };

  /* ── This visit's steps and the second shop ── */

  React.useEffect(() => {
    setSecond(window.sessionStorage.getItem(SECOND_KEY) === "1");
    try {
      setSeen(
        new Set(JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? "[]")),
      );
    } catch {
      // Starts with no step seen.
    }
  }, []);

  const markSeen = (step: StepId) =>
    setSeen((before) => {
      const next = new Set(before).add(step);

      window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(next)));

      return next;
    });

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ── Signals: this device, once per visit ── */

  React.useEffect(() => {
    if (!didit.device) return;
    if (live.events.some((event) => event.id === "sig-device")) return;
    push(deviceEvents(didit.device));
  }, [didit.device]);

  /* ── Authentication: the session, then the shop ── */

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
          ? `this ${didit.device.os === "macOS" ? "Mac" : didit.device.os} device`
          : null,
      }),
    );
  }, [auth?.sessionId, auth?.status]);

  const openShop = async (shop: string) => {
    const previous = first && second ? first.shop : null;
    const result = await market.openShop(shop || SELLER.shop);

    window.sessionStorage.removeItem(PENDING_SHOP);
    if (!result.ok) {
      setToast({ tone: "error", text: result.error });

      return;
    }
    push(
      transactionEvents(result.data.signup, {
        shop: result.data.seller.shop,
        previous,
      }),
    );
    window.sessionStorage.removeItem(SECOND_KEY);
    setSecond(false);
    setScreen(previous ? "outlet" : "hub");
  };

  // Back from the hosted sign-up (or an email code): open the shop for them.
  React.useEffect(() => {
    if (!authOn || !view || auth?.status !== "signed-in" || opening.current)
      return;
    const own = sellers.some(
      (seller) => seller.id === `${northmarket.vendorPrefix}${auth.userId}`,
    );
    const pending = window.sessionStorage.getItem(PENDING_SHOP);

    if (own || (!pending && sellers.length > 0)) return;
    opening.current = true;
    void openShop(pending ?? SELLER.shop).finally(() => {
      opening.current = false;
    });
  }, [authOn, view, auth?.status, auth?.userId]);

  /* ── Decisions that arrived while the visitor was away ── */

  React.useEffect(() => {
    if (!kyb || !first || /not started|in progress/i.test(kyb.status)) return;
    const [input] = kybDecided(kyb, first.company);
    const before = live.events.find((event) => event.id === input.key);

    if (before?.title !== input.title) push([input]);
  }, [kyb?.status]);

  React.useEffect(() => {
    if (current !== "checkout" || !approved || !company) return;
    if (live.events.some((event) => event.id === "seller-verified")) return;
    live.push(sellerVerified(company));
  }, [current, approved]);

  // The hosted flow returns here when it finishes on another device; the
  // old /marketplace?chapter= links arrive as ?step=.
  React.useEffect(() => {
    if (!view) return;
    const session = searchParams.get("verificationSessionId");
    const step = searchParams.get("step");

    if (!session && !step) return;
    if (session) void market.refresh();
    if (step && STEP_IDS.includes(step as StepId) && !stepParam.current) {
      stepParam.current = step;
      onStep(step as StepId);
    }
    router.replace("/marketplace", { scroll: false });
  }, [view !== null, searchParams]);

  /* ── Actions ── */

  const signedIn = auth?.status === "signed-in";

  const hostedSignUp = (shop: string) => {
    setAuthBusy(true);
    window.sessionStorage.setItem(PENDING_SHOP, shop);
    window.sessionStorage.setItem(SIGNUP_INTENT, "1");
    window.sessionStorage.setItem(OWN_SIGNUP, "1");
    void auth?.signUp("/marketplace");
  };

  const emailStart = async (email: string, shop: string) => {
    if (!auth) return false;
    setAuthBusy(true);
    setAuthError(null);
    window.sessionStorage.setItem(PENDING_SHOP, shop);
    try {
      const result = await auth.emailCode.start(email);

      if (result.status === "code_sent") return true;
      setAuthError(
        "Didit's bot protection asks for one more proof. Use a passkey instead.",
      );

      return false;
    } catch (problem) {
      setAuthError(
        problem instanceof Error
          ? problem.message
          : "The code could not be sent.",
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
    } catch (problem) {
      setAuthError(
        problem instanceof Error ? problem.message : "That code did not work.",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const join = async (shop: string) => {
    await openShop(shop);
    didit.refreshToken(northmarket.id);
    didit.track(northmarket.id, {
      category: "auth",
      actionType: "signup",
      payload: { method: "form" },
    });
  };

  const owner = kyb?.people.find((person) => person.kycUrl) ?? null;

  const verifyBusiness = async () => {
    if (!first) return;
    const result =
      owner?.kycUrl && !kyb?.url
        ? await market.checkOwner(first.id, owner.kycUrl)
        : await market.verifyBusiness(first.id, () =>
            push(kybStarted(first.shop)),
          );

    if (!result.ok) setToast({ tone: "error", text: result.error });
    else if (result.data) push(kybDecided(result.data, first.company));
  };

  const placeOrder = async () => {
    const result = await market.placeOrder(
      first ? { id: first.id, shop: first.shop } : null,
    );

    if (!result.ok) return setToast({ tone: "error", text: result.error });
    push(
      transactionEvents(result.data, {
        shop: first?.shop ?? "",
        previous: null,
      }),
    );
  };

  const confirmAge = async (held: TransactionSummary) => {
    live.push(ageStarted());
    const result = await market.confirmAge(held);

    if (!result.ok) return setToast({ tone: "error", text: result.error });
    push(
      transactionEvents(result.data, {
        shop: first?.shop ?? "",
        previous: null,
      }),
    );
    if (result.data.status === "AWAITING_USER")
      setToast({
        tone: "info",
        text: "The order still waits for the age check. Finish it to place the order.",
      });
  };

  const startSecondShop = async () => {
    window.sessionStorage.setItem(SECOND_KEY, "1");
    window.sessionStorage.setItem(PENDING_SHOP, SELLER.secondShop);
    setSecond(true);
    setScreen("signup");
    // A second shop is a second account: sign out, then sign up again.
    if (authOn && signedIn) await auth?.signOut("/marketplace");
  };

  const restart = async () => {
    await market.reset();
    live.clear();
    for (const key of [SECOND_KEY, SEEN_KEY, PENDING_SHOP, OWN_SIGNUP])
      window.sessionStorage.removeItem(key);
    setSecond(false);
    setSeen(new Set());
    setScreen(null);
    setConsoleOpen(false);
    if (authOn && signedIn) await auth?.signOut("/marketplace");
  };

  const openConsole = (open: boolean, tab?: string) => {
    setConsoleOpen(open);
    if (tab) setConsoleTab(tab);
    if (open) markSeen("console");
  };

  /* ── The five steps ── */

  const done = new Set<StepId>();

  if (first) done.add("signup");
  if (approved) done.add("verify");
  if (order?.status === "APPROVED") done.add("transact");
  if (outlet) done.add("fraud");
  if (seen.has("console")) done.add("console");

  const step: StepId = consoleOpen
    ? "console"
    : current === "signup"
      ? second && first
        ? "fraud"
        : "signup"
      : current === "outlet"
        ? "fraud"
        : current === "checkout" || (current === "hub" && approved)
          ? "transact"
          : "verify";

  function onStep(target: StepId) {
    setConsoleOpen(false);
    if (target === "console") return openConsole(true);
    if (!first) {
      setScreen("signup");
      if (target !== "signup")
        setToast({
          tone: "info",
          text: "Open your shop first: it takes a passkey and a shop name.",
        });

      return;
    }
    switch (target) {
      case "signup":
        setScreen("hub");
        break;
      case "verify":
        setScreen("hub");
        if (!approved && !market.busy) void verifyBusiness();
        break;
      case "transact":
        setScreen("checkout");
        break;
      case "fraud":
        if (outlet) setScreen("outlet");
        else void startSecondShop();
        break;
    }
  }

  /* ── What the live layer shows ── */

  const callouts: CalloutSpec[] = [];
  const held = order?.status === "AWAITING_USER" ? order : null;

  if (current === "signup" && didit.device) {
    callouts.push({
      id: "bot",
      anchor: authOn ? "passkey" : "open-shop",
      tone: "sig",
      side: "right",
      title: `${didit.device.botScore < 0.5 ? "Human" : "Likely a bot"} · bot score ${didit.device.botScore.toFixed(2)}`,
    });
  } else if (current === "hub" && approved && kyb) {
    const owners = kyb.people.filter(
      (person) => person.kycStatus === "Approved",
    ).length;

    callouts.push({
      id: "kyb",
      anchor: "verified",
      tone: "ver",
      side: "right",
      title: owners
        ? `KYB approved · ${owners} ${owners === 1 ? "owner" : "owners"}`
        : "KYB approved",
    });
  } else if (current === "hub" && !kyb && !market.busy) {
    callouts.push({
      id: "payouts",
      anchor: "verify",
      tone: "txn",
      side: "down",
      title: "Payouts wait for an approved KYB",
    });
  } else if (current === "checkout" && held) {
    const hit = held.rules[0];

    callouts.push({
      id: "rule",
      anchor: "selfie",
      tone: "hold",
      side: "down",
      line: 32,
      title: hit
        ? `Rule hit: ${ruleName(hit.title).replace(/^Orders/, "orders")}`
        : "Held for an age check",
    });
  } else if (current === "outlet" && first && outletSignup) {
    if (outletSignup.status !== "APPROVED")
      callouts.push({
        id: "device",
        anchor: "paused",
        tone: "sig",
        side: "right",
        title: `Same device as ${first.shop}`,
      });
  }

  const tiles: ProductTile[] | undefined =
    current === "hub" && approved
      ? [
          ...(authOn && signedIn
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
            value: "KYB approved",
          },
          {
            product: "transactions",
            label: "Transactions",
            value: `${transactions.length} checked`,
          },
        ]
      : undefined;

  const person =
    current === "checkout"
      ? CHECKOUT.buyer.name
      : current === "outlet" && outlet
        ? outlet.shop
        : (company ?? auth?.email ?? null);

  const consoleTabs = northmarketConsole({
    shops: sellers.map((seller) => ({
      id: seller.id,
      shop: seller.shop,
      company: seller.company,
      kyb: seller.kyb,
    })),
    transactions,
    events: live.events,
    email: auth?.email ?? null,
    device: didit.device,
    signIn: authOn
      ? auth?.methods.includes("passkey")
        ? "Passkey"
        : auth?.methods.includes("code")
          ? "Email code"
          : "Didit"
      : null,
    now: Date.now(),
  });

  const integration = [
    "// Northmarket: the whole Didit integration",
    ...(authOn ? ["<DiditAuth><SignUp /></DiditAuth>   // auth-nextjs"] : []),
    "configureEvents()                    // signals",
    "await startVerification({ url })     // seller KYB, sdk-web",
    "await submitTransaction({ transactionToken, transaction })",
    "if (result.actionRequired) await startVerification(...)",
  ];

  const opened = outletSignup
    ? (() => {
        const since = ago(new Date(outletSignup.at).getTime(), Date.now());

        return since === "now" ? "just now" : `${since} ago`;
      })()
    : "just now";

  return (
    <DemoShell
      app="northmarket"
      callouts={callouts}
      consoleOpen={consoleOpen}
      consoleTab={consoleTab}
      consoleTabs={consoleTabs}
      demo={northmarket}
      done={done}
      events={live.events}
      integration={integration}
      person={person}
      quiet={market.busy === "kyb" || market.busy === "age"}
      step={step}
      tiles={tiles}
      onConsole={openConsole}
      onRestart={() => void restart()}
      onStep={onStep}
    >
      <Store
        bodyClass={`is-${current}${current === "hub" || current === "outlet" ? " is-scroll" : ""}`}
        category={current === "checkout" ? "Cameras" : "All"}
        toast={
          toast ?? (market.error ? { tone: "error", text: market.error } : null)
        }
        visitor={
          current === "checkout"
            ? "buyer"
            : first && current !== "signup"
              ? "seller"
              : "guest"
        }
        onLogIn={() =>
          authOn ? void auth?.signIn("/marketplace") : setScreen("signup")
        }
        onSellerHub={() => setScreen(first ? "hub" : "signup")}
      >
        {current === "signup" ? (
          <SignUpScreen
            authEnabled={authOn}
            busy={authBusy || market.busy === "shop"}
            error={authError}
            previous={second && first ? first.shop : null}
            onEmailStart={emailStart}
            onEmailVerify={(code) => void emailVerify(code)}
            onHosted={hostedSignUp}
            onJoin={(shop) => void join(shop)}
          />
        ) : null}
        {current === "hub" && first ? (
          <HubScreen
            busy={market.busy === "kyb"}
            canContinue={Boolean(kyb?.url)}
            owner={kyb?.url ? null : (owner?.name ?? null)}
            company={company ?? first.company}
            kyb={kyb?.status ?? null}
            payoutDay={nextPayoutDay(Date.now())}
            shop={first.shop}
            onBuyerView={() => setScreen("checkout")}
            onVerify={() => void verifyBusiness()}
          />
        ) : null}
        {current === "checkout" ? (
          <CheckoutScreen
            busy={
              market.busy === "order" || market.busy === "age"
                ? market.busy
                : null
            }
            order={order}
            sellerShop={first?.shop ?? SELLER.shop}
            verifiedSeller={approved ? company : null}
            onChange={() => setScreen(first ? "hub" : "signup")}
            onPlace={() => void placeOrder()}
            onSelfie={() => held && void confirmAge(held)}
          />
        ) : null}
        {current === "outlet" && outlet ? (
          <OutletScreen
            device={
              didit.device
                ? `${didit.device.browser} on ${didit.device.os}`
                : null
            }
            firstVisit={didit.device?.firstVisit ?? null}
            opened={opened}
            previous={first?.shop ?? SELLER.shop}
            shop={outlet.shop}
            signup={outletSignup}
          />
        ) : null}
      </Store>
    </DemoShell>
  );
}
