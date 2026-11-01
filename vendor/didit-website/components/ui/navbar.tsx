"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Link } from "@website/i18n/navigation";
import Image from "next/image";
import { Menu, X, ArrowUpRight, ChevronDown, ArrowRight, Search as SearchIcon } from "lucide-react";

import { cn } from "@website/lib/utils";
import { ArrowDiagonal } from "@website/components/ui/arrow-diagonal";
import { Button } from "@website/components/ui/button";
import { Container } from "@website/components/ui/container";
import { GradientCard, type GradientPalette } from "@website/components/ui/gradient-card";
import { ConsoleModuleIcon } from "@website/components/ui/console-module-icon";
import { NavTerminalCard, type NavTerminalLine } from "@website/components/ui/nav-terminal-card";
import { installNavbarMeasurement } from "@website/components/ui/navbar-measurement";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

/**
 * Didit v5 Navbar — OpenAI-inspired mega-menu with Didit Blue primary CTA.
 *
 * Pattern:
 *   • Pure Canvas background, NO bottom border.
 *   • Each NavItem may declare a `dropdown` of up-to-3 columns.
 *   • Desktop: hover a label to expand a full-width panel; backdrop-blur overlays the page.
 *   • Mobile: full-screen panel with big Inter 500 links (24px), separator, CTAs at bottom.
 *   • Primary CTA uses variant="accent" — Didit Blue (#2567FF), not black.
 */

/* ---------- Types ---------- */

export interface NavLink {
  label: string;
  href: string;
  /** Show the ↗ indicator on the right (external / cross-product links). */
  external?: boolean;
  /** Optional eyebrow / sub-line rendered under the primary-column links.
   *  Used on the Products mega-menu hero column to anchor each product
   *  line with its pricing / framing snippet. */
  description?: string;
  /** When true, render this link as a highlighted "blue pill" entry.
   *  Used for the Free KYC try-it call-out in Products. */
  accent?: boolean;
  /** Optional ConsoleModuleIcon registry key. When set, the link renders
   *  the per-module / per-industry glyph inline LEFT of the label,
   *  matching the icon family the navbar mega-menu cards + the
   *  /pricing module table + the SiteSearch overlay already share.
   *  Keys: see `src/components/ui/console-module-icon.tsx` registry
   *  (e.g. `idVerification`, `freeKyc`, `fintech`, `crypto`). */
  iconKey?: string;
}

export interface NavDropdownColumn {
  heading?: string;
  links: NavLink[];
  /**
   * Visual treatment for the link list.
   *  - "default" (omitted): text-[14.5px] font-medium ink — the
   *    standard column rendering used by Use cases / By module / etc.
   *  - "compact": text-[13px] font-normal — for category-style filters.
   *  - "prominent": font-display text-[18px] font-medium tracking
   *    -0.02em — used by the Solutions menu's By industry column so
   *    verticals read as featured categories that pop. Bumps the
   *    line-spacing on the column too.
   *  Only honored in the stacked-hero layout.
   */
  variant?: "default" | "compact" | "prominent";
}

/**
 * Compact gradient hero card — drops into the dropdown's "hero" slot instead
 * of `primary` text-links. Mirrors the home-hero GradientFeatureCard visual
 * grammar (gradient bg by palette, white floating tile + currentColor SVG
 * mask glyph, title + 1-line description) at a shorter card height so the
 * mega-menu still fits in one viewport.
 */
export interface NavCard {
  label: string;
  href: string;
  description: string;
  iconSrc: string;
  iconLabel: string;
  /**
   * Optional pricing-style icon key. When set, the card renders
   * `<ConsoleModuleIcon moduleKey={…} />` instead of the iconSrc mask —
   * gives the navbar the SAME visual language as `/pricing` (the
   * fe-application-console workflow-feature-icon registry).
   */
  moduleKey?: string;
  palette: GradientPalette;
  external?: boolean;
  /**
   * Render this card as a full-width hero card — vertical layout, bigger
   * icon + display headline + a `Read the …`-style CTA glyph at the
   * bottom. Used on the Developers menu's single Quickstart card so it
   * reads as the dropdown's anchor visual instead of a small tile in a
   * grid. When ANY card in the array has `large: true`, the parent grid
   * collapses to one column so the card spans the entire hero slot.
   */
  large?: boolean;
  /** Optional CTA copy rendered at the bottom of a large card — e.g.
   *  "Read the quickstart". Defaults to `label` when omitted. */
  cta?: string;
  /**
   * Optional background image for the card. When set, the card swaps
   * its gradient + icon treatment for a full-bleed image with a dark
   * gradient overlay so the title + description + CTA stay readable in
   * canvas-white. Used on the Resources menu's "Meet the founders" card.
   * Pair with `large: true` for the hero slot.
   */
  imageSrc?: string;
  imageAlt?: string;
  /**
   * Optional gradient-library image painted BEHIND the normal gradient-card
   * treatment (icon tile + title + description stay in place). Unlike
   * `imageSrc` — which swaps in the dark full-bleed founders variant — this
   * keeps the light card layout and lays a soft white veil over the image so
   * the ink text stays readable. Forwarded to `GradientCard`'s
   * `backgroundImage`; pass a gradient-library file path such as
   * `/media/gradient-library/nature-blurred-05.webp`.
   */
  backgroundImage?: string;
  /**
   * Optional animated-terminal background. When set, the card replaces
   * its gradient + icon treatment with an `<NavTerminalCard>` — a
   * looping ASCII terminal that types the lines in sequence.
   * Implies `large: true`. Used on the Developers menu's Quickstart
   * card. Mutually exclusive with `imageSrc`.
   */
  terminal?: NavTerminalLine[];
}

export interface NavDropdown {
  /**
   * Text-link hero column — big Inter 500 links (24-28px). Mutually
   * exclusive with `primaryCards`; pass one or the other at the call site.
   */
  primary?: NavLink[];
  /**
   * Gradient-card hero — 2x2 (or 2x3) grid of compact GradientCard tiles.
   * Used on Products and Solutions to mirror the home-hero
   * Authenticate / Verify / Monitor cards.
   */
  primaryCards?: NavCard[];
  /** Right companion columns — eyebrow + smaller list. */
  columns?: NavDropdownColumn[];
  /**
   * Stacked hero layout — gradient cards span full width on top, columns
   * sit below in their own grid. Used for the consolidated Solutions
   * everything-menu where 4 hero cards + 3 link columns wouldn't fit
   * the 12-col side-by-side grid. When set, `primaryCards` renders as
   * a 1xN row (or 2xN on narrower screens) and `columns` renders below
   * in a `grid-cols-{cols}` row.
   */
  stackedHero?: boolean;
  /**
   * "View all ... ->" link rendered as a right-aligned link at the bottom
   * of the dropdown panel. Used to point each menu at its hub page.
   */
  viewAll?: { label: string; href: string };
}

export interface NavItem {
  label: string;
  href?: string;
  /** Show ↗ on the mobile label (matches OpenAI's Foundation ↗). */
  external?: boolean;
  dropdown?: NavDropdown;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  brand?: React.ReactNode;
  brandHref?: string;
  items?: NavItem[];
  secondaryCta?: NavLink;
  primaryCta?: NavLink;
  sticky?: boolean;
  /** Extra slot rendered before the CTAs on desktop. */
  rightExtra?: React.ReactNode;
  /** Extra slot rendered after the last nav item on desktop — attached to the
   *  link group (e.g. the search trigger sitting next to Pricing). */
  navExtra?: React.ReactNode;
  /** Extra slot rendered at the bottom of the mobile menu drawer,
   *  below the CTAs. Intended for the LocaleSwitcher and similar
   *  utilities that don't fit the icon cluster on mobile. */
  mobileExtra?: React.ReactNode;
  /** Override the default Button size for desktop CTAs. Default "sm". */
  ctaSize?: "sm" | "default" | "lg";
}

/* ---------- Context ---------- */

const NavbarOpenCtx = React.createContext<boolean>(false);
export const useNavbarOpen = () => React.useContext(NavbarOpenCtx);

/* ---------- Desktop dropdown panel ---------- */

function DropdownPanel({ dropdown }: { dropdown: NavDropdown }) {
  const tI18n = useTranslations("translation_v1.ui.navbar");
  // Dynamic 12-column layout based on side-column count. 0-2 side columns
  // keep the wide hero (col-span-7 for cards, col-span-5 for text); 3+ side
  // columns shrink the hero so every side column still gets col-span-3.
  const cols = dropdown.columns?.length ?? 0;
  const hasCards = !!dropdown.primaryCards && dropdown.primaryCards.length > 0;
  // Gradient cards need more horizontal room than text links, so the hero
  // slot expands to col-span-7 when there's only one side column.
  const primaryColClass = hasCards
    ? cols >= 2
      ? "md:col-span-6"
      : "md:col-span-7"
    : cols >= 3
      ? "md:col-span-3"
      : "md:col-span-5";

  // Stacked-hero layout — used for the consolidated Solutions menu. Hero
  // gradient cards span the full panel width on top, then the link
  // columns sit below in their own grid. Only applies when both
  // `primaryCards` AND `stackedHero` are set; otherwise falls through
  // to the original side-by-side 12-col layout.
  if (dropdown.stackedHero && hasCards) {
    const colsCount = dropdown.columns?.length ?? 0;
    const colGridClass =
      colsCount === 4
        ? "md:grid-cols-4"
        : colsCount === 3
          ? "md:grid-cols-3"
          : colsCount === 2
            ? "md:grid-cols-2"
            : "md:grid-cols-1";
    return (
      <div data-didit-component="dropdown-panel" className="flex flex-col gap-8 px-8 pb-8 pt-10">
        {/* {tI18n("dropdownPanel.heroStrip.heading")} */}
        {/* Hero card strip — flat Apple-flyout-style tiles: Cloud Gray
            (`bg-surface`) on the white panel, no border, no gradient, no
            animation. The module icon carries the single Didit Blue accent;
            hover darkens the tile one token step (surface → line). Replaced
            the AmbientBlobField liquid-pool treatment 2026-07-23 — the
            animated blue blobs read as noise next to the link columns. */}
        <div
          className={cn(
            "grid gap-4",
            dropdown.primaryCards!.length === 4
              ? "grid-cols-1 sm:grid-cols-2 min-[1000px]:grid-cols-4"
              : dropdown.primaryCards!.length === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2"
          )}
        >
          {dropdown.primaryCards!.map((card, j) => {
            return (
              <Link
                key={`pc-${j}-${card.href}`}
                href={card.href}
                {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={card.label}
                className="group block rounded-lg focus-visible:shadow-ring focus-visible:outline-none"
              >
                <span className="flex h-full flex-col justify-start gap-2 rounded-lg bg-surface p-5 transition-colors duration-fast group-hover:bg-line">
                  {/* {tI18n("dropdownPanel.titleRow.description")} */}
                  {/* Icon above title so the title always fits on one line. */}
                  <span
                    aria-hidden
                    aria-label={card.iconLabel}
                    className="inline-flex w-fit shrink-0 items-center justify-center text-blue"
                  >
                    {card.moduleKey ? (
                      <ConsoleModuleIcon moduleKey={card.moduleKey} className="size-[22px]" />
                    ) : (
                      <span
                        role="img"
                        aria-label={card.iconLabel}
                        className="block size-[22px] bg-current"
                        style={{
                          WebkitMaskImage: `url(${card.iconSrc})`,
                          maskImage: `url(${card.iconSrc})`,
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                          WebkitMaskSize: "contain",
                          maskSize: "contain"
                        }}
                      />
                    )}
                  </span>
                  <span className="font-display text-[18px] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
                    {card.label}
                  </span>
                  <span className="text-[13px] leading-snug text-muted">{card.description}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* {tI18n("dropdownPanel.linkColumnsRow.heading")} */}
        {colsCount > 0 && (
          <div className={cn("grid grid-cols-2 gap-8", colGridClass)}>
            {dropdown.columns!.map((col, i) => (
              <ul
                key={`col-${i}`}
                className={cn(col.variant === "prominent" ? "space-y-4" : "space-y-3")}
              >
                {col.heading && (
                  <li className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                    {col.heading}
                  </li>
                )}
                {col.links.map((link, j) => {
                  // Accent links (See all / View all) ALWAYS render
                  // at the standard 14.5px font-medium blue, even in
                  // a "prominent" column — they're CTAs, not category
                  // titles. Keeps the see-all anchors consistent
                  // across columns and prevents the large display
                  // type from washing over the explore-more action.
                  const useProminent = col.variant === "prominent" && !link.accent;
                  const useCompact = col.variant === "compact" && !link.accent;
                  return (
                    <li key={`c-${i}-${j}-${link.href}`}>
                      <Link
                        href={link.href}
                        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={cn(
                          "group inline-flex gap-2.5 transition-opacity duration-fast hover:opacity-70",
                          useProminent ? "items-start" : "items-center",
                          link.accent ? "text-blue" : "text-ink"
                        )}
                      >
                        {link.iconKey && !link.accent && (
                          <ConsoleModuleIcon
                            moduleKey={link.iconKey}
                            className={cn(
                              "shrink-0 text-ink/85 transition-colors duration-fast group-hover:text-blue-deep",
                              useProminent ? "mt-0.5 size-[18px]" : "size-[16px]"
                            )}
                          />
                        )}
                        <span className={cn("flex flex-col", useProminent && "gap-1")}>
                          <span
                            className={cn(
                              useCompact
                                ? "text-[13px] font-normal"
                                : useProminent
                                  ? "font-display text-[18px] font-medium leading-tight tracking-[-0.02em]"
                                  : "text-[14.5px] font-medium"
                            )}
                          >
                            {link.label}
                          </span>
                          {useProminent && link.description && (
                            <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">
                              {link.description}
                            </span>
                          )}
                        </span>
                        {link.accent && !link.external && (
                          <ArrowRight className="size-3.5 opacity-90 transition-transform duration-fast group-hover:translate-x-0.5" />
                        )}
                        {link.external && (
                          <ArrowUpRight className="size-3.5 opacity-70 transition-transform duration-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        )}

        {dropdown.viewAll && (
          <div className="border-t border-line pt-4">
            <Link
              href={dropdown.viewAll.href}
              className="group inline-flex items-center gap-1 text-[13px] font-medium text-blue transition-opacity duration-fast hover:opacity-80"
            >
              {dropdown.viewAll.label}
              <ArrowRight className="size-3.5 transition-transform duration-fast group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-didit-component="dropdown-panel" className="grid grid-cols-12 gap-8 px-8 pb-8 pt-10">
      {hasCards ? (
        <div
          className={cn(
            "col-span-12 grid gap-4",
            // When any card is `large`, collapse to single column so the
            // card spans the full hero slot. Otherwise default 2x grid.
            dropdown.primaryCards!.some((c) => c.large)
              ? "grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2",
            primaryColClass
          )}
        >
          {dropdown.primaryCards!.map((card, j) => {
            const isLarge = !!card.large;
            const hasImage = !!card.imageSrc;
            const hasTerminal = !!card.terminal && card.terminal.length > 0;

            // Terminal variant — animated ASCII terminal background.
            // Used on the Developers > Quickstart card. Self-contained:
            // renders its own <Link> + chrome + animation loop.
            if (hasTerminal) {
              return (
                <NavTerminalCard
                  key={`pc-${j}-${card.href}`}
                  href={card.href}
                  external={card.external}
                  label={card.label}
                  description={card.description}
                  cta={card.cta}
                  lines={card.terminal!}
                />
              );
            }

            return (
              <Link
                key={`pc-${j}-${card.href}`}
                href={card.href}
                {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={card.label}
                className="group block rounded focus-visible:shadow-ring focus-visible:outline-none"
              >
                {hasImage ? (
                  // {tI18n("dropdownPanel.imageBackgroundVariant.description")}
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-[14px] transition-opacity duration-fast group-hover:opacity-95",
                      isLarge ? "h-[280px]" : "h-[140px]"
                    )}
                  >
                    <Image
                      src={card.imageSrc!}
                      alt={card.imageAlt ?? card.iconLabel}
                      fill
                      sizes={tI18n("image.sizes.minWidth1024px480px")}
                      className="object-cover object-center"
                      priority={false}
                    />
                    {/* Progressive blur — strongest at the bottom edge, fading
                        out upward via a mask so the photo stays crisp while the
                        text band gains readability. */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[60%] backdrop-blur-md [mask-image:linear-gradient(to_top,black_30%,transparent_100%)]"
                    />
                    {/* {tI18n("dropdownPanel.subtleDarkening.description")} */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-ink/95 via-ink/55 to-ink/0"
                    />
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 flex max-w-[78%] flex-col text-canvas [text-shadow:0_0_12px_rgba(0,0,0,0.28)]",
                        isLarge ? "gap-1 p-5" : "gap-0.5 p-4"
                      )}
                    >
                      <span
                        className={cn(
                          "font-display font-medium leading-[1.1] tracking-[-0.02em]",
                          isLarge ? "text-[20px]" : "text-[15px]"
                        )}
                      >
                        {card.label}
                      </span>
                      {card.description && (
                        <span
                          className={cn(
                            "leading-snug text-canvas/95",
                            isLarge ? "text-[12.5px]" : "text-[11px]"
                          )}
                        >
                          {card.description}
                        </span>
                      )}
                      {isLarge && (
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-canvas transition-transform duration-fast group-hover:translate-x-0.5">
                          {card.cta ?? card.label}
                          <ArrowUpRight className="size-3.5 opacity-90" />
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <GradientCard
                    palette={card.palette}
                    backgroundImage={card.backgroundImage}
                    aspect="auto"
                    radius="lg"
                    className={cn(
                      "transition-opacity duration-fast group-hover:opacity-90",
                      isLarge
                        ? "flex h-[280px] flex-col justify-between p-7"
                        : "flex h-[140px] items-center gap-4 px-5 py-4"
                    )}
                  >
                    {/* Extra white veil over a bespoke library image so the
                        ink title + description stay readable on a lighter,
                        softer background. Absolute → stays out of the flex
                        flow; the icon + text below paint on top of it. */}
                    {card.backgroundImage && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-canvas/45"
                      />
                    )}
                    <span
                      role="img"
                      aria-label={card.iconLabel}
                      className={cn(
                        "inline-flex shrink-0 items-center justify-center rounded-[14px] bg-canvas text-ink",
                        "shadow-[0_8px_20px_-8px_rgba(15,23,42,0.18),0_2px_4px_-1px_rgba(15,23,42,0.08)]",
                        isLarge ? "size-14" : "size-12"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("bg-current", isLarge ? "size-7" : "size-6")}
                        style={{
                          WebkitMaskImage: `url(${card.iconSrc})`,
                          maskImage: `url(${card.iconSrc})`,
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                          WebkitMaskSize: "contain",
                          maskSize: "contain"
                        }}
                      />
                    </span>
                    {isLarge ? (
                      <span className="flex flex-col">
                        <span className="font-display text-[30px] font-medium leading-[1.08] tracking-[-0.025em] text-ink">
                          {card.label}
                        </span>
                        <span className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-ink/75">
                          {card.description}
                        </span>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink transition-transform duration-fast group-hover:translate-x-0.5">
                          {card.cta ?? card.label}
                          <ArrowUpRight className="size-4 opacity-80" />
                        </span>
                      </span>
                    ) : (
                      <span className="flex min-w-0 flex-col">
                        <span className="font-display text-[18px] font-medium leading-tight tracking-[-0.02em] text-ink">
                          {card.label}
                        </span>
                        <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                          {card.description}
                        </span>
                      </span>
                    )}
                  </GradientCard>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <ul className={cn("col-span-12 space-y-5", primaryColClass)}>
          {(dropdown.primary ?? []).map((link, j) => {
            // {tI18n("dropdownPanel.accentVariant.description")}
            if (link.accent) {
              return (
                <li key={`p-${j}-${link.href}`}>
                  <Link
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group inline-flex items-center gap-2 rounded-pill border border-blue bg-blue-soft px-3 py-2 text-blue transition-opacity duration-fast hover:opacity-80"
                  >
                    <span className="font-display text-[20px] font-medium leading-[1.1] tracking-[-0.02em]">
                      {link.label}
                    </span>
                    {link.description && (
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                        {link.description}
                      </span>
                    )}
                    {link.external && (
                      <ArrowUpRight className="size-4 opacity-70 transition-transform duration-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    )}
                  </Link>
                </li>
              );
            }
            return (
              <li key={`p-${j}-${link.href}`}>
                <Link
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group inline-flex flex-col items-start gap-0 text-ink transition-opacity duration-fast hover:opacity-70"
                >
                  <span className="inline-flex items-center gap-1 font-display text-[26px] font-medium leading-[1.15] tracking-[-0.025em]">
                    {link.label}
                    {link.external && (
                      <ArrowUpRight className="size-5 opacity-70 transition-transform duration-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    )}
                  </span>
                  {link.description && (
                    <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                      {link.description}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {(dropdown.columns ?? []).map((col, i) => (
        <ul key={`col-${i}`} className="col-span-6 space-y-3 md:col-span-3">
          {col.heading && (
            <li className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              {col.heading}
            </li>
          )}
          {col.links.map((link, j) => (
            <li key={`c-${i}-${j}-${link.href}`}>
              <Link
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "group inline-flex items-center gap-1 text-[15px] font-medium transition-opacity duration-fast hover:opacity-70",
                  // {tI18n("dropdownPanel.accentSideColumn.description")}
                  link.accent ? "text-blue" : "text-ink"
                )}
              >
                {link.label}
                {link.accent && !link.external && (
                  <ArrowRight className="size-3.5 opacity-90 transition-transform duration-fast group-hover:translate-x-0.5" />
                )}
                {link.external && (
                  <ArrowUpRight className="size-3.5 opacity-70 transition-transform duration-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      ))}
      {dropdown.viewAll && (
        <div className="col-span-12 mt-2 border-t border-line pt-4">
          <Link
            href={dropdown.viewAll.href}
            className="group inline-flex items-center gap-1 text-[13px] font-medium text-blue transition-opacity duration-fast hover:opacity-80"
          >
            {dropdown.viewAll.label}
            <ArrowRight className="size-3.5 transition-transform duration-fast group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------- Default wordmark ---------- */

function DiditWordmark() {
  const tI18n = useTranslations("translation_v1.ui.navbar");
  // Source file is 491×170 (aspect ≈ 2.888). Render at h=24 → w≈69.
  //
  // Plain <img>, NOT next/image: routing an SVG through the optimizer only
  // proxies it via /_next/image (dangerouslyAllowSVG) — zero bytes saved, one
  // extra origin round-trip added, and on the home page the wordmark IS the
  // LCP element. Serving it directly with fetchpriority=high removes the
  // optimizer hop that Lighthouse measured as the LCP bottleneck.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-didit-component="didit-wordmark"
      src="/logos/primary-horizontal-light.svg"
      alt={tI18n("image.alt.didit")}
      width={72}
      height={25}
      fetchPriority="high"
      decoding="sync"
      className="h-5 w-auto md:h-6"
    />
  );
}

/* ---------- Navbar ---------- */

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  (
    {
      className,
      brand,
      brandHref = "/",
      items = [],
      secondaryCta,
      primaryCta,
      sticky = true,
      rightExtra,
      navExtra,
      mobileExtra,
      ctaSize = "default",
      ...props
    },
    ref
  ) => {
    const tI18n = useTranslations("translation_v1.ui.navbar");
    const pathname = usePathname();
    const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    // Mirrors the SiteSearch dialog's open state — kept in sync via
    // the `didit:site-search-state` window event SiteSearch emits.
    // Drives the mobile 🔍 ↔ ✕ icon swap in this navbar.
    const [searchOpen, setSearchOpen] = React.useState(false);
    // Tracked dynamically so the portal'd mobile menu can clear the
    // actual on-screen chrome (TopBar + Navbar + safe-area inset)
    // instead of guessing at a fixed offset.
    const [chromeOffset, setChromeOffset] = React.useState(0);
    const internalHeaderRef = React.useRef<HTMLElement | null>(null);
    const closeTimer = React.useRef<number | null>(null);

    const openDropdown = (i: number) => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setActiveIdx(i);
    };
    const scheduleClose = () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setActiveIdx(null), 120);
    };
    const closeNow = () => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setActiveIdx(null);
    };

    React.useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeNow();
          setMobileOpen(false);
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Close the mobile drawer and any open desktop dropdown whenever the
    // user navigates to a new page (pathname changes). Without this the
    // drawer stays open after clicking a link, making it look like the
    // navigation didn't happen.
    React.useEffect(() => {
      setMobileOpen(false);
      closeNow();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Lock background scroll while the mobile menu is open WITHOUT
    // making <body> a scroll container — setting `body.overflow:hidden`
    // detaches the sticky chrome from the viewport and slides it up the
    // page whenever the menu opens at any scrollY > 0. We tag body with
    // `data-menu-open` instead; globals.css has a `:has()` rule that
    // locks scroll on <html> while keeping body's natural overflow, so
    // the chrome's `position: sticky` keeps anchoring to the viewport.
    React.useEffect(() => {
      if (typeof document === "undefined") return;
      if (mobileOpen) {
        document.body.setAttribute("data-menu-open", "");
        return () => {
          document.body.removeAttribute("data-menu-open");
        };
      }
    }, [mobileOpen]);

    // Listen for SiteSearch open/close state so the mobile 🔍 button
    // can swap to an ✕ when the search dialog is up.
    React.useEffect(() => {
      if (typeof window === "undefined") return;
      const onState = (e: Event) => {
        const detail = (e as CustomEvent<{ open: boolean }>).detail;
        setSearchOpen(!!detail?.open);
      };
      window.addEventListener("didit:site-search-state", onState);
      return () => window.removeEventListener("didit:site-search-state", onState);
    }, []);

    // Measure the on-screen chrome offset (= top of viewport → bottom
    // of the outermost header) and expose it both via React state
    // (for the portal'd mobile menu's paddingTop) AND as a CSS custom
    // property `--site-header-bottom` on the document root — so any
    // other overlay (e.g. SiteSearch) can offset its content below
    // the visible chrome without duplicating the measure logic.
    //
    // Runs continuously rather than only-while-open so the CSS
    // variable is always up to date for consumers that mount before
    // the mobile menu does.
    //
    // Perf: reads are coalesced to one per frame via requestAnimationFrame,
    // and a ResizeObserver on the outer header catches every real geometry
    // change (announcement bar swap, menu open/close, viewport resize). The
    // scroll listener is kept only as a safety net for the un-stuck → stuck
    // transition and is rAF-throttled — an unbatched getBoundingClientRect()
    // per scroll event was measured as 163 ms of forced reflow on mobile.
    React.useEffect(() => {
      if (typeof window === "undefined") return;
      const nav = internalHeaderRef.current;
      if (!nav) return;
      return installNavbarMeasurement(nav, setChromeOffset);
    }, []);

    const isOpen = activeIdx !== null;
    const activeItem = activeIdx !== null ? items[activeIdx] : null;
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    // Surface ownership: the chrome <StickyHeader> wrapper owns the
    // scroll-aware frosted-glass surface (Apple-style — transparent over
    // the hero at the top, then bg-canvas/60 + saturate(180%) blur(20px)
    // once scrolled). The navbar bar itself therefore stays transparent
    // so that glass shows through; if it painted its own bg-canvas on
    // scroll it would cover the parent glass and kill the transparency.
    // It only paints an opaque bg-canvas base when a menu is actually
    // open, so the desktop mega-menu / mobile panel (each bg-canvas)
    // connect seamlessly to the bar above them.
    const menuOpen = isOpen || mobileOpen;

    // Backdrop must render in a portal at <body> level. The StickyHeader
    // ancestor has `transition-[backdrop-filter]` (Chrome treats animatable
    // backdrop-filter as a containing block), so a `position: fixed`
    // descendant inside StickyHeader is positioned relative to StickyHeader
    // (~104px tall), not the viewport — the visual blur only covered the
    // header strip, not the rest of the page. Portaling to <body> escapes
    // that containing block and lets `inset-0` cover the full viewport.
    //
    // Tuning (after Alberto: "less opacity / blurriness"):
    //   bg-ink/15 → bg-ink/8       — softer dim, page still feels present
    //   blur(64px)→ blur(28px)     — recognisable blur, no longer a wall
    //   saturate(140%) → 115%      — subtle saturation lift instead of pop
    const backdrop = mounted
      ? createPortal(
          <div
            aria-hidden
            onClick={closeNow}
            style={{
              backdropFilter: "blur(28px) saturate(115%)",
              WebkitBackdropFilter: "blur(28px) saturate(115%)"
            }}
            className={cn(
              "bg-ink/8 pointer-events-none fixed inset-0 z-30 hidden transition-opacity duration-200 min-[1000px]:block",
              isOpen ? "pointer-events-auto opacity-100" : "opacity-0"
            )}
          />,
          document.body
        )
      : null;

    return (
      <NavbarOpenCtx.Provider data-didit-component="navbar" value={isOpen}>
        {backdrop}

        <header
          ref={(el) => {
            internalHeaderRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
          }}
          onMouseLeave={scheduleClose}
          className={cn(
            "relative z-40 w-full transition-colors duration-200",
            menuOpen ? "bg-canvas" : "bg-transparent",
            sticky && "sticky top-0",
            className
          )}
          // iPhone safe-area-top inset — handled via inline style so
          // Tailwind's JIT parser doesn't choke on the comma fallback
          // inside `env()`. On viewports with no inset, env() resolves
          // to 0 (no-op).
          style={{ paddingTop: "env(safe-area-inset-top)" }}
          {...props}
        >
          <Container size="xl" className="flex h-14 items-center gap-4 md:h-16 md:gap-8">
            {/* Brand + nav cluster (left-aligned) */}
            <div className="flex items-center gap-2 md:gap-6">
              <Link
                href={brandHref}
                className="flex items-center gap-2 font-medium tracking-[-0.02em] text-ink"
                onMouseEnter={scheduleClose}
                onClick={() => setMobileOpen(false)}
              >
                {brand ?? <DiditWordmark />}
              </Link>

              {/* Desktop nav */}
              <nav className="hidden items-center gap-1 min-[1000px]:flex">
                {items.map((item, i) => {
                  const hasDropdown = !!item.dropdown;
                  const active = activeIdx === i;
                  const commonCls =
                    "inline-flex items-center gap-1 rounded-pill px-3 py-2 text-[14px] font-medium tracking-[-0.005em] text-ink transition-opacity duration-fast hover:opacity-70";
                  return (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => (hasDropdown ? openDropdown(i) : scheduleClose())}
                    >
                      {hasDropdown ? (
                        <button
                          type="button"
                          aria-expanded={active}
                          aria-haspopup="menu"
                          onClick={() => (active ? closeNow() : openDropdown(i))}
                          className={cn(commonCls, active && "text-ink")}
                        >
                          {item.label}
                          <ChevronDown
                            className={cn(
                              "size-3.5 opacity-70 transition-transform duration-fast",
                              active && "rotate-180"
                            )}
                          />
                        </button>
                      ) : (
                        <Link href={item.href ?? "#"} className={commonCls}>
                          {item.label}
                          {item.external && <ArrowUpRight className="size-3.5 opacity-70" />}
                        </Link>
                      )}
                    </div>
                  );
                })}
                {navExtra}
              </nav>
            </div>

            {/* Desktop CTAs */}
            <div
              className="ml-auto hidden items-center gap-2 min-[1000px]:flex"
              onMouseEnter={scheduleClose}
            >
              {rightExtra}
              {secondaryCta && (
                <Button asChild variant="ghost" size={ctaSize}>
                  <Link
                    href={secondaryCta.href}
                    {...(secondaryCta.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {secondaryCta.label}
                    {secondaryCta.external && <ArrowDiagonal />}
                  </Link>
                </Button>
              )}
              {primaryCta && (
                <Button asChild variant="accent" size={ctaSize}>
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    {primaryCta.external && <ArrowDiagonal />}
                  </Link>
                </Button>
              )}
            </div>

            {/* Mobile right cluster — Search icon + hamburger.
                Matches the OpenAI mobile header pattern (logo · 🔍 · ☰).
                The search button dispatches the global
                `didit:open-site-search` custom event picked up by
                the SiteSearch component (which renders a full-screen
                overlay) — keeps a single dialog instance instead of
                mounting two. Tap targets are 44 × 44 px per Apple HIG. */}
            <div className="ml-auto flex items-center gap-1 min-[1000px]:hidden">
              <button
                type="button"
                onClick={() => {
                  if (typeof window === "undefined") return;
                  if (searchOpen) {
                    window.dispatchEvent(new Event("didit:close-site-search"));
                  } else {
                    window.dispatchEvent(new Event("didit:open-site-search"));
                    setMobileOpen(false);
                  }
                }}
                aria-label={searchOpen ? tI18n("closeSearch") : tI18n("searchDidit")}
                aria-expanded={searchOpen}
                className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/[0.04] focus-visible:shadow-ring focus-visible:outline-none"
              >
                {searchOpen ? (
                  <X className="size-6" aria-hidden />
                ) : (
                  <SearchIcon className="size-5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? tI18n("closeMenu") : tI18n("openMenu")}
                aria-expanded={mobileOpen}
                className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/[0.04] focus-visible:shadow-ring focus-visible:outline-none"
              >
                {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>
          </Container>

          {/* Desktop dropdown panel */}
          <div
            onMouseEnter={() => activeIdx !== null && openDropdown(activeIdx)}
            onMouseLeave={scheduleClose}
            className={cn(
              // `max-h` is required for the slide-down animation to
              // interpolate, but the previous 640 px cap clipped the
              // bottom of the Solutions panel at narrow desktop widths
              // (~1000–1280 px) where the 3 link columns wrap taller.
              // Cap at the visible viewport minus chrome instead, and
              // let the inner panel scroll if the column content is
              // still taller than that.
              "absolute inset-x-0 top-full hidden overflow-y-auto bg-canvas transition-[max-height,opacity] duration-200 ease-out min-[1000px]:block",
              isOpen
                ? "max-h-[calc(100vh-var(--site-header-bottom,96px))] opacity-100"
                : "max-h-0 opacity-0"
            )}
          >
            <Container size="xl">
              {activeItem?.dropdown && <DropdownPanel dropdown={activeItem.dropdown} />}
            </Container>
          </div>

          {/* Mobile full-screen panel — OpenAI style. RENDERED VIA
              PORTAL into `document.body` so it escapes the chrome
              `<StickyHeader>` wrapper, which sets `backdrop-filter`
              (creating a new containing block that would otherwise
              trap `position: fixed` to the header's box, ~360×96 px,
              instead of the full viewport). Top padding clears the
              header row + the iPhone notch; bottom padding clears the
              home indicator. z-30 < the header's z-40 so the X /
              search / hamburger stay visible above the panel. */}
          {mobileOpen &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-canvas min-[1000px]:hidden"
                style={{
                  // `chromeOffset` is measured live in a useEffect so the
                  // menu content always starts at the exact bottom edge
                  // of the on-screen chrome (announcement bar + navbar)
                  // regardless of how tall it is. Falls back to a
                  // sensible 56px before the first measurement lands.
                  paddingTop: `${chromeOffset || 56}px`,
                  paddingBottom: "max(env(safe-area-inset-bottom), 1rem)"
                }}
              >
                <nav className="flex flex-1 flex-col px-6 pb-4 pt-8">
                  <ul className="space-y-5">
                    {items.map((item) => (
                      <li key={item.label}>
                        {item.dropdown ? (
                          <MobileDropdownItem item={item} onNavigate={() => setMobileOpen(false)} />
                        ) : (
                          <Link
                            href={item.href ?? "#"}
                            onClick={() => setMobileOpen(false)}
                            className="inline-flex items-center gap-1 font-display text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-ink"
                          >
                            {item.label}
                            {item.external && <ArrowUpRight className="size-6 opacity-80" />}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>

                  {(secondaryCta || primaryCta) && (
                    <>
                      <div className="my-8 h-px w-full bg-line" />
                      <ul className="space-y-5">
                        {primaryCta && (
                          <li>
                            <Link
                              href={primaryCta.href}
                              onClick={() => setMobileOpen(false)}
                              className="inline-flex items-center gap-1 font-display text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-blue"
                            >
                              {primaryCta.label}
                              <ArrowUpRight className="size-6" />
                            </Link>
                          </li>
                        )}
                        {secondaryCta && (
                          <li>
                            <Link
                              href={secondaryCta.href}
                              onClick={() => setMobileOpen(false)}
                              className="inline-flex items-center font-display text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-muted"
                            >
                              {secondaryCta.label}
                            </Link>
                          </li>
                        )}
                      </ul>
                    </>
                  )}

                  {/* Mobile-only extras (LocaleSwitcher etc.) — pinned to
                    the bottom of the drawer so the language picker lives
                    where a phone user expects it (under the CTAs, not
                    inside the icon cluster up top). */}
                  {mobileExtra && <div className="mt-auto pt-8">{mobileExtra}</div>}
                </nav>
              </div>,
              document.body
            )}
        </header>
      </NavbarOpenCtx.Provider>
    );
  }
);
Navbar.displayName = "Navbar";

/* ---------- Mobile nested dropdown (accordion) ---------- */

function MobileDropdownItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div data-didit-component="mobile-dropdown-item">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 font-display text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-ink"
      >
        <span>{item.label}</span>
        <ChevronDown
          className={cn(
            "size-6 shrink-0 opacity-70 transition-transform duration-fast",
            open && "rotate-180"
          )}
        />
      </button>
      {open && item.dropdown && (
        <ul className="mt-4 space-y-4 pl-1">
          {/* Hero row — either gradient cards (collapse to plain links on
              mobile so the menu stays scannable) or normal text links. */}
          {(item.dropdown.primaryCards ?? []).map((card) => (
            <li key={`mc-${card.href}`}>
              <Link
                href={card.href}
                onClick={onNavigate}
                className="inline-flex flex-col items-start gap-0 text-ink"
              >
                <span className="text-[20px] font-medium tracking-[-0.02em]">{card.label}</span>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  {card.description}
                </span>
              </Link>
            </li>
          ))}
          {(item.dropdown.primary ?? []).map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className="inline-flex items-center gap-1 text-[20px] font-medium tracking-[-0.02em] text-ink"
              >
                {l.label}
                {l.external && <ArrowUpRight className="size-4 opacity-70" />}
              </Link>
            </li>
          ))}
          {(item.dropdown.columns ?? []).map((col, i) => (
            <li key={i} className="pt-2">
              {col.heading && (
                <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                  {col.heading}
                </div>
              )}
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={onNavigate}
                      className="inline-flex items-center gap-1 text-[16px] font-medium text-ink/85"
                    >
                      {l.label}
                      {l.external && <ArrowUpRight className="size-3.5 opacity-70" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {item.dropdown.viewAll && (
            <li className="pt-2">
              <Link
                href={item.dropdown.viewAll.href}
                onClick={onNavigate}
                className="inline-flex items-center gap-1 text-[15px] font-medium text-blue"
              >
                {item.dropdown.viewAll.label}
                <ArrowRight className="size-3.5" />
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export { Navbar };
