"use client";

import type { ChapterId } from "@/lib/marketplace/guide";
import type { Listing } from "@/lib/marketplace/catalog";
import type {
  KybSummary,
  TransactionSummary,
} from "@/lib/marketplace/summaries";
import type {
  OperatorView,
  SellerView,
  StateView,
} from "@/lib/marketplace/server";

import * as React from "react";

import {
  api,
  loadSdk,
  openHostedFlow,
  submitMonitored,
  waitForTransaction,
} from "@/lib/marketplace/client";
import {
  payoutTransaction,
  purchaseTransaction,
  signupTransaction,
} from "@/lib/marketplace/payloads";

export interface ShopForm {
  shop: string;
  company: string;
  country: string;
}

export interface ActionError {
  scope: string;
  message: string;
}

interface MarketContextValue {
  view: StateView | null;
  loading: boolean;
  /** The action in flight, e.g. `kyb:<seller id>` or `buy:<listing id>`. */
  busy: string | null;
  error: ActionError | null;
  chapter: ChapterId;
  setChapter: (chapter: ChapterId) => void;
  /** The transaction the operator view is looking at. */
  inspecting: string | null;
  inspect: (uuid: string) => void;
  operator: OperatorView | null;
  operatorLoading: boolean;
  refresh: () => Promise<void>;
  openShop: (form: ShopForm) => Promise<SellerView | null>;
  retrySignup: (seller: SellerView) => Promise<void>;
  startKyb: (seller: SellerView) => Promise<void>;
  continuePersonCheck: (seller: SellerView, url: string) => Promise<void>;
  refreshKyb: (seller: SellerView) => Promise<void>;
  decideKyb: (seller: SellerView, status: "Approved" | "Declined") => Promise<void>;
  buy: (listing: Listing) => Promise<TransactionSummary | null>;
  verifyOrder: (order: TransactionSummary) => Promise<void>;
  payout: (seller: SellerView, amount: number) => Promise<TransactionSummary | null>;
  reset: () => Promise<void>;
  clearError: () => void;
}

const MarketContext = React.createContext<MarketContextValue | null>(null);

export function useMarket(): MarketContextValue {
  const value = React.useContext(MarketContext);

  if (!value) throw new Error("useMarket must be used inside MarketProvider.");

  return value;
}

/**
 * The marketplace's state and actions, shared by every chapter.
 *
 * Each action is the real thing: it calls this app's /api/marketplace routes
 * (which hold the API key) and the Didit web SDK on this device. When a hosted
 * flow closes - completed or cancelled - the record it belongs to is re-read
 * from the API, so the page only ever shows what Didit actually decided.
 */
export function MarketProvider({
  initialChapter,
  onChapterChange,
  children,
}: {
  initialChapter: ChapterId;
  onChapterChange: (chapter: ChapterId) => void;
  children: React.ReactNode;
}) {
  const [view, setView] = React.useState<StateView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ActionError | null>(null);
  const [chapter, setChapterState] = React.useState<ChapterId>(initialChapter);
  const [inspecting, setInspecting] = React.useState<string | null>(null);
  const [operator, setOperator] = React.useState<OperatorView | null>(null);
  const [operatorLoading, setOperatorLoading] = React.useState(false);
  /** What to do when the hosted flow on screen closes. */
  const afterFlow = React.useRef<(() => void) | null>(null);

  const setChapter = React.useCallback(
    (next: ChapterId) => {
      setChapterState(next);
      onChapterChange(next);
    },
    [onChapterChange],
  );

  const refresh = React.useCallback(async () => {
    const result = await api<StateView>("");

    setLoading(false);
    if (result.ok) {
      setView(result.data);
    } else {
      setError({ scope: "page", message: result.error });
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // One SDK, one completion handler: whichever flow is open, re-read its
  // record when it closes, whether it finished or the user stepped out.
  React.useEffect(() => {
    let disposed = false;

    loadSdk().then(({ DiditSdk }) => {
      if (disposed) return;
      DiditSdk.shared.onComplete = (result) => {
        const next = afterFlow.current;

        afterFlow.current = null;
        if (result.type === "failed") {
          setError({
            scope: "flow",
            message:
              result.error?.message ?? "The verification flow could not run.",
          });
        }
        next?.();
      };
    });

    return () => {
      disposed = true;
      loadSdk().then(({ DiditSdk }) => {
        DiditSdk.shared.onComplete = undefined;
      });
    };
  }, []);

  const patchSeller = React.useCallback(
    (sellerId: string, kyb: KybSummary | null) => {
      setView((current) =>
        current
          ? {
              ...current,
              sellers: current.sellers.map((seller) =>
                seller.id === sellerId ? { ...seller, kyb } : seller,
              ),
            }
          : current,
      );
    },
    [],
  );

  const upsertTransaction = React.useCallback((tx: TransactionSummary) => {
    setView((current) =>
      current
        ? {
            ...current,
            transactions: [
              tx,
              ...current.transactions.filter((t) => t.uuid !== tx.uuid),
            ],
          }
        : current,
    );
  }, []);

  const run = React.useCallback(
    async <T,>(key: string, scope: string, task: () => Promise<T>) => {
      setBusy(key);
      setError(null);
      try {
        return await task();
      } catch (cause) {
        setError({
          scope,
          message:
            cause instanceof Error ? cause.message : "Something went wrong.",
        });

        return null;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const openShop = React.useCallback(
    (form: ShopForm) =>
      run(`shop:${form.shop}`, "shop", async () => {
        const created = await api<{ seller: SellerView }>("/sellers", {
          method: "POST",
          body: form,
        });

        if (!created.ok) throw new Error(created.error);

        const seller = created.data.seller;
        // The sign-up goes to monitoring from THIS device: the web SDK
        // attaches its persistent device id, which is what links two shops.
        const signup = await submitMonitored(
          "signup",
          (grant, random) => signupTransaction(grant, seller.shop, random),
          seller.id,
        );

        await refresh();
        if (!signup.ok) throw new Error(signup.error);

        return seller;
      }),
    [refresh, run],
  );

  const retrySignup = React.useCallback(
    async (seller: SellerView) => {
      await run(`signup:${seller.id}`, `signup:${seller.id}`, async () => {
        const signup = await submitMonitored(
          "signup",
          (grant, random) => signupTransaction(grant, seller.shop, random),
          seller.id,
        );

        await refresh();
        if (!signup.ok) throw new Error(signup.error);
      });
    },
    [refresh, run],
  );

  const refreshKyb = React.useCallback(
    async (seller: SellerView) => {
      const result = await api<{ kyb: KybSummary | null }>(
        `/sellers/${seller.id}/kyb`,
      );

      if (result.ok) {
        patchSeller(seller.id, result.data.kyb);
      } else {
        setError({ scope: `kyb:${seller.id}`, message: result.error });
      }
    },
    [patchSeller],
  );

  const startKyb = React.useCallback(
    async (seller: SellerView) => {
      await run(`kyb:${seller.id}`, `kyb:${seller.id}`, async () => {
        const started = await api<{ url: string; sessionId: string }>(
          `/sellers/${seller.id}/kyb`,
          { method: "POST" },
        );

        if (!started.ok) throw new Error(started.error);
        afterFlow.current = () => {
          refresh();
        };
        await refresh();
        await openHostedFlow(started.data.url);
      });
    },
    [refresh, run],
  );

  const continuePersonCheck = React.useCallback(
    async (seller: SellerView, url: string) => {
      afterFlow.current = () => {
        refreshKyb(seller);
      };
      await openHostedFlow(url);
    },
    [refreshKyb],
  );

  const decideKyb = React.useCallback(
    async (seller: SellerView, status: "Approved" | "Declined") => {
      await run(`decide:${seller.id}`, `decide:${seller.id}`, async () => {
        const result = await api<{ kyb: KybSummary | null }>(
          `/sellers/${seller.id}/kyb/decision`,
          { method: "POST", body: { status } },
        );

        if (!result.ok) throw new Error(result.error);
        patchSeller(seller.id, result.data.kyb);
      });
    },
    [patchSeller, run],
  );

  const buy = React.useCallback(
    (listing: Listing) =>
      run(`buy:${listing.id}`, `buy:${listing.id}`, async () => {
        const shop = view?.sellers[0] ?? null;
        const order = await submitMonitored("purchase", (grant, random) =>
          purchaseTransaction(
            grant,
            listing,
            shop ? { id: shop.id, shop: shop.shop } : null,
            random,
          ),
        );

        if (!order.ok) throw new Error(order.error);
        upsertTransaction(order.data);

        return order.data;
      }),
    [run, upsertTransaction, view?.sellers],
  );

  const verifyOrder = React.useCallback(
    async (order: TransactionSummary) => {
      if (!order.verification) return;
      afterFlow.current = () => {
        setBusy(`order:${order.uuid}`);
        // The order follows the check's decision a few seconds after it.
        waitForTransaction(order.uuid, { attempts: 10, intervalMs: 3000 })
          .then((result) => {
            if (result.ok) upsertTransaction(result.data);
          })
          .finally(() => setBusy(null));
      };
      await openHostedFlow(order.verification.url);
    },
    [upsertTransaction],
  );

  const payout = React.useCallback(
    (seller: SellerView, amount: number) =>
      run(`payout:${seller.id}`, `payout:${seller.id}`, async () => {
        const result = await submitMonitored(
          "payout",
          (grant, random) => payoutTransaction(grant, amount, random),
          seller.id,
        );

        if (!result.ok) throw new Error(result.error);
        upsertTransaction(result.data);

        return result.data;
      }),
    [run, upsertTransaction],
  );

  const inspect = React.useCallback((uuid: string) => {
    setInspecting(uuid);
  }, []);

  React.useEffect(() => {
    if (!inspecting) {
      setOperator(null);

      return;
    }

    let cancelled = false;

    setOperatorLoading(true);
    api<OperatorView>(`/transactions/${inspecting}/operator`).then((result) => {
      if (cancelled) return;
      setOperatorLoading(false);
      if (result.ok) {
        setOperator(result.data);
      } else {
        setOperator(null);
        setError({ scope: "operator", message: result.error });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [inspecting, view?.transactions]);

  const reset = React.useCallback(async () => {
    await run("reset", "page", async () => {
      await api("", { method: "DELETE" });
      setInspecting(null);
      await refresh();
      setChapter("seller");
    });
  }, [refresh, run, setChapter]);

  const value: MarketContextValue = {
    view,
    loading,
    busy,
    error,
    chapter,
    setChapter,
    inspecting,
    inspect,
    operator,
    operatorLoading,
    refresh,
    openShop,
    retrySignup,
    startKyb,
    continuePersonCheck,
    refreshKyb,
    decideKyb,
    buy,
    verifyOrder,
    payout,
    reset,
    clearError: () => setError(null),
  };

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}
