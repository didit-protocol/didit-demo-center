"use client";

/**
 * SHIM (demo-centre-owned, not synced - see scripts/website-chrome/manifest.mjs).
 *
 * On didit.me this module is the marketing-site spotlight search dialog. In the
 * demo centre the same navbar slot must search THE CATALOGUE, so the shim
 * renders the identical trigger (same classes as the website's trigger button)
 * and focuses the catalogue's own filter field instead:
 *
 * - if the catalogue search field is on the page, focus it - same muscle memory
 *   as the website's Cmd-K;
 * - otherwise go to `/`, where the catalogue lives.
 */

import * as React from "react";
import { Search } from "lucide-react";

/** The catalogue's filter input marks itself with this attribute. */
const FIELD = "input[data-demo-search]";

function focusCatalogueSearch(): boolean {
  const input = document.querySelector<HTMLInputElement>(FIELD);

  if (!input) return false;
  input.focus();
  input.select();

  return true;
}

export function SiteSearch() {
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
        return;
      event.preventDefault();
      if (!focusCatalogueSearch()) window.location.assign("/");
    };
    // The vendored navbar's MOBILE search icon dispatches this event instead of
    // rendering its own dialog (single-instance contract with the website's
    // SiteSearch) - here it drives the catalogue filter too.
    const onOpenEvent = () => {
      if (!focusCatalogueSearch()) window.location.assign("/");
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("didit:open-site-search", onOpenEvent);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("didit:open-site-search", onOpenEvent);
    };
  }, []);

  return (
    <button
      aria-label="Search demos"
      // Byte-for-byte the didit.me search trigger classes, so the navbar
      // renders pixel-identically on both sites.
      className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-ink transition-opacity duration-fast hover:bg-black/[0.04] focus-visible:shadow-ring focus-visible:outline-none"
      type="button"
      onClick={() => {
        if (!focusCatalogueSearch()) window.location.assign("/");
      }}
    >
      <Search aria-hidden className="size-[18px]" />
    </button>
  );
}
