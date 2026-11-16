"use client";

import * as React from "react";
import { Link } from "@website/i18n/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@website/lib/utils";

/**
 * Didit v5 TopBar — slim announcement strip above the Navbar.
 * Used for funding announcements, product launches, compliance milestones.
 *
 * Three tones:
 *   canvas  → subtle soft-surface row, Blue accent chip + Ink text (default)
 *   blue    → Didit Blue fill, Canvas text · for celebratory moments (fundraise)
 *   ink     → Black fill, Canvas text · for serious / compliance news
 *
 * Pass `dismissable` to render an × close button that hides it for the session.
 * If `id` is set, dismissal persists in localStorage with a 24-hour TTL — the
 * bar reappears on the next visit after a full day has passed, so we can
 * keep the announcement fresh without re-nagging same-day visitors.
 */
export interface TopBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "id"> {
  /** Small chip to the left — e.g. "NEW", "$7.5M". */
  chip?: React.ReactNode;
  /** Main announcement copy. Keep under ~80 chars. */
  message: React.ReactNode;
  /** Inline call-to-action link. */
  cta?: { label: React.ReactNode; href: string; external?: boolean };
  /** Extra classes for the CTA link — e.g. a small `-translate-y` to optically
   *  align it with a message that carries a tall chip. */
  ctaClassName?: string;
  tone?: "canvas" | "blue" | "ink";
  dismissable?: boolean;
  /** Stable key — dismissal persists per id. */
  id?: string;
  align?: "center" | "start";
}

const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  (
    {
      className,
      chip,
      message,
      cta,
      ctaClassName,
      tone = "canvas",
      dismissable,
      id,
      align = "center",
      ...props
    },
    ref
  ) => {
    const tI18n = useTranslations("translation_v1.ui.topBar");
    const [dismissed, setDismissed] = React.useState(false);
    // True while the dismiss collapse animation is running — the bar's row
    // animates to zero height, smoothly pulling the page content up before
    // the element is removed for good.
    const [closing, setClosing] = React.useState(false);

    // 24-hour TTL for the dismissal. Stored as an absolute "expiresAt"
    // ms-epoch timestamp; the bar reappears the next time the user
    // lands on the site after this point passes.
    const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
    const storageKey = id ? `didit-topbar:${id}` : null;

    // Restore persisted dismissal on mount (if still within the 24h window).
    React.useEffect(() => {
      if (!storageKey || typeof window === "undefined") return;
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      // Back-compat: the previous version stored the literal string
      // "dismissed" (sticky forever). Treat any legacy value as
      // expired so existing users see the bar again on their next
      // visit instead of being locked out for life.
      const expiresAt = Number(raw);
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      setDismissed(true);
    }, [storageKey]);

    if (dismissed) return null;

    const onClose = () => {
      // Collapse the reserved row first (300ms grid-rows transition), then
      // unmount. The timeout fallback also covers prefers-reduced-motion,
      // where the transition is disabled and would never fire an end event.
      setClosing(true);
      window.setTimeout(() => setDismissed(true), 350);
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, String(Date.now() + DISMISS_TTL_MS));
      }
    };

    return (
      // Outer shell reserves the bar's row from first paint. On load the
      // coloured bar slides down into this already-reserved space
      // (animate-topbar-enter), so the navbar/hero never get pushed. On
      // dismiss the row itself collapses (1fr → 0fr) so the page content
      // glides up instead of jumping.
      <div
        aria-hidden={closing || undefined}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          closing ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            data-didit-component="top-bar"
            ref={ref}
            role="region"
            aria-label={tI18n("announcementAriaLabel")}
            className={cn(
              "relative w-full animate-topbar-enter motion-reduce:animate-none",
              tone === "canvas" && "border-b border-line bg-surface text-ink",
              tone === "blue" && "bg-blue text-canvas",
              tone === "ink" && "bg-ink text-canvas",
              className
            )}
            {...props}
          >
            <div
              className={cn(
                // Single-row layout on every viewport. `min-w-0` is required
                // so the truncating message span can actually shrink below
                // its intrinsic content width inside the flex row.
                "mx-auto flex min-h-10 min-w-0 max-w-screen-2xl flex-nowrap items-center gap-2 px-4 py-2 text-[12.5px] font-medium tracking-[-0.005em] sm:text-[13px] md:px-8",
                align === "center" ? "justify-center" : "justify-start",
                dismissable && "pr-12"
              )}
            >
              {chip && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
                    tone === "canvas" && "bg-blue text-canvas",
                    tone === "blue" && "bg-canvas/20 text-canvas",
                    tone === "ink" && "bg-blue text-canvas"
                  )}
                >
                  {chip}
                </span>
              )}
              {/* Message
              Mobile (< sm): `flex-1 truncate` lets the message fill
                the available width and clip to a single line with an
                ellipsis — the CTA's arrow next to it signals "tap to
                read more".
              sm+ : drop `flex-1` (so the message no longer monopolises
                the row) and undo `truncate` so the parent's
                `justify-center` actually centers the chip + message
                + CTA cluster — matches the original desktop look. */}
              <span className="min-w-0 flex-1 truncate sm:flex-none sm:overflow-visible sm:text-clip sm:whitespace-normal">
                {message}
              </span>
              {cta && (
                <Link
                  href={cta.href}
                  target={cta.external ? "_blank" : undefined}
                  rel={cta.external ? "noreferrer" : undefined}
                  aria-label={typeof cta.label === "string" ? cta.label : undefined}
                  className={cn(
                    // Keep mobile tap targets large without increasing the visual bar height.
                    "-my-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 whitespace-nowrap px-1 font-medium underline-offset-4 hover:underline sm:-my-1 sm:min-h-[28px] sm:min-w-0",
                    tone === "canvas" && "text-blue",
                    (tone === "blue" || tone === "ink") && "text-canvas",
                    ctaClassName
                  )}
                >
                  {/* Label hidden below sm — only the arrow is visible on
                  mobile, signaling "tap for more". From sm up, the
                  full CTA label reads. */}
                  <span className="hidden sm:inline">{cta.label}</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              )}
            </div>
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label={tI18n("dismissAnnouncementAriaLabel")}
                className={cn(
                  "absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded transition-colors sm:right-1 sm:size-9",
                  tone === "canvas" && "text-muted hover:bg-black/[0.04] hover:text-ink",
                  (tone === "blue" || tone === "ink") &&
                    "text-canvas/80 hover:bg-canvas/15 hover:text-canvas"
                )}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
TopBar.displayName = "TopBar";

export { TopBar };
