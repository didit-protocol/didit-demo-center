"use client";

import type { Product } from "@/lib/didit/config";

import * as React from "react";
import { ArrowRight, Minus, SquareTerminal } from "lucide-react";

import { DiditRing, TONE_CLASS, ToneIcon } from "./icons";

import {
  type LiveEvent,
  PRODUCT_TONE,
  TONE_LABEL,
  ago,
} from "@/lib/didit/live";

export interface ProductTile {
  product: Product;
  label: string;
  value: string;
}

const SHOWN = 3;

function useNow(interval = 15_000) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);

    return () => window.clearInterval(timer);
  }, [interval]);

  return now;
}

/** Under 640 px the feed starts folded: open, it would cover the app. */
export const PHONE_QUERY = "(max-width: 639px)";

function useIsPhone() {
  const [phone, setPhone] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return phone;
}

/**
 * The Didit live feed: a hairline DS v4 card floating bottom right over the
 * customer app, newest event on top, each with its product glyph in a neutral
 * tile, a module dot before the product name and the call behind it. Closed,
 * and from the start on a phone until the visitor taps it, it folds into one
 * pill with the product dots.
 */
export function LiveFeed({
  events,
  person,
  tiles,
  integration,
  quiet = false,
  onConsole,
}: {
  events: LiveEvent[];
  person: string | null;
  /** The four product tiles, when the screen has room for them. */
  tiles?: ProductTile[];
  /** The few lines a developer writes for this demo, for "Code". */
  integration: string[];
  /** The app has a dialog open: fold into the pill and stay out of its way. */
  quiet?: boolean;
  onConsole(): void;
}) {
  const now = useNow();
  const phone = useIsPhone();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState<boolean | null>(null);
  const [code, setCode] = React.useState(false);
  const expanded = !(phone && quiet) && (open ?? !phone);
  const products = Array.from(new Set(events.map((event) => event.product)));
  const newest = events[0]?.id;

  // The feed is the visitor's own session and depends on the viewport: it
  // renders in the browser only, so a phone never flashes the desktop feed.
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (!expanded) {
    return (
      <div className="lv-pill" data-testid="didit-live-pill" role="group">
        <button
          aria-label={`Didit live, ${events.length} checks. Open the feed`}
          className="inline-flex items-center gap-2.5"
          type="button"
          onClick={() => setOpen(true)}
        >
          <DiditRing />
          Didit live
          <em>
            {events.length} {events.length === 1 ? "check" : "checks"}
          </em>
          <span aria-hidden className="lv-dots">
            {(
              [
                "authentication",
                "signals",
                "verification",
                "transactions",
              ] as const
            )
              .filter((product) => products.includes(product))
              .map((product) => (
                <i
                  key={product}
                  className={TONE_CLASS[PRODUCT_TONE[product]]}
                />
              ))}
          </span>
        </button>
        <button className="lv-go" type="button" onClick={onConsole}>
          Console <ArrowRight aria-hidden size={16} />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Didit live"
      className="lv dd"
      data-testid="didit-live"
    >
      <div className="lv-in">
        <div className="lv-head">
          <DiditRing />
          <b>Didit live</b>
          <span className="dd-status dd-status-approved dd-status-sm">
            Live
          </span>
          <span className="lv-who">{person ?? "No one signed in yet"}</span>
          <button
            aria-label="Fold the feed"
            className="lv-close dd-btn dd-btn-ghost dd-btn-xs dd-btn-icon"
            type="button"
            onClick={() => setOpen(false)}
          >
            <Minus aria-hidden size={14} />
          </button>
        </div>
        {tiles?.length ? (
          <div className="lv-prods">
            {tiles.map((tile) => (
              <div
                key={tile.product}
                className={`lv-prod ${TONE_CLASS[PRODUCT_TONE[tile.product]]}`}
              >
                <i className="lv-pi">
                  <ToneIcon size={14} tone={PRODUCT_TONE[tile.product]} />
                </i>
                <small>{tile.label}</small>
                <b>{tile.value}</b>
              </div>
            ))}
          </div>
        ) : null}
        {code ? (
          <div className="lv-code">
            <pre>
              {integration.map((line) => (
                <div key={line} className={line.startsWith("//") ? "c" : ""}>
                  {line}
                </div>
              ))}
            </pre>
          </div>
        ) : null}
        <ol aria-live="polite" className="lv-list m-0 list-none p-0">
          {events.length === 0 ? (
            <li className="lv-empty">
              Nothing yet. Every check Didit runs for you in this demo shows up
              here as it happens.
            </li>
          ) : null}
          {events.slice(0, code ? 1 : SHOWN).map((event) => (
            <li
              key={event.id}
              className={`lv-ev ${TONE_CLASS[event.tone]}${event.id === newest ? " is-new" : ""}`}
            >
              <span className="lv-ic dd-tile dd-tile-32">
                <ToneIcon tone={event.tone} />
              </span>
              <span className="lv-x">
                <small>{TONE_LABEL[event.tone]}</small>
                <b>{event.title}</b>
                <span>{event.detail}</span>
                {event.code && event.id === newest ? (
                  <code>{event.code}</code>
                ) : null}
              </span>
              <time
                className="lv-t"
                dateTime={new Date(event.at).toISOString()}
              >
                {ago(event.at, now)}
              </time>
            </li>
          ))}
        </ol>
        <div className="lv-foot">
          <button
            className="dd-btn dd-btn-primary dd-btn-sm"
            type="button"
            onClick={onConsole}
          >
            Open the console view
          </button>
          <button
            aria-pressed={code}
            className="dd-btn dd-btn-secondary dd-btn-sm"
            type="button"
            onClick={() => setCode((shown) => !shown)}
          >
            <SquareTerminal aria-hidden size={16} />
            Code
          </button>
        </div>
      </div>
    </section>
  );
}
