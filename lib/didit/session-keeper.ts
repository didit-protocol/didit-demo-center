/**
 * Keeps a Didit Authentication session alive in the browser.
 *
 * The access token cookie lives about ten minutes. Without a page load the
 * proxy only rotates it when a request arrives after it expired, which is
 * when the demo fires several API calls at once; if that rotation fails the
 * routes answer 401 while the page still looks signed in. The keeper renews
 * one minute before the token expires, from one request, and reports a
 * failed renewal so the page signs the visitor out instead.
 *
 * No runtime imports: `npm test` drives it with a fake clock.
 */

export interface SessionState {
  signedIn: boolean;
  /** When the access token expires (ms since epoch), when it is known. */
  expiresAt: number | null;
}

export interface KeeperEnv {
  /** Reads the session without rotating it. */
  read(): Promise<SessionState>;
  /** Rotates the access token with the refresh token. */
  renew(): Promise<SessionState>;
  onSignedOut(): void;
  now(): number;
  setTimer(run: () => void, ms: number): unknown;
  clearTimer(timer: unknown): void;
}

/** Renew this long before the access token expires. */
export const RENEW_BEFORE_MS = 60_000;
/** When the expiry is unknown, renew this often (the token lives ~10 min). */
export const RENEW_EVERY_MS = 4 * 60_000;
/** After a network failure, try again this soon. */
export const RETRY_MS = 30_000;

/** How long to wait before the next renewal of a token expiring at `expiresAt`. */
export function renewDelay(expiresAt: number | null, now: number): number {
  if (expiresAt === null) return RENEW_EVERY_MS;

  return Math.max(
    0,
    Math.min(RENEW_EVERY_MS, expiresAt - RENEW_BEFORE_MS - now),
  );
}

/** Starts keeping the session alive; returns `stop`. */
export function keepSession(env: KeeperEnv): () => void {
  let timer: unknown = null;
  let stopped = false;

  const schedule = (ms: number) => {
    if (stopped) return;
    if (timer !== null) env.clearTimer(timer);
    timer = env.setTimer(() => {
      timer = null;
      void step(env.renew);
    }, ms);
  };

  const step = async (call: () => Promise<SessionState>) => {
    let state: SessionState;

    try {
      state = await call();
    } catch {
      // Offline or Didit unreachable: the session may still be fine.
      schedule(RETRY_MS);

      return;
    }
    if (stopped) return;
    if (!state.signedIn) {
      stopped = true;
      env.onSignedOut();

      return;
    }
    schedule(renewDelay(state.expiresAt, env.now()));
  };

  void step(env.read);

  return () => {
    stopped = true;
    if (timer !== null) env.clearTimer(timer);
  };
}
