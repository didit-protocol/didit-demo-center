"use client";

import * as React from "react";

import { type LiveStore, createLiveStore } from "./live";

const stores = new Map<string, LiveStore>();
const EMPTY = { events: [] };

function storeFor(demo: string): LiveStore {
  let store = stores.get(demo);

  if (!store) {
    store = createLiveStore(
      demo,
      typeof window === "undefined" ? null : window.sessionStorage,
    );
    stores.set(demo, store);
  }

  return store;
}

/** The live layer for one demo: its events and `push` for new ones. */
export function useLive(demo: string) {
  const store = React.useMemo(
    () => (typeof window === "undefined" ? null : storeFor(demo)),
    [demo],
  );
  const state = React.useSyncExternalStore(
    store?.subscribe ?? (() => () => undefined),
    () => store?.get() ?? EMPTY,
    () => EMPTY,
  );

  return {
    events: state.events,
    push: store?.push ?? (() => undefined),
    clear: store?.clear ?? (() => undefined),
  };
}
