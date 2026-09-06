"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Link } from "@website/i18n/navigation";
import { useTranslations } from "next-intl";
import { Copy, Download, Check, ArrowUpRight } from "lucide-react";

import { cn } from "@website/lib/utils";

/**
 * LogoContextMenu — right-click the Didit wordmark to grab brand assets.
 *
 * A discoverability flourish in the spirit of orangecollective.vc / Vercel /
 * Linear: left-click on the header logo still navigates home (the wrapping
 * <Link> owns that), but a RIGHT-click opens a small floating menu so press,
 * partners, and designers can pull the logo + brand colour without hunting for
 * the /brand page. Every action here mirrors the canonical /brand assets:
 * `primary-horizontal-light.svg/.png`, `mark.svg`, and Didit Blue (#2567FF).
 *
 * Behaviour:
 *   • `onContextMenu` suppresses the native menu and opens ours at the cursor.
 *   • Rendered through a portal to <body> so it escapes the navbar's <Link>
 *     (no nested-anchor / accidental-navigation traps) and any backdrop-filter
 *     containing block.
 *   • Position is measured + clamped to the viewport so it never overflows; the
 *     zoom-in entrance grows from the cursor corner.
 *   • Dismisses on outside pointerdown, Escape, scroll, resize, blur, or after
 *     a copy action resolves. Under prefers-reduced-motion the global reset
 *     neutralises the entrance (atom needs no special-casing).
 */

// ── Brand assets — kept in lock-step with /brand (LOGO_ASSETS + Didit Blue) ──
const WORDMARK_SVG = "/logos/primary-horizontal-light.svg";
const WORDMARK_PNG = "/logos/primary-horizontal-light.png";
const WORDMARK_DISPLAY_PNG = "/logos/primary-horizontal-light-small.png";
const MARK_SVG = "/logos/mark.svg";
const BRAND_BLUE = "#2567FF";

const MENU_WIDTH = 264; // px — fixed so we can clamp before the first paint
const EDGE_GAP = 8; // viewport breathing room

type Anchor = { x: number; y: number };
type Placement = { left: number; top: number; origin: string };

export interface LogoContextMenuProps {
  /** Accessible alt text for the wordmark (passed from chrome so it stays
   *  in sync with the navbar's existing `image.alt.didit` string). */
  logoAlt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function LogoContextMenu({
  logoAlt,
  className = "h-7 w-auto",
  width = 88,
  height = 32
}: LogoContextMenuProps) {
  const t = useTranslations("translation_v1.ui.logoContextMenu");
  const [anchor, setAnchor] = React.useState<Anchor | null>(null);
  // Clamped position, set after the menu is measured. Kept in state (rather
  // than mutating `style` imperatively) so a re-render while open — e.g. the
  // "Copied" label flip — never resets the menu back to the unclamped anchor.
  const [pos, setPos] = React.useState<Placement | null>(null);
  const [copied, setCopied] = React.useState<"logo" | "color" | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const copyTimer = React.useRef<number | null>(null);

  React.useEffect(() => setMounted(true), []);

  const close = React.useCallback(() => {
    setAnchor(null);
    setPos(null);
    setCopied(null);
  }, []);

  const openAt = (e: React.MouseEvent) => {
    e.preventDefault();
    setCopied(null);
    setPos(null);
    setAnchor({ x: e.clientX, y: e.clientY });
  };

  // Once the menu has a measured size, clamp it inside the viewport and pick a
  // transform-origin so the zoom-in grows out of the cursor corner. Runs in a
  // layout effect → the clamped position commits before paint (no visible
  // jump); until then the menu stays `visibility:hidden`.
  React.useLayoutEffect(() => {
    if (!anchor || !menuRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = menuRef.current;
    const overflowRight = anchor.x + w > window.innerWidth - EDGE_GAP;
    const overflowBottom = anchor.y + h > window.innerHeight - EDGE_GAP;
    setPos({
      left: overflowRight ? Math.max(EDGE_GAP, anchor.x - w) : anchor.x,
      top: overflowBottom ? Math.max(EDGE_GAP, anchor.y - h) : anchor.y,
      origin: `${overflowRight ? "right" : "left"} ${overflowBottom ? "bottom" : "top"}`
    });
  }, [anchor]);

  // Global dismiss listeners — only while open.
  React.useEffect(() => {
    if (!anchor) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [anchor, close]);

  React.useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const flashCopied = (which: "logo" | "color") => {
    setCopied(which);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(close, 1100);
  };

  const copyLogoSvg = async () => {
    try {
      const res = await fetch(WORDMARK_SVG);
      const svg = await res.text();
      await navigator.clipboard.writeText(svg);
      flashCopied("logo");
    } catch {
      close();
    }
  };

  const copyColor = async () => {
    try {
      await navigator.clipboard.writeText(BRAND_BLUE);
      flashCopied("color");
    } catch {
      close();
    }
  };

  // Force a download regardless of how the browser would treat the asset's
  // content-type. Same-origin `<a download>` is unreliable here — the click
  // handler closes the menu, which unmounts the anchor before the browser
  // commits the navigation, so the file never lands. Fetching to a blob and
  // clicking a detached anchor sidesteps that race and lets us set a clean,
  // brand-named filename.
  const downloadAsset = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      // Swallow — a failed fetch shouldn't leave the menu stuck open.
    } finally {
      close();
    }
  };

  const itemCls =
    "flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left text-[13.5px] font-medium text-ink transition-colors duration-fast hover:bg-black/[0.06] focus-visible:bg-black/[0.06] focus-visible:outline-none";
  const iconCls = "size-4 shrink-0 text-muted";

  const menu =
    mounted && anchor
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("aria")}
            className={cn(
              "fixed z-[60] animate-zoom-in rounded-md border border-line bg-canvas p-1.5 text-ink shadow-lg",
              "[font-feature-settings:'cv11']"
            )}
            style={{
              left: pos ? pos.left : anchor.x,
              top: pos ? pos.top : anchor.y,
              width: MENU_WIDTH,
              transformOrigin: pos?.origin ?? "left top",
              // Hidden for the one pre-measure commit so it never flashes at the
              // raw (unclamped) anchor before the layout effect places it.
              visibility: pos ? "visible" : "hidden"
            }}
            // Keep right-clicks inside the menu from stacking a second native
            // menu on top of ours.
            onContextMenu={(e) => e.preventDefault()}
          >
            <button type="button" role="menuitem" className={itemCls} onClick={copyLogoSvg}>
              {copied === "logo" ? (
                <Check className="size-4 shrink-0 text-blue" />
              ) : (
                <Copy className={iconCls} />
              )}
              <span>{copied === "logo" ? t("copied") : t("copyLogo")}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className={itemCls}
              onClick={() => downloadAsset(WORDMARK_SVG, "didit-logo.svg")}
            >
              <Download className={iconCls} />
              <span>{t("downloadSvg")}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className={itemCls}
              onClick={() => downloadAsset(WORDMARK_PNG, "didit-logo.png")}
            >
              <Download className={iconCls} />
              <span>{t("downloadPng")}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className={itemCls}
              onClick={() => downloadAsset(MARK_SVG, "didit-symbol.svg")}
            >
              <Download className={iconCls} />
              <span>{t("downloadMark")}</span>
            </button>

            <div className="my-1.5 h-px bg-line" aria-hidden />

            <button type="button" role="menuitem" className={itemCls} onClick={copyColor}>
              {copied === "color" ? (
                <Check className="size-4 shrink-0 text-blue" />
              ) : (
                <span
                  aria-hidden
                  className="size-4 shrink-0 rounded-2xs border border-black/10"
                  style={{ backgroundColor: BRAND_BLUE }}
                />
              )}
              <span>{copied === "color" ? t("copied") : t("copyColor")}</span>
              <span className="ml-auto font-mono text-[11px] text-muted">{BRAND_BLUE}</span>
            </button>

            <div className="my-1.5 h-px bg-line" aria-hidden />

            <Link href="/brand" role="menuitem" className={cn(itemCls, "group")} onClick={close}>
              <ArrowUpRight className={iconCls} />
              <span>{t("guidelines")}</span>
            </Link>
          </div>,
          document.body
        )
      : null;

  return (
    <span data-didit-component="logo-context-menu" onContextMenu={openAt} className="inline-flex">
      {/* Plain <img>, NOT next/image: the SVG gains nothing from the optimizer
          (dangerouslyAllowSVG just proxies it) and the extra /_next/image hop
          delayed the LCP element on mobile PSI. The wordmark is the LCP on
          most routes, so it ships with high fetch priority and no lazy
          machinery. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WORDMARK_DISPLAY_PNG}
        alt={logoAlt}
        width={width}
        height={height}
        fetchPriority="high"
        decoding="async"
        className={className}
      />
      {menu}
    </span>
  );
}
