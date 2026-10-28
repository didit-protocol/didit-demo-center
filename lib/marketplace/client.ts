/**
 * The browser's calls to this app's own /api/marketplace routes, which hold
 * the API key. The web SDK flows go through lib/didit/browser.ts.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code?: string };

/**
 * Each route makes at most a few Didit calls of 20 seconds each, so a reply
 * that takes longer than this is not coming.
 */
export const API_TIMEOUT_MS = 45_000;

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
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
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
  } catch (problem) {
    const timedOut =
      problem instanceof DOMException && problem.name === "TimeoutError";

    return {
      ok: false,
      status: 0,
      error: timedOut
        ? "The demo's server took too long to answer. Try again."
        : "The demo's server could not be reached. Check your connection.",
    };
  }
}
