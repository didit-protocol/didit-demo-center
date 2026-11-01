/**
 * The browser's network calls for /fintech: Alder's own routes, and the one
 * read it makes straight to Didit with the customer's transaction token.
 *
 * Every call has a timeout and fails with a sentence the customer can read,
 * never a status code or a browser's "Failed to fetch". Pure and free of
 * `@/` imports, so `npm test` loads it straight from Node.
 */

/** An Alder route can make two Didit calls, each allowed 30 s on the server. */
export const ROUTE_TIMEOUT_MS = 35_000;

/** One read from Didit's device-facing API. */
export const DIDIT_TIMEOUT_MS = 15_000;

export class RouteError extends Error {
  /** The HTTP status, or 0 when the request never got an answer. */
  readonly status: number;
  /** Didit's or the route's machine-readable code, when there is one. */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "RouteError";
    this.status = status;
    this.code = code;
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Why a request got no answer at all: a timeout, or no network. */
export function networkMessage(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;

  return name === "TimeoutError" || name === "AbortError"
    ? "This is taking too long. Check your connection and try again."
    : "Alder could not be reached. Check your connection and try again.";
}

function statusMessage(status: number): string {
  return status >= 500
    ? "Something went wrong on our side. Try again in a moment."
    : "That did not work. Try again.";
}

/**
 * One of Alder's routes. They answer `{ error, code? }` when they fail, and
 * that sentence is what the customer sees.
 */
export async function callRoute<T>(
  path: string,
  init: RequestInit = {},
  fetcher: Fetch = (input, options) => fetch(input, options),
  timeoutMs = ROUTE_TIMEOUT_MS,
): Promise<T> {
  let response: Response;

  try {
    response = await fetcher(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new RouteError(networkMessage(error), 0);
  }
  const data = (await response.json().catch(() => null)) as
    (T & { error?: unknown; code?: unknown }) | null;

  if (!response.ok) {
    throw new RouteError(
      typeof data?.error === "string" && data.error
        ? data.error
        : statusMessage(response.status),
      response.status,
      typeof data?.code === "string" ? data.code : undefined,
    );
  }

  return data as T;
}

/**
 * `GET /v1/transactions/{id}/` with the customer's transaction token: the
 * status Didit holds for one of their own payments. Null when Didit does not
 * answer it, so the caller falls back to what the submission returned.
 */
export async function fetchTransaction(
  token: { token: string; baseUrl: string },
  id: string,
  fetcher: Fetch = (input, options) => fetch(input, options),
  timeoutMs = DIDIT_TIMEOUT_MS,
): Promise<unknown | null> {
  try {
    const response = await fetcher(
      `${token.baseUrl}/v1/transactions/${encodeURIComponent(id)}/`,
      {
        headers: { "X-Transaction-Token": token.token },
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    return response.ok ? await response.json().catch(() => null) : null;
  } catch {
    return null;
  }
}
