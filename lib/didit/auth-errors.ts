/**
 * One sentence for a failed Didit Authentication step, so no demo ever shows
 * an SDK error code or message to the visitor. No runtime imports: `npm test`
 * loads it straight from Node.
 */

export type AuthStep = "start" | "verify";

interface AuthFailure {
  code?: unknown;
  retryAfter?: unknown;
  status?: unknown;
  name?: unknown;
  message?: unknown;
}

function codeOf(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const { code, name, message, status } = error as AuthFailure;

  if (typeof code === "string" && code) return code;
  if (status === 429) return "rate_limited";
  // fetch() rejects with a TypeError when the request never left the browser.
  if (name === "TypeError" || name === "AbortError") return "network_error";
  if (typeof message === "string") {
    // The Next.js route client reports a refused code exchange by status.
    if (/failed with 4\d\d/.test(message)) return "invalid_grant";
    if (/failed with 5\d\d/.test(message)) return "server_error";
  }

  return null;
}

function wait(seconds: unknown): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0)
    return "a minute";
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  const minutes = Math.ceil(seconds / 60);

  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}

/**
 * The sentence for an error thrown by `emailCode.start` (step "start") or
 * `emailCode.verify` (step "verify").
 */
export function authErrorMessage(error: unknown, step: AuthStep): string {
  const code = codeOf(error);

  switch (code) {
    case "method_unavailable":
      return "Email codes are not available here. Use a passkey, Google or Apple instead.";
    case "invalid_grant":
    case "no_pending_attempt":
      return step === "verify"
        ? "That code did not work or has expired. Check it, or ask for a new one."
        : "That sign-in has expired. Start again.";
    case "rate_limited":
      return `Too many attempts. Wait ${wait((error as AuthFailure).retryAfter)} and try again.`;
    case "invalid_request":
      return step === "verify"
        ? "Enter the six-digit code from the email."
        : "Enter a valid email address.";
    case "delivery_unavailable":
      return "The email could not be sent right now. Try again in a moment, or use a passkey.";
    case "attempt_blocked":
      return "Didit's protection stopped this sign-in. Use a passkey instead.";
    case "origin_not_allowed":
      return "Sign-in is not set up for this address. Use the hosted sign-in instead.";
    case "network_error":
      return "Didit could not be reached. Check your connection and try again.";
    case "server_error":
      return "Didit could not finish that step. Try again in a moment.";
    default:
      return step === "verify"
        ? "That code did not work. Check it and try again."
        : "The code could not be sent. Try again in a moment.";
  }
}
