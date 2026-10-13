import { useTranslations } from "next-intl";
import { TopBar } from "@website/components/ui/top-bar";
import { Badge } from "@website/components/ui/badge";

/**
 * Announcement bar — rotates per spec §3.1. Single-slot for now (slot 1 is the
 * funding announcement). Future-proofed: change the slot key below to switch
 * the active announcement without touching code in pages.
 *
 * The headline figure is wrapped in an `<amt>…</amt>` tag inside each locale's
 * message string and rendered as the design-system `Badge` (white variant —
 * translucent Canvas fill + Canvas text, made for dark / Blue surfaces) via
 * next-intl `t.rich`.
 * Using an explicit tag (instead of a `$<digits>[KMB]` regex) is what makes the
 * highlight work in EVERY locale regardless of how the amount is written —
 * `$7.5M` (en), `7,5M $` (es/ca), `7,5 Mio. $` (de), `750万ドル` (ja),
 * `US$ 7,5 milhões` (pt-BR), `7.5 مليون دولار` (ar). The tag is the single source
 * of truth for which span gets the pill.
 */
export function AnnouncementBar({ slotKey = "slot1" }: { slotKey?: string }) {
  const t = useTranslations(`translation_v1.chrome.announcementBar.${slotKey}`);
  return (
    <TopBar
      data-didit-component="announcement-bar"
      id={`announcement-${slotKey}`}
      tone="blue"
      // Solid Didit Blue (#2567FF) fill — the celebratory fundraise band reads
      // as the true brand accent, not a washed-out translucent tint.
      // `tone="blue"` already provides `bg-blue text-canvas`; no override needed.
      dismissable
      // Inline fragments only — TopBar owns the row layout. On mobile the
      // message slot truncates to a single line; on sm+ it renders in full.
      message={t.rich("text", {
        // The amount renders as the design-system Badge (white variant) but
        // adopts the announcement sentence's own type — same Inter family,
        // size, weight and tracking, no mono/uppercase — with em-based padding
        // so the chip border hugs the figure.
        amt: (chunks) => (
          <Badge
            variant="white"
            // Asymmetric vertical padding (more top, less bottom) optically
            // centers the all-caps/figure amount: "$7.5M" has no descenders, so
            // equal padding reads top-heavy — the empty descender space below
            // looks like extra room. The 0.14em top/bottom gap keeps the glyphs
            // nudged down ~1px; both values raised together for a taller chip.
            // `align-middle` seats the tall chip symmetrically on the line so it
            // doesn't inflate the line box upward — the sentence, the chip, and
            // the CTA all share one vertical centre. The `-translate-y` then
            // lifts the chip *visually* (transform, so it never reflows the row
            // or shifts the CTA) to cancel the optical down-nudge, landing the
            // "$7.5M" glyphs on the same baseline as the sentence + CTA.
            className="mx-0.5 h-auto -translate-y-[2px] rounded-md px-[0.45em] pb-[0.26em] pt-[0.4em] align-middle text-[12.5px] font-semibold normal-case leading-none tracking-[-0.005em] sm:text-[13px]"
          >
            {chunks}
          </Badge>
        )
      })}
      cta={{ label: t("ctaLabel"), href: t("href") }}
      // The CTA centres on the row's geometric centre, which sits ~0.75px below
      // the glyph baseline the sentence + chip share (the chip pulls the line a
      // touch up). Lift the CTA by exactly that amount so all three glyph rows
      // line up. Measured value — not a round number. (sm+ only — the mobile CTA
      // shows just the arrow.)
      ctaClassName="sm:-translate-y-[0.75px]"
    />
  );
}
