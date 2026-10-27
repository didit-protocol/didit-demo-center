/**
 * The browser half of the shared Didit client: the web SDK modal, monitored
 * transactions (always submitted from the browser, so the SDK attaches the
 * same device fingerprint signals collects), action_required step-ups and
 * the device read-out the live layer shows.
 *
 * Every SDK is loaded lazily, so pages that never verify or transact do not
 * download it.
 */

import type {
  DiditTransactionPayload,
  SubmitTransactionResult,
  VerificationResult,
} from "@didit-protocol/sdk-web";

type Sdk = (typeof import("@didit-protocol/sdk-web"))["DiditSdk"];

let sdkPromise: Promise<Sdk> | null = null;

export function loadSdk(): Promise<Sdk> {
  sdkPromise ??= import("@didit-protocol/sdk-web").then((mod) => mod.DiditSdk);

  return sdkPromise;
}

/**
 * Opens a hosted verification session in the web SDK modal and resolves with
 * how it ended. The session is always created on the server for the
 * signed-in visitor; the browser only ever gets its URL.
 */
export async function openVerification(url: string): Promise<VerificationResult> {
  const sdk = await loadSdk();

  return new Promise((resolve) => {
    sdk.shared.onComplete = (result) => {
      sdk.shared.onComplete = undefined;
      resolve(result);
    };
    void sdk.shared.startVerification({
      url,
      configuration: {
        showCloseButton: true,
        showExitConfirmation: true,
        closeModalOnComplete: true,
      },
    });
  });
}

export interface TransactionToken {
  token: string;
  baseUrl: string;
}

export interface SubmitInput {
  /** Mints (or reuses) the visitor's transaction token on the server. */
  token: (force: boolean) => Promise<TransactionToken>;
  transaction: DiditTransactionPayload;
}

const isTokenError = (error: unknown) => {
  const type = (error as { type?: string } | null)?.type;

  return type === "expired_token" || type === "invalid_token";
};

/**
 * `submitTransaction` from the browser with the visitor's token, retried once
 * with a fresh token when the old one expired. Didit decides; a held
 * transaction comes back with `actionRequired` for `applyStepUp`.
 */
export async function submitTransaction({
  token,
  transaction,
}: SubmitInput): Promise<SubmitTransactionResult> {
  const sdk = await loadSdk();
  const send = async (force: boolean) => {
    const current = await token(force);

    return sdk.shared.submitTransaction({
      transactionToken: current.token,
      transaction,
      baseUrl: current.baseUrl,
      // Step-ups open when the visitor chooses to, from the app's own screen.
      autoLaunchAction: false,
    });
  };

  try {
    return await send(false);
  } catch (error) {
    if (!isTokenError(error)) throw error;

    return send(true);
  }
}

/** The step-up a held transaction asks for, if any. */
export function stepUpOf(result: Pick<SubmitTransactionResult, "actionRequired">) {
  const action = result.actionRequired;

  return action?.url ? { url: action.url, type: action.type } : null;
}

/**
 * Applies an `action_required` step-up: opens its verification in the web
 * SDK modal and resolves when the visitor finishes or closes it.
 */
export async function applyStepUp(
  result: Pick<SubmitTransactionResult, "actionRequired">,
): Promise<VerificationResult | null> {
  const step = stepUpOf(result);

  return step ? openVerification(step.url) : null;
}

export interface DeviceSummary {
  persistentId: string;
  firstVisit: boolean;
  botScore: number;
  botFlags: string[];
  browser: string;
  os: string;
}

/** "Chrome", "macOS": enough to name a device in the live layer. */
export function describeAgent(userAgent: string): { browser: string; os: string } {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "A browser";
  const os = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "an unknown system";

  return { browser, os };
}

/**
 * What signals knows about this device right now: the persistent id it
 * attaches to every event and transaction, whether it was just created and
 * the bot score. Null where the fingerprint cannot run.
 */
export async function readDevice(): Promise<DeviceSummary | null> {
  try {
    const { getDeviceFingerprintPayload } = await import(
      "@didit-protocol/signals"
    );
    const payload = await getDeviceFingerprintPayload();

    if (!payload) return null;

    return {
      persistentId: payload.persistentId,
      firstVisit: payload.persistentIdWasCreated,
      botScore: payload.bot.score,
      botFlags: payload.bot.flags,
      ...describeAgent(navigator.userAgent),
    };
  } catch {
    return null;
  }
}
