"use client";

import type { DiditTransactionPayload } from "@didit-protocol/sdk-web";
import type {
  SellerView,
  StateView,
  TokenGrant,
} from "@/lib/marketplace/server";
import type {
  KybSummary,
  TransactionSummary,
} from "@/lib/marketplace/summaries";

import * as React from "react";

import { openVerification, submitTransaction } from "@/lib/didit/browser";
import { api } from "@/lib/marketplace/client";
import { ORDER_LISTING } from "@/lib/marketplace/northmarket";
import {
  purchaseTransaction,
  signupTransaction,
} from "@/lib/marketplace/payloads";

/**
 * Northmarket's browser state: this visitor's shops, their KYB and their
 * transactions, read from the demo's own routes (which hold the API key), and
 * every Didit call through lib/didit's browser client: the web SDK modal for
 * the KYB and the age check, and `submitTransaction` from this device.
 */

export type Busy = "shop" | "kyb" | "order" | "age" | null;

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

const failed = (error: string) => ({ ok: false, error }) as const;

const messageOf = (problem: unknown, fallback: string) =>
  problem instanceof Error && problem.message ? problem.message : fallback;

/**
 * Remembers a transaction the web SDK submitted. Claiming the same uuid twice
 * is harmless, so a failed claim is retried once: otherwise a submitted order
 * would be in Didit but missing from this browser's list.
 */
async function claim(uuid: string) {
  const first = await api<TransactionSummary>("/transactions", {
    method: "POST",
    body: { uuid },
  });

  if (first.ok || (first.status >= 400 && first.status < 500)) return first;

  return api<TransactionSummary>("/transactions", {
    method: "POST",
    body: { uuid },
  });
}

/** Re-reads a transaction until it leaves AWAITING_USER, or time runs out. */
async function settle(
  uuid: string,
  attempts = 10,
): Promise<TransactionSummary | null> {
  let last: TransactionSummary | null = null;

  for (let i = 0; i < attempts; i += 1) {
    const read = await api<TransactionSummary>(`/transactions/${uuid}`);

    if (read.ok) last = read.data;
    if (last && last.status !== "AWAITING_USER") return last;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return last;
}

/** Reads the KYB until it is decided, or time runs out. */
async function settleKyb(
  sellerId: string,
  attempts = 6,
): Promise<KybSummary | null> {
  let last: KybSummary | null = null;

  for (let i = 0; i < attempts; i += 1) {
    const read = await api<{ kyb: KybSummary | null }>(
      `/sellers/${encodeURIComponent(sellerId)}/kyb`,
    );

    if (read.ok) last = read.data.kyb;
    if (last && !/not started|in progress/i.test(last.status)) return last;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return last;
}

export function useNorthmarket() {
  const [view, setView] = React.useState<StateView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Busy>(null);
  // `busy` disables the buttons on the next render; this blocks a second
  // click that lands before it, so one click is one KYB session or one order.
  const running = React.useRef(false);

  const exclusive = async <T>(
    kind: Exclude<Busy, null>,
    work: () => Promise<T>,
    alreadyRunning: T,
  ): Promise<T> => {
    if (running.current) return alreadyRunning;
    running.current = true;
    setBusy(kind);
    try {
      return await work();
    } finally {
      running.current = false;
      setBusy(null);
    }
  };

  const refresh = React.useCallback(async () => {
    const result = await api<StateView>("");

    if (result.ok) {
      setView(result.data);
      setError(null);
    } else setError(result.error);

    return result.ok ? result.data : null;
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Mints a token for one identity, submits from this device, claims it. */
  const submit = async (
    purpose: "signup" | "purchase",
    build: (grant: TokenGrant, random: string) => DiditTransactionPayload,
    seller?: string,
  ): Promise<Outcome<TransactionSummary>> => {
    const mint = async () => {
      const minted = await api<TokenGrant>("/token", {
        method: "POST",
        body: { purpose, seller },
      });

      if (!minted.ok) throw new Error(minted.error);

      return minted.data;
    };

    try {
      let grant = await mint();
      const result = await submitTransaction({
        // A fresh token only when the first one expired on the way.
        token: async (force) => {
          if (force) grant = await mint();

          return { token: grant.token, baseUrl: grant.baseUrl };
        },
        transaction: build(grant, crypto.randomUUID()),
      });
      const claimed = await claim(result.transactionId);

      return claimed.ok ? claimed : failed(claimed.error);
    } catch (problem) {
      return failed(
        messageOf(problem, "The transaction could not be submitted."),
      );
    }
  };

  const busyError = failed(
    "Another step is still running. Wait for it to finish.",
  );

  /**
   * Opens a shop and reports its sign-up to transaction monitoring. When the
   * shop opened but its sign-up did not go through, the failure carries the
   * shop so the page can offer the check again (see `checkSignup`).
   */
  const openShop = (
    shop: string,
  ): Promise<
    | Outcome<{ seller: SellerView; signup: TransactionSummary }>
    | { ok: false; error: string; seller: SellerView }
  > =>
    exclusive(
      "shop",
      async () => {
        const opened = await api<{ seller: SellerView }>("/sellers", {
          method: "POST",
          body: { shop },
        });

        if (!opened.ok) return failed(opened.error);
        const seller = opened.data.seller;
        const signup = await submit(
          "signup",
          (grant, random) => signupTransaction(grant, seller.shop, random),
          seller.id,
        );

        await refresh();

        return signup.ok
          ? { ok: true as const, data: { seller, signup: signup.data } }
          : { ...signup, seller };
      },
      busyError,
    );

  /** Reports an open shop's sign-up again, after a failure or a reload. */
  const checkSignup = (seller: {
    id: string;
    shop: string;
  }): Promise<Outcome<TransactionSummary>> =>
    exclusive(
      "shop",
      async () => {
        const signup = await submit(
          "signup",
          (grant, random) => signupTransaction(grant, seller.shop, random),
          seller.id,
        );

        await refresh();

        return signup;
      },
      busyError,
    );

  /**
   * Opens a hosted verification in the web SDK modal, then reads its outcome
   * back from the server: the modal's own result is only how it closed, the
   * decision is always Didit's.
   */
  const verifyThenRead = async <T>(
    url: string,
    read: () => Promise<T>,
  ): Promise<Outcome<T>> => {
    try {
      await openVerification(url);
    } catch (problem) {
      return failed(
        messageOf(
          problem,
          "The verification window could not open. Try again.",
        ),
      );
    }
    const data = await read();

    await refresh();

    return { ok: true, data };
  };

  /** Starts (or resumes) the shop's KYB in the web SDK modal. */
  const verifyBusiness = (
    sellerId: string,
    onOpen: () => void,
  ): Promise<Outcome<KybSummary | null>> =>
    exclusive(
      "kyb",
      async () => {
        const started = await api<{ url: string }>(
          `/sellers/${encodeURIComponent(sellerId)}/kyb`,
          { method: "POST" },
        );

        if (!started.ok) return failed(started.error);
        onOpen();

        return verifyThenRead(started.data.url, () => settleKyb(sellerId));
      },
      busyError,
    );

  /** One owner's own ID check, from the KYB's key people. */
  const checkOwner = (
    sellerId: string,
    url: string,
  ): Promise<Outcome<KybSummary | null>> =>
    exclusive(
      "kyb",
      () => verifyThenRead(url, () => settleKyb(sellerId, 3)),
      busyError,
    );

  /** The 1,497 EUR order, submitted from the browser. */
  const placeOrder = (
    seller: { id: string; shop: string } | null,
  ): Promise<Outcome<TransactionSummary>> =>
    exclusive(
      "order",
      async () => {
        const result = await submit("purchase", (grant, random) =>
          purchaseTransaction(grant, ORDER_LISTING, seller, random),
        );

        await refresh();

        return result;
      },
      busyError,
    );

  /** The step-up a held order asks for: the buyer's age check. */
  const confirmAge = async (
    order: TransactionSummary,
  ): Promise<Outcome<TransactionSummary>> => {
    const step = order.verification;

    if (!step) return failed("This order needs no age check.");

    return exclusive(
      "age",
      async () => {
        const read = await verifyThenRead(step.url, () => settle(order.uuid));

        if (!read.ok) return read;

        return read.data
          ? { ok: true as const, data: read.data }
          : failed("The order could not be read back. Reload to see it.");
      },
      busyError,
    );
  };

  const reset = async () => {
    await api("", { method: "DELETE" });
    await refresh();
  };

  return {
    view,
    error,
    busy,
    refresh,
    openShop,
    checkSignup,
    verifyBusiness,
    checkOwner,
    placeOrder,
    confirmAge,
    reset,
  };
}
