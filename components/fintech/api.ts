import type {
  AccountView,
  ErrorCode,
  MonitoringReply,
  PaymentWithLink,
  PaymentsReply,
  VerificationView,
} from "@/lib/fintech/server";

/**
 * The browser side of the demo's API: thin calls to /api/fintech/*. The
 * account cookie travels on its own (httpOnly, path /api/fintech), so no id
 * is ever passed from here - the server reads them from the cookie.
 */
export interface ApiError {
  status: number;
  error: ErrorCode | "network";
  detail?: string;
  fields?: string[];
  available?: number;
  verification?: VerificationView;
}

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: ApiError };

async function call<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`/api/fintech/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, error: { status: response.status, ...data } };
    }

    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: { status: 0, error: "network" } };
  }
}

export interface AccountReply {
  account: AccountView | null;
  verification?: VerificationView | null;
}

export const api = {
  account: () => call<AccountReply>("GET", "account"),
  signUp: (input: { name: string; email: string; country: string }) =>
    call<AccountReply>("POST", "account", input),
  reset: () => call<AccountReply>("DELETE", "account"),
  startVerification: () =>
    call<{ sessionId: string; sessionNumber: number | null; url: string }>(
      "POST",
      "verification",
    ),
  verification: () =>
    call<{ verification: VerificationView }>("GET", "verification"),
  payments: () => call<PaymentsReply>("GET", "payments"),
  pay: (input: {
    kind: "deposit" | "transfer";
    amount: number;
    counterparty?: string;
  }) => call<{ payment: PaymentWithLink }>("POST", "payments", input),
  monitoring: () => call<MonitoringReply>("POST", "monitoring"),
};

export type { AccountView, PaymentWithLink, VerificationView };
