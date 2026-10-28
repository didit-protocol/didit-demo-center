"use client";

import type { ConsoleContext } from "@/lib/crypto-exchange/console";
import type { AccountView } from "@/lib/crypto-exchange/onboarding";

import * as React from "react";

import {
  type ActivityItem,
  type Asset,
  type CxWallets,
  type DepositSource,
  type TransactionView,
  type WithdrawalDestination,
  SANCTIONED_WALLET,
  balancesOf,
  buildDepositPayload,
  buildWithdrawalPayload,
  isSettled,
  newTxnId,
  randomWallets,
  submitErrorMessage,
  submittedView,
} from "@/lib/crypto-exchange/transactions";
import {
  type TransactionToken,
  openVerification,
  submitTransaction,
} from "@/lib/didit/browser";

export type KestrelAccount = AccountView & {
  userId: string;
  /** For Console deep links; null until the application has a transaction. */
  console: ConsoleContext | null;
};

/** Kestrel's own sign-up, when Didit Authentication is off. */
export interface Profile {
  email: string;
  country: string;
}

interface StoredState {
  version: 2;
  profile: Profile | null;
  wallets: CxWallets;
  activity: ActivityItem[];
  sessionUrl: string | null;
}

/** What just happened with Didit, for the live layer. */
export type KestrelSignal =
  | { type: "verify-started" }
  | { type: "verify-decided"; account: KestrelAccount }
  | { type: "transaction"; item: ActivityItem };

/** "verify" while the KYC modal is open, "verify-result" while its decision is read. */
export type Busy =
  "verify" | "verify-result" | "deposit" | "withdraw" | "action" | null;

const STORAGE_KEY = "kestrel-demo:v2";

/** Kestrel's own routes each make one or two Didit calls; past this, say so. */
const API_TIMEOUT_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fresh(): StoredState {
  return {
    version: 2,
    profile: null,
    wallets: randomWallets((size) =>
      crypto.getRandomValues(new Uint8Array(size)),
    ),
    activity: [],
    sessionUrl: null,
  };
}

function load(): StoredState {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as StoredState | null;

    if (
      parsed?.version === 2 &&
      parsed.wallets?.BTC &&
      Array.isArray(parsed.activity)
    )
      return parsed;
  } catch {
    // Unreadable storage: start a fresh demo.
  }

  return fresh();
}

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<
  { ok: true; data: T } | { ok: false; status: number; error: string }
> {
  try {
    const response = await fetch(`/api/crypto-exchange${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok)
      return {
        ok: false,
        status: response.status,
        error:
          data?.error ?? "Something went wrong talking to Kestrel's server.",
      };

    return { ok: true, data: data as T };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error:
        (error as Error | null)?.name === "TimeoutError"
          ? "Kestrel's server did not answer in time. Try again."
          : "Kestrel's server could not be reached.",
    };
  }
}

/**
 * Everything Kestrel does in the browser: the account (its KYC session lives
 * in Kestrel's signed cookie), the activity ledger and the Didit web SDK.
 * Balances come from Didit's decisions alone: a deposit counts once Didit
 * approves it, a withdrawal holds its funds until Didit blocks it.
 */
export function useKestrel(
  emit: (signal: KestrelSignal) => void = () => undefined,
) {
  const [state, setState] = React.useState<StoredState | null>(null);
  const [account, setAccount] = React.useState<KestrelAccount | null>(null);
  const [accountLoaded, setAccountLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState<Busy>(null);
  const [error, setError] = React.useState<string | null>(null);
  const stateRef = React.useRef(state);
  const accountRef = React.useRef(account);
  const tokenRef = React.useRef<
    (TransactionToken & { expiresAt: number }) | null
  >(null);
  const emitRef = React.useRef(emit);
  // Set synchronously, so a double click or a second call before React
  // re-renders cannot open two sessions or send the same transfer twice.
  const busyRef = React.useRef(false);

  stateRef.current = state;
  accountRef.current = account;
  emitRef.current = emit;

  const update = React.useCallback(
    (next: (current: StoredState) => StoredState) => {
      setState((current) => {
        if (!current) return current;
        const value = next(current);

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        stateRef.current = value;

        return value;
      });
    },
    [],
  );

  const upsert = React.useCallback(
    (item: ActivityItem) =>
      update((current) => ({
        ...current,
        activity: [
          item,
          ...current.activity.filter((entry) => entry.id !== item.id),
        ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      })),
    [update],
  );

  const refreshAccount = React.useCallback(async () => {
    const result = await api<{ account: KestrelAccount | null }>("/account");

    setAccountLoaded(true);
    if (!result.ok) {
      setError(result.error);

      return accountRef.current;
    }
    setAccount(result.data.account);
    accountRef.current = result.data.account;

    return result.data.account;
  }, []);

  const refreshItem = React.useCallback(
    async (id: string) => {
      const existing = stateRef.current?.activity.find(
        (item) => item.id === id,
      );
      const result = await api<TransactionView>(`/transactions/${id}`);

      if (!result.ok || !existing) return existing ?? null;
      const item = { ...existing, view: result.data };

      upsert(item);

      return item;
    },
    [upsert],
  );

  // Hydrate from storage, read the account, then refresh unsettled transfers.
  React.useEffect(() => {
    const stored = load();

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    stateRef.current = stored;
    setState(stored);
    refreshAccount().then((current) => {
      if (current?.stage !== "approved") return;
      for (const item of stored.activity)
        if (!isSettled(item)) void refreshItem(item.id);
    });

    // Another tab of the demo changed the ledger or restarted: follow it.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = load();

      stateRef.current = next;
      setState(next);
      void refreshAccount();
    };

    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Runs one user action at a time; a second one while it runs is ignored. */
  const exclusive = React.useCallback(
    async <T>(kind: Exclude<Busy, null>, run: () => Promise<T>) => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(kind);
      setError(null);
      try {
        return await run();
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
    },
    [],
  );

  /* ── Sign-up and the KYC ── */

  const join = React.useCallback(
    (profile: Profile) => update((current) => ({ ...current, profile })),
    [update],
  );

  /**
   * The decision can trail the flow by a few seconds; a flow the visitor
   * closed is read once, since it stays open until they come back to it.
   */
  const settleAccount = React.useCallback(
    async (wait = true) => {
      let current = await refreshAccount();

      for (
        let attempt = 0;
        wait && attempt < 6 && current?.stage === "processing";
        attempt++
      ) {
        await sleep(2500);
        current = await refreshAccount();
      }
      if (current && current.stage !== "processing")
        emitRef.current({ type: "verify-decided", account: current });

      return current;
    },
    [refreshAccount],
  );

  const verify = React.useCallback(
    () =>
      exclusive("verify", async () => {
        let url =
          accountRef.current?.stage === "processing"
            ? stateRef.current?.sessionUrl
            : null;

        if (!url) {
          const created = await api<{ sessionId: string; url: string }>(
            "/account",
            {
              method: "POST",
            },
          );

          if (!created.ok) {
            setError(created.error);

            return;
          }
          url = created.data.url;
          tokenRef.current = null;
          update((current) => ({ ...current, sessionUrl: created.data.url }));
          await refreshAccount();
        }
        emitRef.current({ type: "verify-started" });
        const result = await openVerification(url);

        setBusy("verify-result");
        if (result.type === "failed")
          setError("The verification could not start. Try again.");
        await settleAccount(result.type !== "cancelled");
      }),
    [exclusive, refreshAccount, settleAccount, update],
  );

  /* ── Money: always submitted from the browser ── */

  const ensureToken = React.useCallback(async (force: boolean) => {
    const current = tokenRef.current;

    if (!force && current && current.expiresAt - Date.now() > 60_000)
      return current;
    const minted = await api<{
      token: string;
      expiresAt: string | null;
      baseUrl: string;
    }>("/token", { method: "POST" });

    if (!minted.ok) throw new Error(minted.error);
    tokenRef.current = {
      token: minted.data.token,
      baseUrl: minted.data.baseUrl,
      expiresAt:
        Date.parse(minted.data.expiresAt ?? "") || Date.now() + 600_000,
    };

    return tokenRef.current;
  }, []);

  const send = React.useCallback(
    async (
      kind: ActivityItem["kind"],
      asset: Asset,
      wallet: string,
      payload: Parameters<typeof submitTransaction>[0]["transaction"],
    ): Promise<ActivityItem | null> => {
      let submitted: Awaited<ReturnType<typeof submitTransaction>>;

      try {
        submitted = await submitTransaction({
          token: ensureToken,
          transaction: payload,
        });
      } catch (failure) {
        setError(submitErrorMessage(failure));

        return null;
      }
      // Didit has the transfer now. If its full record cannot be read yet,
      // the ledger keeps the decision Didit returned and reads it later.
      const detail = await api<TransactionView>(
        `/transactions/${submitted.transactionId}`,
      );
      const item: ActivityItem = {
        id: submitted.transactionId,
        kind,
        asset,
        wallet,
        createdAt: new Date().toISOString(),
        view: detail.ok
          ? detail.data
          : submittedView({
              id: submitted.transactionId,
              status: submitted.status,
              travelRuleStatus: submitted.travelRuleStatus,
              kind,
              amount: String(payload.details.amount),
              currency: asset,
              wallet,
            }),
      };

      upsert(item);
      emitRef.current({ type: "transaction", item });

      return item;
    },
    [ensureToken, upsert],
  );

  const deposit = React.useCallback(
    async (input: { asset: Asset; amount: string; source: DepositSource }) => {
      const current = stateRef.current;
      const fullName = accountRef.current?.fullName;

      if (!current || !fullName) return null;

      return exclusive("deposit", () => {
        const own = input.source === "own-wallet" || input.asset !== "ETH";

        return send(
          "deposit",
          input.asset,
          own ? current.wallets[input.asset] : SANCTIONED_WALLET,
          buildDepositPayload({
            txnId: newTxnId("dep", crypto.randomUUID()),
            fullName,
            asset: input.asset,
            amount: input.amount,
            source: input.source,
            ownWallet: current.wallets[input.asset],
          }),
        );
      });
    },
    [exclusive, send],
  );

  const withdraw = React.useCallback(
    async (input: {
      asset: Asset;
      amount: string;
      destination: WithdrawalDestination;
      address: string;
    }) => {
      const fullName = accountRef.current?.fullName;

      if (!fullName) return null;

      return exclusive("withdraw", () =>
        send(
          "withdrawal",
          input.asset,
          input.address,
          buildWithdrawalPayload({
            txnId: newTxnId("wd", crypto.randomUUID()),
            fullName,
            asset: input.asset,
            amount: input.amount,
            destination: input.destination,
            address: input.address,
            beneficiaryName: input.destination === "own-wallet" ? fullName : "",
          }),
        ),
      );
    },
    [exclusive, send],
  );

  /** Opens what Didit asked for (the wallet proof or the selfie), then waits for Didit to move on. */
  const runAction = React.useCallback(
    async (item: ActivityItem) => {
      const action = item.view.action;

      if (!action) return;
      await exclusive("action", async () => {
        const result = await openVerification(action.url);

        if (result.type === "failed")
          setError("The Didit flow could not start. Try again.");
        const attempts = action.type === "verification_session" ? 30 : 10;

        for (let attempt = 0; attempt < attempts; attempt++) {
          if (attempt > 0) await sleep(2000);
          const next = await refreshItem(item.id);

          if (
            next &&
            (next.view.status !== item.view.status ||
              (next.view.action?.type ?? null) !== action.type)
          ) {
            emitRef.current({ type: "transaction", item: next });

            return;
          }
        }
      });
    },
    [exclusive, refreshItem],
  );

  const reset = React.useCallback(async () => {
    await api("/account", { method: "DELETE" });
    const next = fresh();

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    stateRef.current = next;
    tokenRef.current = null;
    setState(next);
    setAccount(null);
    setError(null);
  }, []);

  const activity = state?.activity ?? [];

  return {
    hydrated: state !== null && accountLoaded,
    profile: state?.profile ?? null,
    wallets: state?.wallets ?? null,
    activity,
    balances: balancesOf(activity),
    account,
    busy,
    error,
    setError,
    join,
    verify,
    deposit,
    withdraw,
    runAction,
    refreshAccount,
    reset,
  };
}

export type Kestrel = ReturnType<typeof useKestrel>;
