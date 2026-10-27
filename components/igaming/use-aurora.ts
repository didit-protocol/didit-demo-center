"use client";

import type { DiditCall } from "@/lib/igaming/server";

import * as React from "react";

import { type ActivityItem, ledger, openItems } from "@/lib/igaming/ledger";
import {
  type CashierKind,
  type ConsoleContext,
  SELF_EXCLUSION_PAYOUT,
  WELCOME_BONUS,
  buildCashierPayload,
  isFinalSessionStatus,
} from "@/lib/igaming/policy";
import {
  type PlayerProfile,
  type SessionSummary,
  type TransactionRecord,
  diditErrorMessage,
  projectTransaction,
} from "@/lib/igaming/records";

import { openVerification, submitTransaction } from "@/lib/didit/browser";

/** What just happened with Didit, for the live layer. */
export type AuroraSignal =
  | { type: "check-started"; check: "age" | "kyc" }
  | { type: "check-decided"; check: "age" | "kyc"; summary: SessionSummary }
  | { type: "transaction"; item: ActivityItem }
  | { type: "transaction-updated"; record: TransactionRecord };

export interface CheckState {
  sessionId: string;
  url: string;
  summary: SessionSummary | null;
}

export interface KycState extends CheckState {
  transactionId: string;
  listed: boolean;
}

export interface PlayerState {
  version: 1;
  playerId: string;
  name: string;
  email: string;
  createdAt: number;
  age: CheckState | null;
  /** The player has read the age check result and entered the lobby. */
  ageSeen: boolean;
  kyc: KycState | null;
  activity: ActivityItem[];
  depositLimit: number | null;
  selfExcluded: boolean;
  /** Opened with "second account on this device", for the bonus-abuse demo. */
  secondAccount: boolean;
}

export interface LogEntry {
  id: number;
  at: number;
  via: "server" | "browser" | "sdk";
  method: string;
  path: string;
  /** The HTTP status, when this page read the response itself. */
  status: number | null;
  /**
   * What the web SDK reported instead: `submitTransaction` resolves with the
   * transaction's status (or throws a typed error), never the HTTP one.
   */
  outcome?: string | null;
}

export interface OperatorState {
  console: ConsoleContext | null;
  player: PlayerProfile | null;
  loading: boolean;
}

export type Busy =
  | "join"
  | "age"
  | "kyc"
  | "verify"
  | CashierKind
  | "exclude"
  | "operator"
  | null;

export interface Notice {
  tone: "error" | "info";
  text: string;
}

const STATE_KEY = "aurora-play-demo:v1";
const LOG_KEY = "aurora-play-demo:log";
const SECOND_KEY = "aurora-play-demo:second-account";
const MAX_LOG = 40;

interface Token {
  token: string;
  expiresAt: number;
  baseUrl: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

function load<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);

    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Everything the Aurora Play demo does, in one hook.
 *
 * State lives in the browser (localStorage) because the demo has no database:
 * the server only holds the API key and the signed player cookie. Every
 * status shown comes from Didit - a session decision read through
 * /api/igaming/sessions, or a transaction read back from `/v1/transactions/`
 * with the player's own token.
 */
export function useAurora(
  emit: (signal: AuroraSignal) => void = () => undefined,
) {
  const [state, setState] = React.useState<PlayerState | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [operator, setOperator] = React.useState<OperatorState>({
    console: null,
    player: null,
    loading: false,
  });
  const [busy, setBusy] = React.useState<Busy>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [kycPrompt, setKycPrompt] = React.useState(false);
  const [secondPending, setSecondPending] = React.useState(false);

  const emitRef = React.useRef(emit);

  emitRef.current = emit;
  const tokenRef = React.useRef<Token | null>(null);
  const stateRef = React.useRef<PlayerState | null>(null);
  const hostedRef = React.useRef<"age" | "kyc" | null>(null);
  const completeRef = React.useRef<(sessionId: string | null) => void>(
    () => undefined,
  );
  const logId = React.useRef(0);

  stateRef.current = state;

  const update = React.useCallback(
    (fn: (current: PlayerState) => PlayerState) => {
      setState((current) => (current ? fn(current) : current));
    },
    [],
  );

  const record = React.useCallback(
    (
      via: LogEntry["via"],
      method: string,
      path: string,
      status: number | null,
      outcome: string | null = null,
    ) => {
      logId.current += 1;
      const entry: LogEntry = {
        id: Date.now() * 100 + (logId.current % 100),
        at: Date.now(),
        via,
        method,
        path,
        status,
        outcome,
      };

      setLog((current) => [entry, ...current].slice(0, MAX_LOG));
    },
    [],
  );

  const recordCalls = React.useCallback(
    (calls: DiditCall[] | undefined) => {
      for (const call of calls ?? []) {
        record("server", call.method, call.path, call.status || null);
      }
    },
    [record],
  );

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
      const data = (await readJson(response)) as
        (T & { error?: string; didit?: DiditCall[] }) | null;

      recordCalls(data?.didit);
      if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status}).`);
      }

      return data as T;
    },
    [recordCalls],
  );

  /* ── Persistence ── */

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = load<PlayerState>(window.localStorage, STATE_KEY);
      const storedLog = load<LogEntry[]>(window.sessionStorage, LOG_KEY);

      if (storedLog) setLog(storedLog);
      setSecondPending(window.sessionStorage.getItem(SECOND_KEY) === "1");
      try {
        const { playerId } = await route<{ playerId: string | null }>(
          "/api/igaming/player",
        );

        // The cookie is the identity; local state that belongs to another
        // player id (an old cookie, a cleared one) is dropped.
        if (!cancelled && stored?.version === 1 && stored.playerId === playerId)
          setState(stored);
      } catch {
        // No player yet: the lobby.
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

  React.useEffect(() => {
    if (hydrated) window.sessionStorage.setItem(LOG_KEY, JSON.stringify(log));
  }, [log, hydrated]);

  /* ── The web SDK ── */

  const openHosted = React.useCallback(
    (kind: "age" | "kyc", url: string) => {
      hostedRef.current = kind;
      record("sdk", "SDK", "startVerification (hosted flow)", null);
      emitRef.current({ type: "check-started", check: kind });
      openVerification(url).then((result) => {
        if (result.type === "failed") {
          setNotice({
            tone: "error",
            text: result.error?.message ?? "The verification flow failed.",
          });
        }
        completeRef.current(result.session?.sessionId ?? null);
      });
    },
    [record],
  );

  /* ── Sessions ── */

  const readSession = React.useCallback(
    async (sessionId: string) =>
      (
        await route<{ session: SessionSummary }>(
          `/api/igaming/sessions/${sessionId}`,
        )
      ).session,
    [route],
  );

  /** Re-read a session; right after the flow closes it may still be processing. */
  const settleSession = React.useCallback(
    async (sessionId: string) => {
      let summary = await readSession(sessionId);

      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (
          isFinalSessionStatus(summary.status) ||
          summary.status === "Not Started"
        )
          break;
        await sleep(2000);
        summary = await readSession(sessionId);
      }

      return summary;
    },
    [readSession],
  );

  /* ── Transactions ── */

  const ensureToken = React.useCallback(
    async (force = false): Promise<Token> => {
      const current = tokenRef.current;

      if (!force && current && current.expiresAt - Date.now() > 60_000)
        return current;
      // The server mints only for a player whose age check Didit approved.
      const minted = await route<{
        token: string;
        expiresAt: string;
        baseUrl: string;
      }>("/api/igaming/token", {
        method: "POST",
        body: JSON.stringify({
          ageSessionId: stateRef.current?.age?.sessionId ?? null,
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

  /** `GET /v1/transactions/{id}/` with the player's own transaction token. */
  const readTransaction = React.useCallback(
    async (id: string): Promise<TransactionRecord | null> => {
      const token = await ensureToken();
      const path = `/v1/transactions/${id}/`;
      const response = await fetch(`${token.baseUrl}${path}`, {
        headers: { "X-Transaction-Token": token.token },
      });

      record("browser", "GET", path, response.status);
      if (!response.ok) return null;

      return projectTransaction(await readJson(response));
    },
    [ensureToken, record],
  );

  const replaceRecord = React.useCallback(
    (next: TransactionRecord) => {
      emitRef.current({ type: "transaction-updated", record: next });
      update((current) => ({
        ...current,
        activity: current.activity.map((item) =>
          item.record?.id === next.id ? { ...item, record: next } : item,
        ),
      }));
    },
    [update],
  );

  /** One cashier action through the web SDK, with what Didit decided. */
  const send = React.useCallback(
    async (
      kind: CashierKind,
      amount: number,
      detail: string | null,
    ): Promise<ActivityItem | null> => {
      const player = stateRef.current;

      if (!player) return null;

      const payload = buildCashierPayload(
        { kind, amount, playerName: player.name, detail: detail ?? undefined },
        player.playerId,
        Date.now(),
      );
      const item: ActivityItem = {
        key: payload.txnId,
        kind,
        amount,
        detail,
        at: Date.now(),
        record: null,
        error: null,
        httpStatus: null,
      };

      try {
        const result = await submitTransaction({
          token: (force) => ensureToken(force),
          transaction: payload,
        });

        record("browser", "POST", "/v1/transactions/", null, result.status);
        item.record =
          (await readTransaction(result.transactionId)) ??
          ({
            id: result.transactionId,
            txnId: payload.txnId,
            number: null,
            category: payload.category,
            actionType: kind,
            direction: payload.details.direction,
            amount,
            currency: payload.details.currency,
            status: result.status,
            score: 0,
            reason: null,
            tags: [],
            ruleHits: [],
            device: {
              fingerprint: null,
              ipCountry: null,
              ipCountryCode: null,
              isVpnOrTor: false,
              isDataCenter: false,
            },
            action: result.actionRequired
              ? {
                  type: result.actionRequired.type,
                  url: result.actionRequired.url,
                  sessionId: result.actionRequired.sessionId ?? null,
                  status: result.actionRequired.status ?? null,
                }
              : null,
            createdAt: null,
          } satisfies TransactionRecord);
      } catch (error) {
        const failure = error as {
          type?: string;
          status?: number;
          fieldErrors?: Record<string, unknown>;
          message?: string;
        };

        // Only the SDK's typed errors mean the request reached Didit; a token
        // the server refused never got that far.
        if (failure.type)
          record(
            "browser",
            "POST",
            "/v1/transactions/",
            failure.status ?? null,
            failure.status ? null : failure.type,
          );
        item.httpStatus = failure.status ?? null;
        item.error =
          diditErrorMessage(failure.fieldErrors) ??
          failure.message ??
          "Didit did not accept the transaction.";
      }

      const action = item.record?.action;

      update((current) => ({
        ...current,
        activity: [item, ...current.activity],
        ...(action?.type === "verification_session" &&
        item.record?.status === "AWAITING_USER"
          ? {
              kyc: {
                sessionId: action.sessionId ?? "",
                url: action.url,
                transactionId: item.record.id,
                summary: null,
                listed: false,
              },
            }
          : {}),
      }));
      if (action?.type === "verification_session") setKycPrompt(true);
      emitRef.current({ type: "transaction", item });

      return item;
    },
    [ensureToken, readTransaction, record, update],
  );

  const submit = React.useCallback(
    async (kind: CashierKind, amount: number, detail: string | null) => {
      setBusy(kind);
      setNotice(null);
      try {
        return await send(kind, amount, detail);
      } finally {
        setBusy(null);
      }
    },
    [send],
  );

  /** Re-read every transaction whose status can still move. */
  const refreshActivity = React.useCallback(async () => {
    const player = stateRef.current;

    if (!player) return;
    for (const item of openItems(player.activity)) {
      const next = item.record ? await readTransaction(item.record.id) : null;

      if (next) replaceRecord(next);
    }
  }, [readTransaction, replaceRecord]);

  /* ── The ID step-up ── */

  const finishKyc = React.useCallback(
    async (sessionId: string) => {
      const kyc = stateRef.current?.kyc;

      if (!kyc || kyc.sessionId !== sessionId) return;
      setBusy("verify");
      try {
        const summary = await settleSession(sessionId);

        update((current) => ({
          ...current,
          kyc: current.kyc ? { ...current.kyc, summary } : current.kyc,
        }));
        emitRef.current({ type: "check-decided", check: "kyc", summary });
        if (summary.status === "Approved") {
          await route("/api/igaming/verified", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
          });
          update((current) => ({
            ...current,
            kyc: current.kyc ? { ...current.kyc, listed: true } : current.kyc,
          }));
        }
        // The held deposit follows the session: Approved approves it.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const next = await readTransaction(kyc.transactionId);

          if (next) replaceRecord(next);
          if (!next || next.status !== "AWAITING_USER") break;
          if (!isFinalSessionStatus(summary.status)) break;
          await sleep(1500);
        }
      } catch (error) {
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusy(null);
      }
    },
    [readTransaction, replaceRecord, route, settleSession, update],
  );

  /* ── Registration ── */

  const finishAge = React.useCallback(
    async (sessionId: string) => {
      setBusy("age");
      try {
        const summary = await settleSession(sessionId);

        update((current) =>
          current.age?.sessionId === sessionId
            ? { ...current, age: { ...current.age, summary } }
            : current,
        );
        emitRef.current({ type: "check-decided", check: "age", summary });
      } catch (error) {
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusy(null);
      }
    },
    [settleSession, update],
  );

  completeRef.current = (sessionId) => {
    const kind = hostedRef.current;
    const player = stateRef.current;

    hostedRef.current = null;
    if (!player) return;
    if (kind === "kyc" && player.kyc) {
      void finishKyc(sessionId ?? player.kyc.sessionId);
    } else if (player.age) {
      void finishAge(sessionId ?? player.age.sessionId);
    }
  };

  const startAgeCheck = React.useCallback(
    async (player: PlayerState) => {
      const session = await route<{ sessionId: string; url: string }>(
        "/api/igaming/age-check",
        {
          method: "POST",
          body: JSON.stringify({ fullName: player.name, email: player.email }),
        },
      );

      setState({
        ...player,
        age: { sessionId: session.sessionId, url: session.url, summary: null },
        ageSeen: false,
      });
      openHosted("age", session.url);
    },
    [openHosted, route],
  );

  const join = React.useCallback(
    async (name: string, email: string) => {
      setBusy("join");
      setNotice(null);
      try {
        const existing = stateRef.current;
        let player: PlayerState;

        if (existing && !existing.age) {
          // A retry after a failed session: same player, new details.
          player = { ...existing, name, email };
        } else {
          const { playerId } = await route<{ playerId: string }>(
            "/api/igaming/player",
            { method: "POST" },
          );

          tokenRef.current = null;
          player = {
            version: 1,
            playerId,
            name,
            email,
            createdAt: Date.now(),
            age: null,
            ageSeen: false,
            kyc: null,
            activity: [],
            depositLimit: null,
            selfExcluded: false,
            secondAccount: window.sessionStorage.getItem(SECOND_KEY) === "1",
          };
          window.sessionStorage.removeItem(SECOND_KEY);
          setSecondPending(false);
        }
        setState(player);
        await startAgeCheck(player);
      } catch (error) {
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusy(null);
      }
    },
    [route, startAgeCheck],
  );

  const retryAge = React.useCallback(async () => {
    const player = stateRef.current;

    if (!player) return;
    setBusy("age");
    setNotice(null);
    try {
      await startAgeCheck(player);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(null);
    }
  }, [startAgeCheck]);

  /** The hosted flow redirected back here (finished on another device). */
  const resumeFromRedirect = React.useCallback(
    (sessionId: string) => {
      const player = stateRef.current;

      if (player?.kyc?.sessionId === sessionId) void finishKyc(sessionId);
      else if (player?.age?.sessionId === sessionId) void finishAge(sessionId);
    },
    [finishAge, finishKyc],
  );

  /* ── Safer gambling ── */

  /**
   * Self-exclusion pays the balance back first, as a monitored withdrawal:
   * once the player is BLOCKED, Didit refuses every transaction of theirs,
   * payouts included. A refused payout never holds the exclusion up.
   */
  const selfExclude = React.useCallback(async () => {
    const current = stateRef.current;

    if (!current) return;
    setBusy("exclude");
    setNotice(null);
    try {
      const { balance } = ledger(current.activity, Date.now());

      if (balance > 0) await send("withdrawal", balance, SELF_EXCLUSION_PAYOUT);
      const { player } = await route<{ player: PlayerProfile | null }>(
        "/api/igaming/self-exclusion",
        { method: "POST" },
      );

      update((latest) => ({ ...latest, selfExcluded: true }));
      setOperator((latest) => ({ ...latest, player }));
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(null);
    }
  }, [route, send, update]);

  const setLimit = React.useCallback(
    async (limit: number) => {
      const item = await submit(
        "deposit_limit",
        limit,
        `Daily deposit limit set to ${limit} EUR`,
      );

      if (item?.record?.status === "APPROVED")
        update((current) => ({ ...current, depositLimit: limit }));
    },
    [submit, update],
  );

  /* ── Operator ── */

  const refreshOperator = React.useCallback(async () => {
    if (!stateRef.current) return;
    setOperator((current) => ({ ...current, loading: true }));
    try {
      const data = await route<{
        console: ConsoleContext | null;
        player: PlayerProfile | null;
      }>("/api/igaming/operator");

      setOperator({
        console: data.console,
        player: data.player,
        loading: false,
      });
      await refreshActivity();
    } catch {
      setOperator((current) => ({ ...current, loading: false }));
    }
  }, [refreshActivity, route]);

  /* ── Accounts ── */

  const openSecondAccount = React.useCallback(() => {
    tokenRef.current = null;
    setKycPrompt(false);
    setNotice(null);
    setOperator({ console: null, player: null, loading: false });
    setState(null);
    // Remembered so the join form can say what this second account is for.
    window.sessionStorage.setItem(SECOND_KEY, "1");
    setSecondPending(true);
  }, []);

  const reset = React.useCallback(() => {
    tokenRef.current = null;
    setKycPrompt(false);
    setNotice(null);
    setOperator({ console: null, player: null, loading: false });
    setState(null);
    setLog([]);
    window.sessionStorage.removeItem(SECOND_KEY);
    setSecondPending(false);
  }, []);

  const totals = React.useMemo(
    () => ledger(state?.activity ?? [], Date.now()),
    [state?.activity],
  );

  return {
    state,
    hydrated,
    log,
    operator,
    busy,
    notice,
    totals,
    kycPrompt,
    setNotice,
    setKycPrompt,
    join,
    retryAge,
    resumeAge: () => state?.age && openHosted("age", state.age.url),
    checkAge: () => state?.age && finishAge(state.age.sessionId),
    enterLobby: () => update((current) => ({ ...current, ageSeen: true })),
    startKyc: () => {
      setKycPrompt(false);
      if (state?.kyc) openHosted("kyc", state.kyc.url);
    },
    checkKyc: () => state?.kyc && finishKyc(state.kyc.sessionId),
    deposit: (amount: number) => submit("deposit", amount, null),
    withdraw: (amount: number) => submit("withdrawal", amount, null),
    bet: (amount: number, selection: string) =>
      submit("bet", amount, selection),
    claimBonus: () => submit("bonus_claim", WELCOME_BONUS, "Welcome free bet"),
    setLimit,
    selfExclude,
    refreshOperator,
    resumeFromRedirect,
    secondPending,
    openSecondAccount,
    reset,
  };
}

export type Aurora = ReturnType<typeof useAurora>;
