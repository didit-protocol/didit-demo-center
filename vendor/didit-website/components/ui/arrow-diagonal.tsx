import * as React from "react";

/**
 * Didit DS diagonal arrow (↗) — the design-system outbound/external glyph for
 * CTAs. Replaces lucide ArrowUpRight inside Buttons. Stroke 1.5, round caps,
 * `currentColor` so it inherits the label color. No intrinsic size: buttons
 * size it via their `[&_svg]:size-*` rule; elsewhere pass a `size-*` class.
 */
export function ArrowDiagonal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <path
        d="M6.566 17.818 17.434 6.96M9.158 6.96h8.276v8.275"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
