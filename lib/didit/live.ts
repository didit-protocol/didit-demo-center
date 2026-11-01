/**
 * The Didit live layer's data: the visitor's own events, newest first.
 *
 * Every entry is pushed by the code that just got an answer from Didit (an
 * Authentication session, the signals fingerprint, a verification decision, a
 * transaction result), with the SDK or API call that produced it. Nothing is
 * prefilled: an empty feed means the visitor has not done anything yet.
 *
 * Kept in sessionStorage per demo, so a reload or the hosted flow's redirect
 * does not lose it, and a new tab starts clean. Pure apart from storage, so
 * `npm test` covers it.
 */

import type { Product } from "./config.ts";

/** The colour an event takes: its product, or on hold and blocked. */
export type Tone = "auth" | "sig" | "ver" | "txn" | "hold" | "stop";

export const TONE_LABEL: Record<Tone, string> = {
  auth: "Authentication",
  sig: "Signals",
  ver: "Verification",
  txn: "Transactions",
  hold: "On hold",
  stop: "Blocked",
};

export const PRODUCT_TONE: Record<Product, Tone> = {
  authentication: "auth",
  signals: "sig",
  verification: "ver",
  transactions: "txn",
};

export interface LiveEvent {
  id: string;
  tone: Tone;
  /** The product that acted; on hold and blocked events still belong to one. */
  product: Product;
  title: string;
  detail: string;
  /** The SDK or API call behind it, as a developer would write it. */
  code?: string;
  at: number;
}

export type LiveInput = Omit<LiveEvent, "id" | "at"> & {
  /** Replaces an earlier event with the same key instead of adding one. */
  key?: string;
  at?: number;
};

export interface LiveState {
  events: LiveEvent[];
}

export const MAX_EVENTS = 40;

/** Adds an event on top; one with the same key replaces the earlier one. */
export function addEvent(
  state: LiveState,
  input: LiveInput,
  now: number,
): LiveState {
  const { key, at, ...rest } = input;
  const id = key ?? `${now.toString(36)}-${state.events.length}`;
  const event: LiveEvent = { ...rest, id, at: at ?? now };
  const others = state.events.filter((item) => item.id !== id);

  return { events: [event, ...others].slice(0, MAX_EVENTS) };
}

/** "now", "2 min", "1 h": how long ago, as the feed shows it. */
export function ago(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));

  if (seconds < 45) return "now";
  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  return `${Math.round(minutes / 60)} h`;
}

/** The newest event per product, for the four summary tiles. */
export function latestByProduct(
  events: LiveEvent[],
): Partial<Record<Product, LiveEvent>> {
  const latest: Partial<Record<Product, LiveEvent>> = {};

  for (const event of events) latest[event.product] ??= event;

  return latest;
}

export interface LiveStore {
  get(): LiveState;
  subscribe(listener: () => void): () => void;
  push(input: LiveInput): void;
  clear(): void;
}

/** A store for one demo, persisted under `didit-live:<demo>`. */
export function createLiveStore(
  demo: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
  clock: () => number = Date.now,
): LiveStore {
  const storageKey = `didit-live:${demo}`;
  const listeners = new Set<() => void>();
  let state: LiveState = { events: [] };

  try {
    const raw = storage?.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as LiveState) : null;

    if (parsed && Array.isArray(parsed.events)) state = parsed;
  } catch {
    // A corrupt entry starts the feed empty.
  }

  const emit = () => {
    try {
      storage?.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full or disabled: the feed still works for this page.
    }
    listeners.forEach((listener) => listener());
  };

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    push(input) {
      state = addEvent(state, input, clock());
      emit();
    },
    clear() {
      state = { events: [] };
      storage?.removeItem(storageKey);
      listeners.forEach((listener) => listener());
    },
  };
}
