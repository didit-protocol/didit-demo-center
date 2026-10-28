"use client";

import type { DiditCall } from "@/lib/fintech/server";
import type { TakeoverResult } from "@/lib/fintech/live-events";

import * as React from "react";

import {
  FIRST_WEEK,
  type PaymentRequest,
  isFinalStatus,
  isInbound,
  paymentPayload,
  takeoverEvent,
} from "@/lib/fintech/alder";
import {
  type SessionSummary,
  type TransactionRecord,
  diditErrorMessage,
  projectTransaction,
} from "@/lib/igaming/records";
import { openVerification, submitTransaction } from "@/lib/didit/browser";

/** What just happened with Didit, for the live layer. */
export type AlderSignal =
  | { type: "check-started"; check: "onboarding" | "stepUp" }
  | { type: "onboarding-decided"; summary: SessionSummary }
  | {
      type: "step-up-decided";
      summary: SessionSummary;
      record: TransactionRecord | null;
    }
  | { type: "payment"; item: PaymentItem }
  | { type: "takeover"; result: TakeoverResult };

export interface PaymentItem extends PaymentRequest {
  key: string;
  at: number;
  color?: string;
  record: TransactionRecord | null;
  error: string | null;
  releasedAt?: number | null;
}

export interface CheckState {
  sessionId: string;
  url: string;
  summary: SessionSummary | null;
  /** When Alder created the session; older saved states have none. */
  startedAt?: number;
}

export interface StepUpState extends CheckState {
  transactionId: string;
  /** The Didit Authentication passkey asked before the selfie, once given. */
  passkey?: { at: number; method: string } | null;
}

export interface CustomerState {
  version: 1;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
  onboarding: CheckState | null;
  stepUp: StepUpState | null;
  activity: PaymentItem[];
  /** The account's first week has been submitted. */
  seeded: boolean;
  takeover: (TakeoverResult & { at: number }) | null;
}

export type Busy =
  "open" | "onboarding" | "seed" | "send" | "stepUp" | "takeover" | null;

export interface Notice {
  tone: "error" | "info";
  text: string;
}

const STATE_KEY = "alder-demo:v1";

interface Token {
  token: string;
  expiresAt: number;
  baseUrl: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function load(): CustomerState | null {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CustomerState) : null;

    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

/** Money in the account: cleared payments only, a held transfer has not left. */
export function balanceOf(activity: PaymentItem[]): number {
  let balance = 0;

  for (const item of activity) {
    if (item.record?.status !== "APPROVED") continue;
    balance += isInbound(item.kind) ? item.amount : -item.amount;
  }

  return Math.round(balance * 100) / 100;
}

/**
 * Everything Alder does with Didit, in one hook.
 *
 * State lives in the browser (localStorage): the demo has no database, the
 * server only holds the API key and the customer cookie. Every status shown
 * comes from Didit: a session decision read through /api/fintech/sessions or
 * a payment read back from `/v1/transactions/` with the customer's token.
 */
export function useAlder(
  emit: (signal: AlderSignal) => void = () => undefined,
) {
  const [state, setState] = React.useState<CustomerState | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [busy, setBusy] = React.useState<Busy>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const emitRef = React.useRef(emit);

  emitRef.current = emit;
  const stateRef = React.useRef<CustomerState | null>(null);
  const tokenRef = React.useRef<Token | null>(null);
  const hostedRef = React.useRef<"onboarding" | "stepUp" | null>(null);
  const completeRef = React.useRef<(sessionId: string | null) => void>(
    () => undefined,
  );

  stateRef.current = state;

  const update = React.useCallback(
    (fn: (current: CustomerState) => CustomerState) => {
      setState((current) => {
        const next = current ? fn(current) : current;

        stateRef.current = next;

        return next;
      });
    },
    [],
  );

  const fail = (error: unknown) =>
    setNotice({
      tone: "error",
      text: error instanceof Error ? error.message : String(error),
    });

  /** One of this app's routes; failures come back as `{ error }`. */
  const route = React.useCallback(
    async <T>(path: string, init?: RequestInit) => {
      const response = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
      const data = (await response.json().catch(() => null)) as
        (T & { error?: string; code?: string; didit?: DiditCall[] }) | null;

      if (!response.ok) {
        const error = new Error(
          data?.error || `Request failed (${response.status}).`,
        ) as Error & { code?: string };

        error.code = data?.code;
        throw error;
      }

      return data as T;
    },
    [],
  );

  /* ── Persistence ── */

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = load();

      try {
        const { customerId } = await route<{ customerId: string | null }>(
          "/api/fintech/customer",
        );

        // The cookie (or the Didit user) is the identity; local state of
        // another customer id is dropped.
        if (!cancelled && stored && stored.customerId === customerId) {
          stateRef.current = stored;
          setState(stored);
        }
      } catch {
        // No customer yet: the public site.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [route]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (state) window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STATE_KEY);
  }, [state, hydrated]);

  /* ── Sessions ── */

  const readSession = React.useCallback(
    async (sessionId: string) =>
      (
        await route<{ session: SessionSummary }>(
          `/api/fintech/sessions/${sessionId}`,
        )
      ).session,
    [route],
  );

  /** Right after the flow closes a session may still be processing. */
  const settleSession = React.useCallback(
    async (sessionId: string) => {
      let summary = await readSession(sessionId);

      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (isFinalStatus(summary.status) || summary.status === "Not Started")
          break;
        await sleep(2000);
        summary = await readSession(sessionId);
      }

      return summary;
    },
    [readSession],
  );

  const openHosted = React.useCallback(
    (kind: "onboarding" | "stepUp", url: string) => {
      hostedRef.current = kind;
      emitRef.current({ type: "check-started", check: kind });
      openVerification(url).then((result) => {
        if (result.type === "failed")
          setNotice({
            tone: "error",
            text: result.error?.message ?? "The verification flow failed.",
          });
        completeRef.current(result.session?.sessionId ?? null);
      });
    },
    [],
  );

  /* ── Payments ── */

  const ensureToken = React.useCallback(
    async (force = false): Promise<Token> => {
      const current = tokenRef.current;

      if (!force && current && current.expiresAt - Date.now() > 60_000)
        return current;
      // The server mints only for a customer whose onboarding Didit approved.
      const minted = await route<{
        token: string;
        expiresAt: string;
        baseUrl: string;
      }>("/api/fintech/token", {
        method: "POST",
        body: JSON.stringify({
          onboardingSessionId: stateRef.current?.onboarding?.sessionId ?? null,
        }),
      });

      tokenRef.current = {
        token: minted.token,
        expiresAt: Date.parse(minted.expiresAt) || Date.now() + 600_000,
        baseUrl: minted.baseUrl,
      };

      return tokenRef.current;
    },
    [route],
  );

  /** `GET /v1/transactions/{id}/` with the customer's own token. */
  const readTransaction = React.useCallback(
    async (id: string): Promise<TransactionRecord | null> => {
      const token = await ensureToken();
      const response = await fetch(`${token.baseUrl}/v1/transactions/${id}/`, {
        headers: { "X-Transaction-Token": token.token },
      });

      if (!response.ok) return null;

      return projectTransaction(await response.json().catch(() => null));
    },
    [ensureToken],
  );

  /** One payment through the web SDK, with what Didit decided. */
  const send = React.useCallback(
    async (
      request: PaymentRequest & { color?: string },
    ): Promise<PaymentItem | null> => {
      const customer = stateRef.current;

      if (!customer) return null;
      const now = Date.now();
      const payload = paymentPayload(
        request,
        {
          id: customer.customerId,
          name: customer.onboarding?.summary?.fullName ?? customer.name,
        },
        now,
      );
      const item: PaymentItem = {
        ...request,
        key: payload.txnId,
        at: now,
        record: null,
        error: null,
      };

      try {
        const result = await submitTransaction({
          token: (force) => ensureToken(force),
          transaction: payload,
        });

        item.record =
          (await readTransaction(result.transactionId)) ??
          projectTransaction({
            uuid: result.transactionId,
            txn_id: payload.txnId,
            status: result.status,
            amount: request.amount,
            currency: "EUR",
            direction: isInbound(request.kind) ? "INBOUND" : "OUTBOUND",
            action_type: request.kind,
            action_required: result.actionRequired
              ? {
                  type: result.actionRequired.type,
                  url: result.actionRequired.url,
                  session_id: result.actionRequired.sessionId,
                  status: result.actionRequired.status,
                }
              : null,
          });
      } catch (error) {
        const failure = error as {
          fieldErrors?: Record<string, unknown>;
          message?: string;
        };

        item.error =
          diditErrorMessage(failure.fieldErrors) ??
          failure.message ??
          "Didit did not accept the payment.";
      }

      const action = item.record?.action;

      update((current) => ({
        ...current,
        activity: [item, ...current.activity],
        ...(action?.type === "verification_session" &&
        item.record?.status === "AWAITING_USER"
          ? {
              stepUp: {
                sessionId: action.sessionId ?? "",
                url: action.url,
                transactionId: item.record.id,
                summary: null,
                passkey: null,
              },
            }
          : {}),
      }));
      emitRef.current({ type: "payment", item });

      return item;
    },
    [ensureToken, readTransaction, update],
  );

  const pay = React.useCallback(
    async (request: PaymentRequest & { color?: string }) => {
      setBusy("send");
      setNotice(null);
      try {
        return await send(request);
      } catch (error) {
        fail(error);

        return null;
      } finally {
        setBusy(null);
      }
    },
    [send],
  );

  /** The account's first week, once: salary, the switch and card payments. */
  const seeding = React.useRef(false);
  const seed = React.useCallback(async () => {
    if (!stateRef.current || stateRef.current.seeded || seeding.current) return;
    seeding.current = true;
    setBusy("seed");
    update((current) => ({ ...current, seeded: true }));
    try {
      for (const entry of FIRST_WEEK) {
        await send({
          kind: entry.kind,
          amount: entry.amount,
          counterparty: entry.counterparty,
          detail: entry.detail,
          color: entry.color,
        });
      }
    } catch (error) {
      update((current) => ({ ...current, seeded: false }));
      fail(error);
    } finally {
      seeding.current = false;
      setBusy(null);
    }
  }, [send, update]);

  /* ── Onboarding ── */

  const finishOnboarding = React.useCallback(
    async (sessionId: string) => {
      setBusy("onboarding");
      try {
        const summary = await settleSession(sessionId);

        update((current) =>
          current.onboarding?.sessionId === sessionId
            ? { ...current, onboarding: { ...current.onboarding, summary } }
            : current,
        );
        emitRef.current({ type: "onboarding-decided", summary });
        setBusy(null);
        if (summary.status === "Approved") await seed();
      } catch (error) {
        fail(error);
      } finally {
        setBusy(null);
      }
    },
    [seed, settleSession, update],
  );

  const startOnboarding = React.useCallback(async () => {
    const customer = stateRef.current;

    if (!customer) return;
    setBusy("onboarding");
    setNotice(null);
    try {
      const session = await route<{ sessionId: string; url: string }>(
        "/api/fintech/onboarding",
        {
          method: "POST",
          body: JSON.stringify({
            email: customer.email,
            fullName: customer.name,
          }),
        },
      );

      update((current) => ({
        ...current,
        onboarding: {
          sessionId: session.sessionId,
          url: session.url,
          summary: null,
          startedAt: Date.now(),
        },
      }));
      openHosted("onboarding", session.url);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  }, [openHosted, route, update]);

  /* ── The step-up ── */

  const finishStepUp = React.useCallback(
    async (sessionId: string) => {
      const stepUp = stateRef.current?.stepUp;

      if (!stepUp || stepUp.sessionId !== sessionId) return;
      setBusy("stepUp");
      try {
        const summary = await settleSession(sessionId);
        let record: TransactionRecord | null = null;

        // The held transfer follows the session: Approved releases it.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          record = await readTransaction(stepUp.transactionId);
          if (!record || record.status !== "AWAITING_USER") break;
          if (!isFinalStatus(summary.status)) break;
          await sleep(1500);
        }
        const released = record?.status === "APPROVED" ? Date.now() : null;

        update((current) => ({
          ...current,
          stepUp: current.stepUp ? { ...current.stepUp, summary } : null,
          activity: current.activity.map((item) =>
            record && item.record?.id === record.id
              ? { ...item, record, releasedAt: released }
              : item,
          ),
        }));
        emitRef.current({ type: "step-up-decided", summary, record });
      } catch (error) {
        fail(error);
      } finally {
        setBusy(null);
      }
    },
    [readTransaction, settleSession, update],
  );

  completeRef.current = (sessionId) => {
    const kind = hostedRef.current;
    const customer = stateRef.current;

    hostedRef.current = null;
    if (!customer) return;
    if (kind === "stepUp" && customer.stepUp)
      void finishStepUp(sessionId ?? customer.stepUp.sessionId);
    else if (customer.onboarding)
      void finishOnboarding(sessionId ?? customer.onboarding.sessionId);
  };

  /* ── The account ── */

  const open = React.useCallback(
    async (details: { name: string; email: string; phone: string }) => {
      setBusy("open");
      setNotice(null);
      try {
        const { customerId } = await route<{ customerId: string }>(
          "/api/fintech/customer",
          { method: "POST" },
        );
        const existing = stateRef.current;

        tokenRef.current = null;
        const customer: CustomerState =
          existing?.customerId === customerId
            ? { ...existing, ...details }
            : {
                version: 1,
                customerId,
                ...details,
                createdAt: Date.now(),
                onboarding: null,
                stepUp: null,
                activity: [],
                seeded: false,
                takeover: null,
              };

        stateRef.current = customer;
        setState(customer);

        return customer;
      } catch (error) {
        fail(error);

        return null;
      } finally {
        setBusy(null);
      }
    },
    [route],
  );

  /**
   * The account-takeover attempt: someone with the customer's email tries to
   * sign in without the passkey. The bank reports the failed passkey check
   * as a security event through signals, which attaches this device, and
   * Didit's event rule decides it.
   */
  const attemptTakeover = React.useCallback(async () => {
    if (!stateRef.current) return;
    setBusy("takeover");
    setNotice(null);
    let result: TakeoverResult = { status: null, score: null, error: null };

    try {
      const { token, baseUrl } = await route<{
        token: string;
        baseUrl: string;
      }>("/api/fintech/monitoring-token", { method: "POST" });
      const { flush, submitEvent } = await import("@didit-protocol/signals");
      const event = takeoverEvent(Date.now());
      const eventId = submitEvent({ monitoringToken: token, event, baseUrl });
      const flushed = await flush();
      const answer = flushed.results.find((item) => item.eventId === eventId);

      result = answer?.error
        ? { status: null, score: null, error: answer.error.message }
        : {
            status: answer?.status ?? null,
            score: answer?.score ?? null,
            error: answer ? null : "Didit has not answered yet",
          };
    } catch (error) {
      const code = (error as { code?: string }).code;

      result = {
        status: null,
        score: null,
        error:
          code === "event_monitoring_disabled"
            ? "event monitoring is off for this application"
            : error instanceof Error
              ? error.message
              : String(error),
      };
    } finally {
      setBusy(null);
    }
    update((current) => ({
      ...current,
      takeover: { ...result, at: Date.now() },
    }));
    emitRef.current({ type: "takeover", result });

    return result;
  }, [route, update]);

  const reset = React.useCallback(() => {
    tokenRef.current = null;
    stateRef.current = null;
    setNotice(null);
    setState(null);
  }, []);

  /** The hosted flow redirected back here (finished on another device). */
  const resumeFromRedirect = React.useCallback(
    (sessionId: string) => {
      const customer = stateRef.current;

      if (customer?.stepUp?.sessionId === sessionId)
        void finishStepUp(sessionId);
      else if (customer?.onboarding?.sessionId === sessionId)
        void finishOnboarding(sessionId);
    },
    [finishOnboarding, finishStepUp],
  );

  const balance = React.useMemo(
    () => balanceOf(state?.activity ?? []),
    [state?.activity],
  );

  return {
    state,
    hydrated,
    busy,
    notice,
    balance,
    setNotice,
    open,
    startOnboarding,
    resumeOnboarding: () =>
      state?.onboarding && openHosted("onboarding", state.onboarding.url),
    seed,
    pay,
    confirmStepUp: () =>
      state?.stepUp && openHosted("stepUp", state.stepUp.url),
    /** Didit Authentication signed the same person in again for this transfer. */
    passkeyConfirmed: (transactionId: string, method: string) =>
      update((current) =>
        current.stepUp?.transactionId === transactionId
          ? {
              ...current,
              stepUp: {
                ...current.stepUp,
                passkey: { at: Date.now(), method },
              },
            }
          : current,
      ),
    attemptTakeover,
    resumeFromRedirect,
    reset,
  };
}

export type Alder = ReturnType<typeof useAlder>;
