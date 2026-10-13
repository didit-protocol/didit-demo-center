"use client";

import type { AccountView } from "@/lib/crypto-exchange/onboarding";

import * as React from "react";

import {
  buildWithdrawalPayload,
  newTxnId,
  randomEvmAddress,
  withdrawalHoldsFunds,
  withdrawalStage,
  type CxWallets,
  type DepositSource,
  type TransactionView,
  type WithdrawalDestination,
} from "@/lib/crypto-exchange/transactions";

type SdkModule = typeof import("@didit-protocol/sdk-web").DiditSdk;

export type KestrelAccount = AccountView & { userId: string };

export interface ActivityItem {
  id: string;
  kind: "deposit" | "withdrawal";
  /** Where the money came from or went, in the user's words. */
  label: string;
  createdAt: string;
  view: TransactionView;
}

interface StoredState {
  wallets: CxWallets;
  activity: ActivityItem[];
  sessionUrl: string | null;
}

export type AccountStatus = "loading" | "none" | "ready" | "error";

/** Which hosted flow the SDK modal is showing, so onComplete knows what finished. */
type Flow =
  | { kind: "onboarding" }
  | { kind: "action"; itemId: string; action: string; status: string };

const STORAGE_KEY = "kestrel-demo:v1";

function freshWallets(): CxWallets {
  const random = (size: number) => crypto.getRandomValues(new Uint8Array(size));

  return {
    ownWallet: randomEvmAddress(random),
    exchangeDeposit: randomEvmAddress(random),
  };
}

function loadState(): StoredState {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    );

    if (parsed?.wallets?.ownWallet && Array.isArray(parsed.activity))
      return parsed;
  } catch {
    // Unreadable storage: start a fresh demo.
  }

  return { wallets: freshWallets(), activity: [], sessionUrl: null };
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
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          data?.error ?? "Something went wrong talking to Kestrel's server.",
      };
    }

    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Kestrel's server could not be reached.",
    };
  }
}

const sum = (values: number[]) =>
  Math.round(values.reduce((total, value) => total + value, 0) * 1e8) / 1e8;

export function balancesOf(activity: ActivityItem[]) {
  const amount = (item: ActivityItem) => Number(item.view.amount) || 0;
  const deposits = activity.filter((item) => item.kind === "deposit");
  const withdrawals = activity.filter((item) => item.kind === "withdrawal");
  const credited = sum(
    deposits.filter((item) => item.view.status === "APPROVED").map(amount),
  );
  const holding = withdrawals.filter((item) =>
    withdrawalHoldsFunds(withdrawalStage(item.view)),
  );
  const sent = sum(
    holding
      .filter((item) => withdrawalStage(item.view) === "ready")
      .map(amount),
  );
  const held = sum(
    holding
      .filter((item) => withdrawalStage(item.view) !== "ready")
      .map(amount),
  );

  return {
    total: sum([credited, -sent]),
    available: sum([credited, -sent, -held]),
    held,
    inReview: sum(
      deposits.filter((item) => item.view.status === "IN_REVIEW").map(amount),
    ),
    frozen: sum(
      deposits.filter((item) => item.view.status === "DECLINED").map(amount),
    ),
  };
}

export const DEPOSIT_LABEL: Record<DepositSource, string> = {
  "own-wallet": "From your wallet",
  "unknown-sender": "From an unknown sender",
};

export const WITHDRAWAL_LABEL: Record<WithdrawalDestination, string> = {
  "own-wallet": "To your wallet",
  exchange: "To your account at another exchange",
  address: "To an external address",
};

/** A transfer is final once Didit and the Travel Rule have nothing left to say. */
function isSettled(item: ActivityItem): boolean {
  if (item.kind === "deposit")
    return ["APPROVED", "DECLINED"].includes(item.view.status);

  return ["ready", "blocked"].includes(withdrawalStage(item.view));
}

/**
 * Everything Kestrel does on the client: the account, the activity ledger, and
 * the Didit web SDK. Balances are derived from Didit's decisions alone - a
 * deposit counts once Didit approves it, a withdrawal holds its funds until
 * Didit blocks it.
 */
export function useKestrel() {
  const sdkRef = React.useRef<SdkModule | null>(null);
  const flowRef = React.useRef<Flow | null>(null);
  const [state, setState] = React.useState<StoredState | null>(null);
  const [account, setAccount] = React.useState<KestrelAccount | null>(null);
  const [accountStatus, setAccountStatus] =
    React.useState<AccountStatus>("loading");
  const [accountError, setAccountError] = React.useState<string | null>(null);
  const [signingUp, setSigningUp] = React.useState(false);
  const [busyItem, setBusyItem] = React.useState<string | null>(null);
  const [sdkError, setSdkError] = React.useState<string | null>(null);

  const stateRef = React.useRef(state);

  stateRef.current = state;

  const update = React.useCallback(
    (next: (current: StoredState) => StoredState) => {
      setState((current) => {
        if (!current) return current;
        const value = next(current);

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));

        return value;
      });
    },
    [],
  );

  const upsertItem = React.useCallback(
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
    const result = await api<KestrelAccount>("/account");

    if (result.ok) {
      setAccount(result.data);
      setAccountStatus("ready");
      setAccountError(null);

      return result.data;
    }
    if (
      result.status === 401 ||
      result.status === 404 ||
      result.status === 403
    ) {
      setAccount(null);
      setAccountStatus("none");
    } else {
      setAccountStatus((current) => (current === "ready" ? current : "error"));
      setAccountError(result.error);
    }

    return null;
  }, []);

  const refreshItem = React.useCallback(
    async (id: string) => {
      const result = await api<TransactionView>(`/transactions/${id}`);
      const existing = stateRef.current?.activity.find(
        (item) => item.id === id,
      );

      if (!result.ok || !existing) return existing ?? null;
      const item = { ...existing, view: result.data };

      upsertItem(item);

      return item;
    },
    [upsertItem],
  );

  /** Polls one transfer until Didit moves it on, or the attempts run out. */
  const pollItem = React.useCallback(
    async (
      id: string,
      from: { status: string; action: string | null },
      attempts: number,
    ) => {
      setBusyItem(id);
      try {
        for (let attempt = 0; attempt < attempts; attempt++) {
          if (attempt > 0)
            await new Promise((resolve) => setTimeout(resolve, 2000));
          const item = await refreshItem(id);

          if (
            item &&
            (item.view.status !== from.status ||
              (item.view.action?.type ?? null) !== from.action)
          ) {
            return;
          }
        }
      } finally {
        setBusyItem(null);
      }
    },
    [refreshItem],
  );

  // Hydrate from storage, read the account, and refresh unsettled transfers.
  React.useEffect(() => {
    const stored = loadState();

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setState(stored);
    stateRef.current = stored;
    refreshAccount().then((current) => {
      if (!current) return;
      for (const item of stored.activity) {
        if (!isSettled(item)) refreshItem(item.id);
      }
    });
  }, []);

  // The Didit web SDK: one modal for the onboarding session, the wallet
  // ownership widget and the selfie step-up.
  React.useEffect(() => {
    let disposed = false;

    import("@didit-protocol/sdk-web").then(({ DiditSdk }) => {
      if (disposed) return;
      sdkRef.current = DiditSdk;
      DiditSdk.shared.onComplete = (result) => {
        const flow = flowRef.current;

        flowRef.current = null;
        if (result.type === "failed") {
          setSdkError(
            result.error?.message ?? "The Didit flow could not start.",
          );
        }
        if (!flow) return;
        if (flow.kind === "onboarding") {
          // The decision can trail the flow by a few seconds.
          (async () => {
            for (let attempt = 0; attempt < 6; attempt++) {
              const current = await refreshAccount();

              if (current && current.stage !== "processing") return;
              await new Promise((resolve) => setTimeout(resolve, 2500));
            }
          })();

          return;
        }
        pollItem(
          flow.itemId,
          { status: flow.status, action: flow.action },
          flow.action === "verification_session" ? 30 : 10,
        );
      };
    });

    return () => {
      disposed = true;
      if (sdkRef.current) sdkRef.current.shared.onComplete = undefined;
    };
  }, []);

  const open = React.useCallback((url: string, flow: Flow) => {
    if (!sdkRef.current) {
      setSdkError("The Didit web SDK is still loading. Try again in a moment.");

      return false;
    }
    setSdkError(null);
    flowRef.current = flow;
    sdkRef.current.shared.startVerification({
      url,
      configuration: {
        showCloseButton: true,
        showExitConfirmation: false,
        closeModalOnComplete: true,
      },
    });

    return true;
  }, []);

  const signUp = React.useCallback(async () => {
    setSigningUp(true);
    setAccountError(null);
    try {
      const result = await api<{ sessionId: string; url: string }>("/account", {
        method: "POST",
      });

      if (!result.ok) {
        setAccountError(result.error);

        return;
      }
      update((current) => ({ ...current, sessionUrl: result.data.url }));
      await refreshAccount();
      open(result.data.url, { kind: "onboarding" });
    } finally {
      setSigningUp(false);
    }
  }, [open, refreshAccount, update]);

  const continueVerification = React.useCallback(() => {
    const url = stateRef.current?.sessionUrl;

    if (url) open(url, { kind: "onboarding" });
  }, [open]);

  const reset = React.useCallback(async () => {
    await api("/account", { method: "DELETE" });
    const fresh = { wallets: freshWallets(), activity: [], sessionUrl: null };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setState(fresh);
    setAccount(null);
    setAccountStatus("none");
    setAccountError(null);
  }, []);

  const deposit = React.useCallback(
    async (source: DepositSource, amount: string) => {
      const wallets = stateRef.current?.wallets;

      if (!wallets) return { error: "The demo is still loading." };
      const result = await api<TransactionView>("/deposits", {
        method: "POST",
        body: JSON.stringify({ source, amount, ownWallet: wallets.ownWallet }),
      });

      if (!result.ok) return { error: result.error };
      const item: ActivityItem = {
        id: result.data.id,
        kind: "deposit",
        label: DEPOSIT_LABEL[source],
        createdAt: new Date().toISOString(),
        view: result.data,
      };

      upsertItem(item);

      return { item };
    },
    [upsertItem],
  );

  const withdraw = React.useCallback(
    async (input: {
      destination: WithdrawalDestination;
      amount: string;
      address: string;
      beneficiaryName: string;
    }) => {
      const sdk = sdkRef.current;
      const fullName = account?.fullName;

      if (!sdk || !fullName)
        return { error: "The Didit web SDK is still loading." };

      const token = await api<{ token: string; baseUrl: string }>("/token", {
        method: "POST",
      });

      if (!token.ok) return { error: token.error };

      let transactionId: string;

      try {
        // autoLaunchAction: false - Didit can mint a wallet-ownership widget
        // for a transfer its rules then decline. Kestrel decides when to show
        // it (see withdrawalStage), instead of the SDK opening it right away.
        const submitted = await sdk.shared.submitTransaction({
          transactionToken: token.data.token,
          baseUrl: token.data.baseUrl,
          autoLaunchAction: false,
          transaction: buildWithdrawalPayload({
            txnId: newTxnId("wd", crypto.randomUUID()),
            fullName,
            amount: input.amount,
            destination: input.destination,
            address: input.address,
            beneficiaryName: input.beneficiaryName,
          }),
        });

        transactionId = submitted.transactionId;
      } catch (error) {
        return {
          error:
            error instanceof Error && error.message
              ? error.message
              : "Didit did not accept the withdrawal.",
        };
      }

      const detail = await api<TransactionView>(
        `/transactions/${transactionId}`,
      );

      if (!detail.ok) return { error: detail.error };
      const item: ActivityItem = {
        id: transactionId,
        kind: "withdrawal",
        label: WITHDRAWAL_LABEL[input.destination],
        createdAt: new Date().toISOString(),
        view: detail.data,
      };

      upsertItem(item);

      return { item };
    },
    [account?.fullName, upsertItem],
  );

  /** Opens the action Didit asked for: the wallet widget or the selfie. */
  const runAction = React.useCallback(
    (item: ActivityItem) => {
      const action = item.view.action;

      if (!action) return;
      open(action.url, {
        kind: "action",
        itemId: item.id,
        action: action.type,
        status: item.view.status,
      });
    },
    [open],
  );

  const checkAgain = React.useCallback(
    (item: ActivityItem) =>
      pollItem(
        item.id,
        { status: item.view.status, action: item.view.action?.type ?? null },
        1,
      ),
    [pollItem],
  );

  return {
    hydrated: state !== null,
    wallets: state?.wallets ?? null,
    activity: state?.activity ?? [],
    hasSessionUrl: Boolean(state?.sessionUrl),
    balances: balancesOf(state?.activity ?? []),
    account,
    accountStatus,
    accountError,
    sdkError,
    signingUp,
    busyItem,
    signUp,
    refreshAccount,
    continueVerification,
    reset,
    deposit,
    withdraw,
    runAction,
    checkAgain,
  };
}

export type Kestrel = ReturnType<typeof useKestrel>;
