/**
 * The browser's side of the marketplace: calls to this app's own
 * /api/marketplace routes (which hold the API key) and the web SDK flows.
 */
import type { DiditTransactionPayload } from "@didit-protocol/sdk-web";
import type { TokenGrant, TokenPurpose } from "./server.ts";
import type { TransactionSummary } from "./summaries.ts";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code?: string };

export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`/api/marketplace${path}`, {
      method: init?.method ?? "GET",
      headers:
        init?.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          (data && typeof data.error === "string" && data.error) ||
          "The demo's server did not answer. Try again.",
        code: data?.code,
      };
    }

    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "The demo's server could not be reached. Check your connection.",
    };
  }
}

type SdkModule = typeof import("@didit-protocol/sdk-web");

let sdkPromise: Promise<SdkModule> | null = null;

/** The web SDK, loaded once and only in the browser. */
export function loadSdk(): Promise<SdkModule> {
  sdkPromise ??= import("@didit-protocol/sdk-web");

  return sdkPromise;
}

/**
 * Mint a token for one of this browser's identities, submit the transaction
 * from this device with the web SDK, then let the server remember it.
 */
export async function submitMonitored(
  purpose: TokenPurpose,
  build: (grant: TokenGrant, random: string) => DiditTransactionPayload,
  seller?: string,
): Promise<ApiResult<TransactionSummary>> {
  const grant = await api<TokenGrant>("/token", {
    method: "POST",
    body: { purpose, seller },
  });

  if (!grant.ok) return grant;

  const { DiditSdk, DiditTransactionError } = await loadSdk();

  let transactionId: string;

  try {
    const result = await DiditSdk.shared.submitTransaction({
      transactionToken: grant.data.token,
      baseUrl: grant.data.baseUrl,
      transaction: build(grant.data, crypto.randomUUID()),
      // A verification_session action is never auto-launched; the page
      // opens it itself, next to the order it belongs to.
      autoLaunchAction: false,
    });

    transactionId = result.transactionId;
  } catch (error) {
    const message =
      error instanceof DiditTransactionError
        ? `${error.message}${error.type === "validation" && error.fieldErrors ? ` ${JSON.stringify(error.fieldErrors)}` : ""}`
        : "The transaction could not be submitted.";

    return { ok: false, status: 0, error: message };
  }

  return api<TransactionSummary>("/transactions", {
    method: "POST",
    body: { uuid: transactionId },
  });
}

/** Open a hosted session (KYB, a key person's KYC, the buyer's age check). */
export async function openHostedFlow(url: string): Promise<void> {
  const { DiditSdk } = await loadSdk();

  await DiditSdk.shared.startVerification({
    url,
    configuration: {
      showCloseButton: true,
      showExitConfirmation: true,
      closeModalOnComplete: true,
      zIndex: 2000,
    },
  });
}

/** Re-read a transaction until it leaves `AWAITING_USER` or time runs out. */
export async function waitForTransaction(
  uuid: string,
  { attempts = 20, intervalMs = 3000 } = {},
): Promise<ApiResult<TransactionSummary>> {
  let last: ApiResult<TransactionSummary> = await api(`/transactions/${uuid}`);

  for (let i = 1; i < attempts; i += 1) {
    if (!last.ok || last.data.status !== "AWAITING_USER") return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await api(`/transactions/${uuid}`);
  }

  return last;
}
