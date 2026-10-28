"use client";

import type { DeviceSummary } from "./browser";
import type { DiditEvent } from "@didit-protocol/signals";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@didit-protocol/auth-nextjs";

import { readDevice } from "./browser";
import { DEMOS } from "./demos";

/**
 * The browser side of Authentication and signals, once for every page.
 *
 * - signals: `configureEvents` on the first load; the device read-out
 *   (persistent id, bot score) for the live layer; page views and sign-ins
 *   submitted with a monitoring token minted for the signed-in visitor.
 * - Authentication: when the layout renders `<DiditAuth>`, the bridge below
 *   mirrors `useAuth()` here, so demos can ask "who is signed in" without
 *   knowing whether Authentication is on. When it is off, `auth` stays null
 *   and each demo keeps its own sign-in.
 */

type HeadlessResult = Awaited<
  ReturnType<ReturnType<typeof useAuth>["emailCode"]["start"]>
>;

export interface AuthView {
  status: "loading" | "signed-in" | "signed-out";
  userId: string | null;
  email: string | null;
  /** How the current session signed in: `passkey`, `code`, `password`. */
  methods: string[];
  sessionId: string | null;
  signUp(redirectUrl?: string): Promise<void>;
  signIn(redirectUrl?: string): Promise<void>;
  signOut(redirectUrl?: string): Promise<void>;
  /** Signs the same person in again on the hosted page (their passkey). */
  reauthenticate(redirectUrl?: string): Promise<void>;
  emailCode: {
    start(email: string): Promise<HeadlessResult>;
    verify(code: string): Promise<HeadlessResult>;
  };
}

interface DiditContextValue {
  authEnabled: boolean;
  auth: AuthView | null;
  device: DeviceSummary | null;
  /** Submits one event for the visitor of `demo`, once a token exists. */
  track(demo: string, event: DiditEvent): void;
  /** Asks for a monitoring token now (after a cookie sign-up, for example). */
  refreshToken(demo: string): void;
}

const DiditContext = React.createContext<DiditContextValue>({
  authEnabled: false,
  auth: null,
  device: null,
  track: () => undefined,
  refreshToken: () => undefined,
});

export const useDidit = () => React.useContext(DiditContext);

/** Set before a hosted sign-up redirect, so the return is reported as one. */
export const SIGNUP_INTENT = "didit-signup-intent";

function demoOf(pathname: string | null): string | null {
  return DEMOS.find((demo) => pathname?.startsWith(demo.route))?.id ?? null;
}

function AuthBridge({ onChange }: { onChange: (view: AuthView) => void }) {
  const auth = useAuth();
  const status: AuthView["status"] = !auth.isLoaded
    ? "loading"
    : auth.isSignedIn
      ? "signed-in"
      : "signed-out";
  const session = auth.session;

  React.useEffect(() => {
    onChange({
      status,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      methods: session?.methods ?? [],
      sessionId: session?.id ?? null,
      signUp: (redirectUrl) => auth.signUp({ redirectUrl }),
      signIn: (redirectUrl) => auth.signIn({ redirectUrl }),
      signOut: (redirectUrl) => auth.signOut({ redirectUrl }),
      reauthenticate: (redirectUrl) => auth.reauthenticate({ redirectUrl }),
      emailCode: {
        start: (email) => auth.emailCode.start({ email }),
        verify: (code) => auth.emailCode.verify({ code }),
      },
    });
    // `auth` is a new object every render; the session and status are what change.
  }, [status, session?.id, session?.user.id]);

  return null;
}

export function DiditClientProvider({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [auth, setAuth] = React.useState<AuthView | null>(null);
  const [device, setDevice] = React.useState<DeviceSummary | null>(null);
  const [tokens, setTokens] = React.useState<Record<string, string>>({});
  const pending = React.useRef<Record<string, DiditEvent[]>>({});
  const asked = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;

    import("@didit-protocol/signals").then(({ configureEvents }) => {
      configureEvents({
        onError: (error) => console.warn("Didit signals:", error.type),
      });
    });
    readDevice().then((summary) => {
      if (!cancelled) setDevice(summary);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const send = React.useCallback((token: string, events: DiditEvent[]) => {
    if (!events.length) return;
    import("@didit-protocol/signals").then(({ submitEvent }) => {
      for (const event of events) {
        try {
          submitEvent({ monitoringToken: token, event });
        } catch {
          // A malformed event is the demo's bug, never the visitor's problem.
        }
      }
    });
  }, []);

  const refreshToken = React.useCallback(
    (demo: string) => {
      fetch("/api/didit/events-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { token?: string } | null) => {
          if (!data?.token) return;
          const token = data.token;

          setTokens((current) => ({ ...current, [demo]: token }));
          send(token, pending.current[demo] ?? []);
          pending.current[demo] = [];
        })
        .catch(() => undefined);
    },
    [send],
  );

  const track = React.useCallback(
    (demo: string, event: DiditEvent) => {
      const token = tokens[demo];

      if (token) send(token, [event]);
      else (pending.current[demo] ??= []).push(event);
    },
    [send, tokens],
  );

  const demo = demoOf(pathname);
  const signedIn = auth?.status === "signed-in";

  // A token as soon as someone is signed in on a demo page.
  React.useEffect(() => {
    if (!demo || !signedIn || asked.current.has(`${demo}:${auth?.userId}`))
      return;
    asked.current.add(`${demo}:${auth?.userId}`);
    refreshToken(demo);
  }, [demo, signedIn, auth?.userId, refreshToken]);

  // Every page view on a demo, from the first load.
  React.useEffect(() => {
    if (!demo) return;
    track(demo, {
      category: "session",
      actionType: "page_view",
      payload: { path: pathname },
    });
  }, [demo, pathname]);

  // One sign-in (or sign-up, after the hosted page) per Didit session.
  React.useEffect(() => {
    if (!demo || !auth?.sessionId) return;
    const seen = `didit-session-reported:${auth.sessionId}`;

    if (window.sessionStorage.getItem(seen)) return;
    window.sessionStorage.setItem(seen, "1");
    const signup = window.sessionStorage.getItem(SIGNUP_INTENT) === "1";

    window.sessionStorage.removeItem(SIGNUP_INTENT);
    track(demo, {
      category: "auth",
      actionType: signup ? "signup" : "login",
      payload: { method: auth.methods[0] ?? "unknown" },
    });
  }, [demo, auth?.sessionId]);

  const value = React.useMemo(
    () => ({ authEnabled, auth, device, track, refreshToken }),
    [authEnabled, auth, device, track, refreshToken],
  );

  return (
    <DiditContext.Provider value={value}>
      {authEnabled ? <AuthBridge onChange={setAuth} /> : null}
      {children}
    </DiditContext.Provider>
  );
}
