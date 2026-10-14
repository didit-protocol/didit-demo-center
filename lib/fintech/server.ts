import type { AccountState } from "./account-cookie";

import {
  CUSTOMER_PREFIX,
  MAX_PAYMENTS,
  balances,
  consoleLinks,
  parsePayment,
  parseSignUp,
  reduceDecision,
  reduceMonitoringEstimate,
  reduceTransaction,
  sessionLanguage,
  sessionPayload,
  sortPayments,
  transactionPayload,
  type Balances,
  type ConsoleTarget,
  type MonitoringEstimate,
  type OnboardingView,
  type PaymentView,
} from "./model";

/**
 * The fintech demo's server side, one function per API route.
 *
 * Each handler takes the visitor's account cookie and the request body and
 * returns the reply plus the cookie to write - the route files under
 * app/api/fintech only translate that to and from Next. Didit is reached
 * through `env.fetch`, which is the real `fetch` in the app and a recorded
 * staging response in the tests.
 *
 * Every call to Didit uses ids from the visitor's own signed cookie, never ids
 * from the request, so a visitor can only ever read their own session and
 * their own payments.
 */
export interface FintechEnv {
  /** Server-side Didit API key. Never sent to the browser. */
  apiKey: string;
  /** e.g. https://verification.staging.didit.me */
  apiBase: string;
  /** False on any environment but staging: the demo then refuses to run. */
  live: boolean;
  console: ConsoleTarget;
  fetch: typeof fetch;
  now: () => number;
  newId: () => string;
}

export type ErrorCode =
  | "unavailable"
  | "invalid"
  | "no_account"
  | "no_session"
  | "already_verified"
  | "not_approved"
  | "limit"
  | "insufficient_funds"
  | "didit";

export interface Reply {
  status: number;
  body: Record<string, unknown>;
  /** Omitted: leave the cookie alone. null: clear it. A state: write it. */
  account?: AccountState | null;
}

export interface AccountView {
  id: string;
  name: string;
  email: string;
  country: string;
  createdAt: string;
  hasSession: boolean;
}

export interface VerificationView extends OnboardingView {
  consoleUrl: string | null;
}

export interface PaymentWithLink extends PaymentView {
  consoleUrl: string | null;
}

export interface PaymentsReply {
  payments: PaymentWithLink[];
  balances: Balances;
  limit: number;
}

export interface MonitoringReply {
  estimate: MonitoringEstimate;
}

function fail(status: number, error: ErrorCode, extra = {}): Reply {
  return { status, body: { error, ...extra } };
}

/** A Didit call that failed: the status and reason the API gave, never a stack. */
interface DiditFailure {
  upstream: number;
  detail: string;
}

function isDiditFailure(error: unknown): error is DiditFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as DiditFailure).upstream === "number" &&
    typeof (error as DiditFailure).detail === "string"
  );
}

async function didit(
  env: FintechEnv,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  let response: Response;

  try {
    response = await env.fetch(`${env.apiBase}${path}`, {
      method,
      headers: { "x-api-key": env.apiKey, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    const failure: DiditFailure = {
      upstream: 0,
      detail: "Didit could not be reached.",
    };

    throw failure;
  }

  const data = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok) {
    const detail = data && (data.detail ?? data.error ?? data.message);

    const failure: DiditFailure = {
      upstream: response.status,
      detail: typeof detail === "string" ? detail : `HTTP ${response.status}`,
    };

    throw failure;
  }

  return data ?? {};
}

function diditFailure(error: unknown): Reply {
  if (isDiditFailure(error)) {
    return fail(502, "didit", {
      upstream: error.upstream,
      detail: error.detail,
    });
  }

  return fail(502, "didit");
}

function guard(env: FintechEnv): Reply | null {
  return env.live && env.apiKey ? null : fail(503, "unavailable");
}

function accountView(state: AccountState): AccountView {
  return {
    id: state.id,
    name: state.name,
    email: state.email,
    country: state.country,
    createdAt: new Date(state.at).toISOString(),
    hasSession: state.sid !== null,
  };
}

async function fetchVerification(
  env: FintechEnv,
  sessionId: string,
): Promise<VerificationView> {
  const decision = await didit(
    env,
    "GET",
    `/v3/session/${encodeURIComponent(sessionId)}/decision/`,
  );
  const view = reduceDecision(decision);

  return {
    ...view,
    sessionId: view.sessionId || sessionId,
    consoleUrl: consoleLinks(env.console).session(view.sessionId || sessionId),
  };
}

async function fetchPayments(
  env: FintechEnv,
  state: AccountState,
): Promise<PaymentWithLink[]> {
  const links = consoleLinks(env.console);
  const records = await Promise.all(
    state.tx.map((id) =>
      didit(env, "GET", `/v3/transactions/${encodeURIComponent(id)}/`),
    ),
  );

  return sortPayments(records.map(reduceTransaction)).map((p) => ({
    ...p,
    consoleUrl: links.transaction(p.id),
  }));
}

// ── /api/fintech/account ──────────────────────────────────────────────

export async function getAccount(
  env: FintechEnv,
  state: AccountState | null,
): Promise<Reply> {
  const blocked = guard(env);

  if (blocked) return blocked;
  if (!state) return { status: 200, body: { account: null } };

  if (!state.sid) {
    return {
      status: 200,
      body: { account: accountView(state), verification: null },
    };
  }

  try {
    return {
      status: 200,
      body: {
        account: accountView(state),
        verification: await fetchVerification(env, state.sid),
      },
    };
  } catch (error) {
    return diditFailure(error);
  }
}

/** Opening an account is the bank's own sign-up: nothing is sent to Didit yet. */
export async function createAccount(
  env: FintechEnv,
  body: unknown,
): Promise<Reply> {
  const blocked = guard(env);

  if (blocked) return blocked;

  const parsed = parseSignUp(body);

  if (!parsed.ok) return fail(400, "invalid", { fields: parsed.errors });

  const state: AccountState = {
    v: 1,
    id: `${CUSTOMER_PREFIX}${env.newId()}`,
    ...parsed.value,
    sid: null,
    tx: [],
    at: env.now(),
  };

  return {
    status: 201,
    body: { account: accountView(state), verification: null },
    account: state,
  };
}

export async function deleteAccount(): Promise<Reply> {
  return { status: 200, body: { account: null }, account: null };
}

// ── /api/fintech/verification ─────────────────────────────────────────

function callbackFrom(origin: unknown): string | null {
  if (typeof origin !== "string") return null;

  try {
    const url = new URL(origin);

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    return `${url.origin}/fintech`;
  } catch {
    return null;
  }
}

/**
 * Creates the onboarding session (`POST /v3/session/`) with the bank's fixed
 * workflow. Didit hands back the same unfinished session for the same
 * `vendor_data`, so starting again after closing the flow resumes it.
 */
export async function startVerification(
  env: FintechEnv,
  state: AccountState | null,
  body: unknown,
): Promise<Reply> {
  const blocked = guard(env);

  if (blocked) return blocked;
  if (!state) return fail(401, "no_account");

  const input = (body ?? {}) as Record<string, unknown>;
  const callback = callbackFrom(input.origin);

  if (!callback) return fail(400, "invalid", { fields: ["origin"] });

  try {
    if (state.sid) {
      const current = await fetchVerification(env, state.sid);

      if (["approved", "review", "declined"].includes(current.status)) {
        return fail(409, "already_verified", { verification: current });
      }
    }

    const session = await didit(
      env,
      "POST",
      "/v3/session/",
      sessionPayload(
        state,
        callback,
        sessionLanguage(typeof input.locale === "string" ? input.locale : ""),
      ),
    );
    const sessionId = String(session.session_id ?? "");

    return {
      status: 201,
      body: {
        sessionId,
        sessionNumber: session.session_number ?? null,
        url: session.url,
      },
      account: { ...state, sid: sessionId },
    };
  } catch (error) {
    return diditFailure(error);
  }
}

/** The onboarding decision, statuses only (see reduceDecision). */
export async function readVerification(
  env: FintechEnv,
  state: AccountState | null,
): Promise<Reply> {
  const blocked = guard(env);

  if (blocked) return blocked;
  if (!state) return fail(401, "no_account");
  if (!state.sid) return fail(404, "no_session");

  try {
    return {
      status: 200,
      body: { verification: await fetchVerification(env, state.sid) },
    };
  } catch (error) {
    return diditFailure(error);
  }
}

// ── /api/fintech/payments ─────────────────────────────────────────────

export async function listPayments(
  env: FintechEnv,
  state: AccountState | null,
): Promise<Reply> {
  const blocked = guard(env);

  if (blocked) return blocked;
  if (!state) return fail(401, "no_account");

  try {
    const payments = await fetchPayments(env, state);
    const body: PaymentsReply = {
      payments,
      balances: balances(payments),
      limit: MAX_PAYMENTS,
    };

    return { status: 200, body: { ...body } };
  } catch (error) {
    return diditFailure(error);
  }
}

/**
 * Posts one payment to transaction monitoring (`POST /v3/transactions/`).
 *
 * The bank only moves money for a verified customer, and never more than the
 * customer has: both are checked against Didit's own records first. The
 * verdict - cleared, held for review, declined - is whatever the rules engine
 * returned synchronously.
 */
export async function createPayment(
  env: FintechEnv,
  state: AccountState | null,
  body: unknown,
): Promise<Reply> {
  const blocked = guard(env);

  if (blocked) return blocked;
  if (!state) return fail(401, "no_account");
  if (!state.sid) return fail(409, "not_approved");

  const parsed = parsePayment(body);

  if (!parsed.ok) return fail(400, "invalid", { fields: parsed.errors });
  if (state.tx.length >= MAX_PAYMENTS)
    return fail(409, "limit", { limit: MAX_PAYMENTS });

  try {
    const verification = await fetchVerification(env, state.sid);

    if (verification.status !== "approved") return fail(409, "not_approved");

    if (parsed.value.kind === "transfer") {
      const { available } = balances(await fetchPayments(env, state));

      if (parsed.value.amount > available) {
        return fail(409, "insufficient_funds", { available });
      }
    }

    const record = await didit(
      env,
      "POST",
      "/v3/transactions/",
      transactionPayload(
        state,
        parsed.value,
        `${state.id}-${env.now().toString(36)}`,
      ),
    );
    const payment = reduceTransaction(record);

    return {
      status: 201,
      body: {
        payment: {
          ...payment,
          consoleUrl: consoleLinks(env.console).transaction(payment.id),
        },
      },
      account: { ...state, tx: [...state.tx, payment.id] },
    };
  } catch (error) {
    return diditFailure(error);
  }
}

// ── /api/fintech/monitoring ───────────────────────────────────────────

/**
 * What switching on ongoing AML monitoring for this customer would do and
 * cost, from `POST /v3/users/aml-monitoring/` with `estimate_only: true`.
 * Nothing is enabled, screened or billed.
 */
export async function previewMonitoring(
  env: FintechEnv,
  state: AccountState | null,
): Promise<Reply> {
  const blocked = guard(env);

  if (blocked) return blocked;
  if (!state) return fail(401, "no_account");

  try {
    const estimate = await didit(env, "POST", "/v3/users/aml-monitoring/", {
      is_enabled: true,
      estimate_only: true,
      vendor_data_list: [state.id],
    });
    const body: MonitoringReply = {
      estimate: reduceMonitoringEstimate(estimate),
    };

    return { status: 200, body: { ...body } };
  } catch (error) {
    return diditFailure(error);
  }
}
