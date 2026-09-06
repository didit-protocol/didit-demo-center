"use client";

import * as React from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { Navbar } from "./Navbar";
import { cn } from "@website/lib/utils";

/**
 * StickyHeader — wraps the AnnouncementBar + Navbar in a `position: sticky`
 * container that toggles between fully transparent (when the page is at the
 * very top) and a frosted-canvas pane (once the user has scrolled even a
 * single pixel). Matches the OpenAI / Linear / Vercel pattern where the
 * header dissolves into the hero on first load and crystallises into solid
 * chrome the moment the page starts moving — so the hero gradient reads
 * uninterrupted on landing, and the navbar still stays legible on scroll.
 *
 * `prefers-reduced-motion` users always see the solid state.
 */
export function StickyHeader() {
  const [atTop, setAtTop] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAtTop(false);
      return;
    }

    let ticking = false;
    const update = () => {
      setAtTop(window.scrollY <= 4);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-didit-component="sticky-header"
      data-at-top={atTop ? "true" : "false"}
      className={cn(
        "sticky top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ease-out print:hidden",
        atTop
          ? "border-b border-transparent bg-transparent backdrop-blur-0"
          : // Apple global nav glass (apple.com): rgba(canvas, 0.8) +
            // backdrop-filter: saturate(180%) blur(20px).
            "border-b border-line/60 bg-canvas/75 backdrop-blur-[20px] backdrop-saturate-[1.8]"
      )}
    >
      <AnnouncementBar slotKey="slot1" />
      <Navbar />
    </header>
  );
}
