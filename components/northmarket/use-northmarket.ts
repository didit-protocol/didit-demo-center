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
      const claimed = await api<TransactionSummary>("/transactions", {
        method: "POST",
        body: { uuid: result.transactionId },
      });

      return claimed.ok ? claimed : failed(claimed.error);
    } catch (problem) {
      return failed(
        problem instanceof Error
          ? problem.message
          : "The transaction could not be submitted.",
      );
    }
  };

  /** Opens a shop and reports its sign-up to transaction monitoring. */
  const openShop = async (
    shop: string,
  ): Promise<Outcome<{ seller: SellerView; signup: TransactionSummary }>> => {
    setBusy("shop");
    try {
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
        ? { ok: true, data: { seller, signup: signup.data } }
        : signup;
    } finally {
      setBusy(null);
    }
  };

  /** Starts (or resumes) the shop's KYB in the web SDK modal. */
  const verifyBusiness = async (
    sellerId: string,
    onOpen: () => void,
  ): Promise<Outcome<KybSummary | null>> => {
    setBusy("kyb");
    try {
      const started = await api<{ url: string }>(
        `/sellers/${encodeURIComponent(sellerId)}/kyb`,
        { method: "POST" },
      );

      if (!started.ok) return failed(started.error);
      onOpen();
      await openVerification(started.data.url);
      const kyb = await settleKyb(sellerId);

      await refresh();

      return { ok: true, data: kyb };
    } finally {
      setBusy(null);
    }
  };

  /** The 1,497 EUR order, submitted from the browser. */
  const placeOrder = async (
    seller: { id: string; shop: string } | null,
  ): Promise<Outcome<TransactionSummary>> => {
    setBusy("order");
    try {
      const result = await submit("purchase", (grant, random) =>
        purchaseTransaction(grant, ORDER_LISTING, seller, random),
      );

      await refresh();

      return result;
    } finally {
      setBusy(null);
    }
  };

  /** The step-up a held order asks for: the buyer's age check. */
  const confirmAge = async (
    order: TransactionSummary,
  ): Promise<Outcome<TransactionSummary>> => {
    if (!order.verification) return failed("This order needs no age check.");
    setBusy("age");
    try {
      await openVerification(order.verification.url);
      const settled = await settle(order.uuid);

      await refresh();

      return settled
        ? { ok: true, data: settled }
        : failed("The order could not be read back.");
    } finally {
      setBusy(null);
    }
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
    verifyBusiness,
    placeOrder,
    confirmAge,
    reset,
  };
}
