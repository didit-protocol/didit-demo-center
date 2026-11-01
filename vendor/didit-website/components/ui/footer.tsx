import * as React from "react";
import { Link } from "@website/i18n/navigation";
import { ArrowUpRight, ArrowRight } from "lucide-react";

import { cn } from "@website/lib/utils";
import { Container } from "@website/components/ui/container";
import { ConsoleModuleIcon } from "@website/components/ui/console-module-icon";
import { useTranslations } from "next-intl";

/**
 * Didit v5 Footer — inspired by OpenAI's /business page footer.
 * Ink surface (the one permitted dark moment in marketing), multi-column link
 * grid, mono brand mark + caption at the bottom. Pass `tone="canvas"` if you
 * prefer a white footer for lighter pages.
 */
export interface FooterColumn {
  heading: string;
  links: {
    label: string;
    href: string;
    external?: boolean;
    iconKey?: string;
    /**
     * Render as a featured "see-all" / catalogue CTA — accented colour +
     * trailing arrow + bold weight so the row stands apart from the
     * regular link list.
     */
    accent?: boolean;
  }[];
  /**
   * Flow the link list into a 2-column CSS multi-column layout. The
   * column slot in the parent grid is also widened so the 2 sub-columns
   * sit comfortably side-by-side. Use on dense columns (≥10 items) to
   * shorten the overall footer height. Mutually exclusive with link
   * icons — icons need full-width rows to stay readable.
   */
  multiColumn?: boolean;
  /**
   * Per-column override for the leading link-icon styling (size + color).
   * Falls back to the default `size-4` + tone-derived color when unset.
   * Used by the Products column to render larger, fixed-grey glyphs.
   */
  iconClassName?: string;
}

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Tier 1 — primary row that sits next to the brand block. Use for
   * the buyer's top-of-mind catalogue columns (Solutions, Products).
   */
  columns?: FooterColumn[];
  /**
   * Tier 2 — secondary row, rendered below tier 1 across the full
   * width (no brand block offset), separated by a hairline divider.
   * Used for the next-tier columns (Industries, Developers).
   */
  secondaryColumns?: FooterColumn[];
  /**
   * Tier 3 — compact row at the bottom of the link area for the
   * lightest-weight groups (Pricing & Compare, Company).
   */
  tertiaryColumns?: FooterColumn[];
  /** Legal line at the very bottom (© …). */
  legal?: React.ReactNode;
  /** Brand mark / logo block for the top-left. */
  brand?: React.ReactNode;
  /** Short blurb below the brand. */
  blurb?: React.ReactNode;
  tone?: "ink" | "canvas";
  /** Social icons / small row, right side next to legal. */
  aside?: React.ReactNode;
}

function FooterColumnView({ col, isDark }: { col: FooterColumn; isDark: boolean }) {
  const tI18n = useTranslations("translation_v1.ui.footer");
  return (
    <div className={col.multiColumn ? "min-w-0" : undefined}>
      <div
        className={cn(
          "mb-4 font-mono text-[11px] font-medium uppercase tracking-wide",
          isDark ? "text-canvas/50" : "text-muted"
        )}
      >
        {col.heading}
      </div>
      <ul
        className={cn(
          // Below md: always stack one-per-line for readability on
          // narrow viewports. The CSS multi-column flow ONLY applies
          // at md+, where columns are wide enough that 2 sub-columns
          // stay scannable.
          "flex flex-col gap-2",
          col.multiColumn &&
            "md:block md:columns-2 md:gap-x-8 md:space-y-2.5 md:[&>li]:break-inside-avoid"
        )}
      >
        {col.links.map((l, i) => (
          <li key={`${col.heading}:${i}:${l.href}`}>
            <Link
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              className={cn(
                "group inline-flex items-center gap-2 text-sm transition-colors duration-fast",
                l.accent
                  ? cn(
                      "font-medium",
                      isDark ? "text-blue-400 hover:text-blue-300" : "text-blue hover:text-blue/85"
                    )
                  : isDark
                    ? "text-canvas/85 hover:text-canvas"
                    : "text-ink/85 hover:text-ink"
              )}
            >
              {l.iconKey && (
                <ConsoleModuleIcon
                  moduleKey={l.iconKey}
                  className={cn(
                    "size-4 shrink-0 transition-colors duration-fast",
                    l.accent
                      ? isDark
                        ? "text-blue-400 group-hover:text-blue-300"
                        : "text-blue group-hover:text-blue/85"
                      : isDark
                        ? "text-canvas/55 group-hover:text-canvas/85"
                        : "text-muted group-hover:text-ink",
                    // Column-level override (size + color) wins over the
                    // tone defaults — e.g. Products renders 1.3rem grey.
                    !l.accent && col.iconClassName
                  )}
                />
              )}
              <span>{l.label}</span>
              {l.accent && (
                <ArrowRight
                  aria-hidden
                  className="size-3.5 shrink-0 transition-transform duration-fast group-hover:translate-x-0.5"
                />
              )}
              {l.external && (
                <ArrowUpRight
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
                    isDark ? "text-canvas/55" : "text-ink/55"
                  )}
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  (
    {
      className,
      columns = [],
      secondaryColumns = [],
      tertiaryColumns = [],
      legal,
      brand,
      blurb,
      aside,
      tone = "ink",
      ...props
    },
    ref
  ) => {
    const tI18n = useTranslations("translation_v1.ui.footer");
    const isDark = tone === "ink";
    // Build a grid-template-columns string. Width rules:
    //   - multiColumn AND icons  → 2.6fr (2 sub-cols of icon + label)
    //   - multiColumn slot       → 2fr   (2 sub-cols of plain labels)
    //   - column with link icons → 1.5fr (icon + label, single col)
    //   - default                → 1fr
    // Brand block is intentionally narrower at 1.2fr.
    const slotWidth = (c: FooterColumn) => {
      const hasIcons = c.links.some((l) => l.iconKey);
      if (c.multiColumn && hasIcons) return "2.6fr";
      if (c.multiColumn) return "2fr";
      if (hasIcons) return "1.5fr";
      return "1fr";
    };
    const primaryTemplate = `1.2fr ${columns.map(slotWidth).join(" ")}`;
    const secondaryTemplate = secondaryColumns.map(slotWidth).join(" ");
    const tertiaryTemplate = tertiaryColumns.map(slotWidth).join(" ");
    return (
      <footer
        data-didit-component="footer"
        ref={ref}
        className={cn(
          "w-full border-t",
          isDark ? "border-canvas/10 bg-black text-canvas" : "border-line bg-canvas text-ink",
          className
        )}
        {...props}
      >
        <Container size="xl" className="py-16 md:py-20">
          <div
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 md:[grid-template-columns:var(--gtc)]"
            style={{ "--gtc": primaryTemplate } as React.CSSProperties}
          >
            {/* Brand block — full-width on mobile (single-col grid),
                spans both cells of the sm 2-col grid, then a normal
                slot in the md+ custom template.
                NOTE: no base `col-span-2` — on the mobile grid-cols-1 grid it
                would force an implicit 2nd column track, cramming the link
                columns into ~48px and wrapping labels one word per line. */}
            <div className="max-w-sm sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 text-base font-medium tracking-[-0.015em]">
                {brand ?? (
                  // Plain <img> — an SVG wordmark gains nothing from the
                  // optimizer proxy and it keeps `/_next/image?url=%2Flogos`
                  // out of the initial HTML (perf lane F-B smoke).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      isDark
                        ? "/logos/primary-horizontal-dark.svg"
                        : "/logos/primary-horizontal-light.svg"
                    }
                    alt="Didit"
                    width={96}
                    height={33}
                    loading="lazy"
                    decoding="async"
                    className="h-7 w-auto"
                  />
                )}
              </div>
              {blurb && (
                <div
                  className={cn(
                    "mt-4 text-sm leading-relaxed",
                    isDark ? "text-canvas/60" : "text-muted"
                  )}
                >
                  {blurb}
                </div>
              )}
            </div>

            {/* Link columns */}
            {columns.map((col) => (
              <FooterColumnView key={col.heading} col={col} isDark={isDark} />
            ))}
          </div>

          {secondaryColumns.length > 0 && (
            <div
              className={cn(
                "mt-12 grid grid-cols-1 gap-8 border-t pt-10 sm:grid-cols-2 sm:gap-10 md:mt-14 md:gap-x-12 md:pt-12 md:[grid-template-columns:var(--gtc)]",
                isDark ? "border-canvas/10" : "border-line"
              )}
              style={{ "--gtc": secondaryTemplate } as React.CSSProperties}
            >
              {secondaryColumns.map((col) => (
                <FooterColumnView key={col.heading} col={col} isDark={isDark} />
              ))}
            </div>
          )}

          {tertiaryColumns.length > 0 && (
            <div
              className={cn(
                "mt-12 grid grid-cols-1 gap-8 border-t pt-10 sm:grid-cols-2 sm:gap-10 md:mt-14 md:gap-x-12 md:pt-12 md:[grid-template-columns:var(--gtc)]",
                isDark ? "border-canvas/10" : "border-line"
              )}
              style={{ "--gtc": tertiaryTemplate } as React.CSSProperties}
            >
              {tertiaryColumns.map((col) => (
                <FooterColumnView key={col.heading} col={col} isDark={isDark} />
              ))}
            </div>
          )}
        </Container>

        {/* Legal strip */}
        <div className={cn("border-t", isDark ? "border-canvas/10" : "border-line")}>
          <Container
            size="xl"
            className="flex flex-col-reverse items-start justify-between gap-4 py-6 md:flex-row md:items-center"
          >
            <div
              className={cn(
                "font-mono text-[11px] uppercase tracking-wide",
                isDark ? "text-canvas/50" : "text-muted"
              )}
            >
              {legal ?? `© ${new Date().getFullYear()} Didit · ${tI18n("legalTagline")}`}
            </div>
            {aside && <div className="flex items-center gap-4">{aside}</div>}
          </Container>
        </div>
      </footer>
    );
  }
);
Footer.displayName = "Footer";

export { Footer };
