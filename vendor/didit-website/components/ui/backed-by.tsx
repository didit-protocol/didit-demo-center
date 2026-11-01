"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { cn } from "@website/lib/utils";

/**
 * Didit v5 BackedBy — small "Backed by" attribution row with investor logos.
 *
 * Use below the Hero CTAs or in the About page. Logos sit muted by default and
 * lift to full opacity on hover. Keep labels short ("Y Combinator", not "YC S24").
 *
 * The invisible SR label is "Backed by {list}" so screen readers get a full
 * sentence even when only logos render.
 */
export interface Investor {
  name: string;
  /** Logo image path. Omit to render the investor as a plain-text label
   *  instead of a logo. */
  logo?: string;
  /** Override logo height in px (default 20). */
  height?: number;
  /** Intrinsic aspect ratio (width / height) of the source image. Used to
   *  size the rendered <img> correctly (width = height × ratio, applied to
   *  both the attribute pair and the computed style). Default 4. The YC
   *  wordmark `yc_logo.svg` has a 2233×448 viewBox ≈ 4.98, so per-investor
   *  overrides matter — without them the browser reserves the wrong width. */
  aspectRatio?: number;
  /** Optional href — makes the logo a link. */
  href?: string;
  /** Force the logo to an exact solid colour (e.g. `"#ccff00"`). When set,
   *  the logo is rendered as a CSS mask filled with this colour instead of
   *  the raw image, so a monochrome source SVG takes the colour precisely.
   *  Overrides the `onDark` invert/hue-rotate filter for this logo. For a
   *  logo-less (text) investor, `tint` sets the wordmark text colour. */
  tint?: string;
  /** Set when the `logo` path already points at a dark-surface variant of the
   *  mark (e.g. the Robinhood neon lockup). Skips the `onDark`
   *  invert/hue-rotate filter, which would otherwise mangle a logo that is
   *  already the correct colour for an ink background. */
  darkReady?: boolean;
}

export interface BackedByProps extends React.HTMLAttributes<HTMLDivElement> {
  investors: Investor[];
  label?: React.ReactNode;
  /** Align the block left or center. Default: inherit (left). */
  align?: "start" | "center";
  /** Size preset. sm renders 16px logos, md 20, lg 28. */
  size?: "sm" | "md" | "lg";
  /** Use `"tight"` for tighter gap; default is spacious. */
  density?: "tight" | "spacious";
  /** Render on a dark (Ink) background — flips logo filter to white. */
  onDark?: boolean;
  /** Optional trailing text rendered after the logo row — e.g.
   *  "+ amazing VCs and angels" (matches the sales-deck footer pattern). */
  trailing?: React.ReactNode;
  /** When `true`, render every investor logo at full opacity by default
   *  (no muted-until-hover treatment). Use for hero placements where the
   *  brand mark should read at full strength. Default `false` keeps the
   *  OpenAI-style muted-by-default behaviour. */
  vivid?: boolean;
  /** Append the standing co-investor (Robinhood) after the logo row, rendered
   *  as the official Robinhood lockup — black on light surfaces, the neon
   *  lockup on ink surfaces. Default `true` so every Didit "Backed by" surface
   *  stays consistent; pass `false` to suppress (e.g. a YC-only badge). */
  showCoInvestor?: boolean;
  /** Optional href for the co-investor lockup — makes it a link. Used by the
   *  footer to point at the Robinhood Ventures fund listing. */
  coInvestorHref?: string;
}

const HEIGHT = { sm: 16, md: 22, lg: 28 };

const BackedBy = React.forwardRef<HTMLDivElement, BackedByProps>(
  (
    {
      className,
      investors,
      label,
      align = "start",
      size = "md",
      density = "spacious",
      onDark = false,
      trailing,
      vivid = false,
      showCoInvestor = true,
      coInvestorHref,
      ...props
    },
    ref
  ) => {
    const tI18n = useTranslations("translation_v1.ui.backedBy");
    const resolvedLabel = label ?? tI18n("label");
    const h = HEIGHT[size];
    // Robinhood rides along as the standing co-investor, rendered with the
    // official Robinhood lockup: the black lockup on the white canvas, the neon
    // lockup on the ink footer. Both are brand-approved surface variants, so
    // `darkReady` skips the invert/hue-rotate filter the YC mark needs on ink —
    // it would otherwise rotate the neon off-brand.
    // The accessible name stays "Robinhood Ventures" — that's the investing
    // entity, and the lockup itself only reads "Robinhood". Hardcoded on
    // purpose: it's a brand name, so it is NEVER translated or localized
    // (identical in every locale). i18n-check-hardcoded ignores this by design.
    const CO_INVESTOR_NAME = "Robinhood Ventures";
    // Optical, not pixel, matching. The Robinhood lockup packs more ink into
    // its box than the YC wordmark: rendered at the same height, the
    // "Robinhood" wordmark measures 281/400 of the box against "Combinator"'s
    // 230/400 — so a naive height match makes YC read ~22% small. Divide the
    // row's tallest logo height by that ratio and the two wordmarks land on the
    // same cap height. Call sites therefore pass YC at 27 and get Robinhood at
    // 22, which is where the lockup is drawn to sit.
    const CO_INVESTOR_OPTICAL_RATIO = 281 / 230;
    const coInvestorHeight = Math.round(
      Math.max(h, ...investors.map((i) => i.height ?? h)) / CO_INVESTOR_OPTICAL_RATIO
    );
    const allInvestors: Investor[] = showCoInvestor
      ? [
          ...investors,
          {
            name: CO_INVESTOR_NAME,
            logo: onDark
              ? "/logos/investors/robinhood_lockup_neon.png"
              : "/logos/investors/robinhood_lockup_black.png",
            // 627x120 source → 5.225.
            aspectRatio: 5.225,
            height: coInvestorHeight,
            darkReady: true,
            href: coInvestorHref
          }
        ]
      : investors;
    return (
      <div
        data-didit-component="backed-by"
        ref={ref}
        className={cn(
          "flex flex-wrap items-center",
          align === "center" ? "justify-center" : "justify-start",
          density === "tight" ? "gap-x-4 gap-y-2" : "gap-x-7 gap-y-3",
          className
        )}
        aria-label={`Backed by ${allInvestors.map((i) => i.name).join(", ")}`}
        {...props}
      >
        {resolvedLabel && (
          <span
            className={cn(
              "font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
              onDark ? "text-canvas/70" : "text-muted"
            )}
          >
            {resolvedLabel}
          </span>
        )}
        <div
          className={cn(
            // max-w-full + flex-wrap so the investor row can never overflow /
            // get clipped on very narrow phones — it wraps to a new line instead.
            "flex max-w-full flex-wrap items-center",
            align === "center" && "justify-center",
            density === "tight" ? "gap-x-4 gap-y-2" : "gap-x-6 gap-y-3"
          )}
        >
          {allInvestors.map((inv) => {
            const inner = !inv.logo ? (
              // Logo-less investor → plain-text wordmark (e.g. Robinhood
              // Ventures, whose brand logo we can't license). Inter + tight
              // tracking evokes the wordmark; when `tint` is set it recolours
              // the text (else it inherits the muted-until-hover ink/canvas
              // treatment of the logos beside it).
              <span
                style={inv.tint ? { color: inv.tint } : undefined}
                className={cn(
                  "text-[13px] font-semibold tracking-[-0.02em] transition-opacity duration-fast",
                  !inv.tint && (onDark ? "text-canvas/90" : "text-ink/85"),
                  vivid ? "opacity-100" : "opacity-70 hover:opacity-100"
                )}
              >
                {inv.name}
              </span>
            ) : inv.tint ? (
              // Tinted logo → render the SVG as a CSS mask filled with the
              // exact tint colour. This guarantees a precise brand colour
              // (e.g. #ccff00) that an invert/hue-rotate filter can't hit.
              <span
                role="img"
                aria-label={inv.name}
                className={cn(
                  "block transition-opacity duration-fast",
                  vivid ? "opacity-100" : "opacity-70 hover:opacity-100"
                )}
                style={{
                  height: inv.height ?? h,
                  width: Math.round((inv.height ?? h) * (inv.aspectRatio ?? 4)),
                  backgroundColor: inv.tint,
                  WebkitMaskImage: `url(${inv.logo})`,
                  maskImage: `url(${inv.logo})`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain"
                }}
              />
            ) : (
              /* Plain <img>, NOT next/image: investor logos are SVGs — the
                 optimizer only proxies them (dangerouslyAllowSVG), zero bytes
                 saved, one extra round-trip each. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={inv.logo}
                alt={inv.name}
                width={Math.round((inv.height ?? h) * (inv.aspectRatio ?? 4))}
                height={inv.height ?? h}
                loading="lazy"
                decoding="async"
                className={cn(
                  "w-auto transition-opacity duration-fast",
                  vivid ? "opacity-100" : "opacity-70 hover:opacity-100"
                )}
                style={{
                  height: inv.height ?? h,
                  // Pair the explicit height with width:auto so the intrinsic
                  // aspect ratio wins without layout shift; the width/height
                  // attributes carry the true ratio for the browser.
                  width: "auto",
                  // Dark-mode logo trick: invert(1) flips dark text to light
                  // AND turns orange to cyan; hue-rotate(180deg) rotates cyan
                  // back to orange. Net effect: dark "Combinator" text -> light,
                  // orange Y stays orange. Preserves true brand colour on the
                  // ink footer surface without the previous brightness hack.
                  // Skipped for `darkReady` logos, which already ship a
                  // dark-surface variant of the mark.
                  filter: onDark && !inv.darkReady ? "invert(1) hue-rotate(180deg)" : undefined
                }}
              />
            );
            return inv.href ? (
              <a
                key={inv.name}
                href={inv.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
                title={inv.name}
              >
                {inner}
              </a>
            ) : (
              <span key={inv.name} className="inline-flex items-center" title={inv.name}>
                {inner}
              </span>
            );
          })}
          {trailing && (
            <span
              className={cn(
                "text-[13px] font-medium tracking-[-0.005em]",
                onDark ? "text-canvas/70" : "text-muted"
              )}
            >
              {trailing}
            </span>
          )}
        </div>
      </div>
    );
  }
);
BackedBy.displayName = "BackedBy";

export { BackedBy };
