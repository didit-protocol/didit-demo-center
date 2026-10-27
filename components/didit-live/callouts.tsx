"use client";

import type { Tone } from "@/lib/didit/live";

import * as React from "react";

import { TONE_CLASS, ToneIcon } from "./icons";

import { TONE_LABEL } from "@/lib/didit/live";

export interface CalloutSpec {
  id: string;
  /** The element Didit acted on: `[data-callout="<anchor>"]` inside the app. */
  anchor: string;
  tone: Tone;
  title: string;
  /** Where the card sits relative to the element. */
  side: "right" | "left" | "down";
  /** Length of the line between the dot and the card. */
  line?: number;
}

interface Placed {
  spec: CalloutSpec;
  style: React.CSSProperties;
}

function place(
  container: HTMLElement,
  spec: CalloutSpec,
): React.CSSProperties | null {
  const anchor = container.querySelector<HTMLElement>(
    `[data-callout="${spec.anchor}"]`,
  );

  if (!anchor) return null;
  const box = container.getBoundingClientRect();
  const rect = anchor.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) return null;
  const midY = rect.top - box.top + rect.height / 2;
  const reach = 9 + (spec.line ?? 40) + 16;
  // The card wraps rather than run off the screen.
  const room = (space: number) =>
    ({
      "--co-max": `${Math.max(160, space - reach)}px`,
    }) as React.CSSProperties;

  if (spec.side === "right")
    return {
      left: rect.right - box.left - 9,
      top: midY,
      ...room(box.right - rect.right),
    };
  if (spec.side === "left")
    return {
      right: box.right - rect.left - 9,
      top: midY,
      ...room(rect.left - box.left),
    };

  return { left: rect.left - box.left + 24, top: rect.bottom - box.top };
}

/**
 * Didit pinned to the moment: a pulsing dot on the element Didit acted on, a
 * line and a card in the product colour. They never take clicks, so they can
 * never cover the action the visitor needs; on a phone they are hidden.
 */
export function Callouts({
  container,
  callouts,
}: {
  container: React.RefObject<HTMLElement | null>;
  callouts: CalloutSpec[];
}) {
  const [placed, setPlaced] = React.useState<Placed[]>([]);

  React.useEffect(() => {
    const root = container.current;

    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setPlaced(
          callouts.flatMap((spec) => {
            const style = place(root, spec);

            return style ? [{ spec, style }] : [];
          }),
        );
      });
    };

    measure();
    // Modals animate in and content loads late: re-measure for a moment.
    const timer = window.setInterval(measure, 400);
    const stop = window.setTimeout(() => window.clearInterval(timer), 4000);

    window.addEventListener("resize", measure);
    root.addEventListener("scroll", measure, true);

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.clearTimeout(stop);
      window.removeEventListener("resize", measure);
      root.removeEventListener("scroll", measure, true);
    };
  }, [container, callouts]);

  return (
    <>
      {placed.map(({ spec, style }) => (
        <div
          key={spec.id}
          aria-hidden
          className={`co ${TONE_CLASS[spec.tone]}${spec.side === "left" ? " is-rev" : ""}${spec.side === "down" ? " is-down" : ""}`}
          data-testid={`callout-${spec.id}`}
          style={style}
        >
          <span className="co-dot" />
          <span
            className="co-line"
            style={
              spec.side === "down"
                ? { height: spec.line ?? 28 }
                : { width: spec.line ?? 40 }
            }
          />
          <span className="co-card">
            <span className="co-ic">
              <ToneIcon tone={spec.tone} />
            </span>
            <span>
              <small>{TONE_LABEL[spec.tone]}</small>
              <b>{spec.title}</b>
            </span>
          </span>
        </div>
      ))}
    </>
  );
}
