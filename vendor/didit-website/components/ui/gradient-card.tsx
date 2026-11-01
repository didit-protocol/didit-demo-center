import * as React from "react";

import { cn } from "@website/lib/utils";

/**
 * Didit v5 GradientCard — OpenAI-inspired hazy-mesh surface.
 *
 * Four palettes, all rendered as overlapping soft radial gradients (no images
 * — SSR-safe, zero network). Designed for marketing cards where you want the
 * card itself to carry atmosphere behind the text.
 *
 *   peach    — pink → peach → lavender → sky (the OpenAI /api card look)
 *   sky      — cool blue + peach bloom (OpenAI /business use-case)
 *   aurora   — sunset mesh, more saturated — pair sparingly
 *   ink-blue — dark Ink-to-Blue, for "use-case" cards on light pages
 *   blue     — monotone Didit Blue wash (safest, brand-canonical choice)
 *
 * The gradient sits at the back; children stack on top. Text renders in Ink
 * on light palettes and Canvas on dark palettes automatically, but any class
 * on the children always wins.
 */

export type GradientPalette =
  | "peach"
  | "sky"
  | "aurora"
  | "ink-blue"
  | "blue"
  // Subtle Didit-Blue-leaning variants for navbar / submenu cards.
  // Same hue language as the saturated palettes above but at ~30-40%
  // alpha so the card composes with the OpenAI Developers grayscale
  // canvas instead of fighting it.
  | "blue-soft"
  | "peach-soft"
  | "sky-soft";

export interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  palette?: GradientPalette;
  /** Aspect ratio — pass "auto" to let content dictate height. Default "4/5". */
  aspect?: string | "auto";
  /** Radius preset — maps to the named radius scale (md 16px · lg 24px · xl 32px). Default `lg`. */
  radius?: "md" | "lg" | "xl";
  /**
   * One-off image (path under /public) that overrides the palette surface for
   * THIS card only. Most cards should leave this unset and let `PALETTE_IMAGE`
   * drive the look site-wide; use this only for a bespoke accent.
   */
  backgroundImage?: string;
  /**
   * Legibility veil drawn over an image surface (palette text color, see
   * `IMAGE_SCRIM`). On by default whenever an image is used; pass `false` for
   * cards whose only content is a self-contained tile (e.g. the lifecycle
   * icon chips) where the raw image should show through.
   */
  scrim?: boolean;
}

/**
 * Each palette is a stack of 3–4 radial gradients, blended via `mix-blend-mode`
 * for the soft haze. The final backdrop is a solid fallback color so the card
 * never feels hollow if a gradient fails to resolve.
 */
const PALETTES: Record<GradientPalette, { background: string; dark?: boolean }> = {
  peach: {
    background: "var(--api-gradient-soft)"
  },
  sky: {
    background: "var(--api-gradient-cool)"
  },
  aurora: {
    background: `
      radial-gradient(80% 60% at 20% 20%,  #F8B36A 0%, transparent 55%),
      radial-gradient(80% 60% at 80% 30%,  #F289C6 0%, transparent 60%),
      radial-gradient(100% 90% at 50% 95%, #8EB8FF 0%, transparent 60%),
      linear-gradient(180deg, #FFF1DC 0%, #E8DAFF 100%)
    `
  },
  blue: {
    background: `
      radial-gradient(90% 80% at 18% 20%,  rgba(37,103,255,0.55) 0%, transparent 60%),
      radial-gradient(90% 80% at 85% 85%,  rgba(37,103,255,0.25) 0%, transparent 60%),
      linear-gradient(180deg, #EAF0FF 0%, #F5F7FF 100%)
    `
  },
  "ink-blue": {
    background: "var(--api-gradient-ink)",
    dark: true
  },
  // Soft brand-aligned variants. Same gradient grammar (radial blooms
  // over a tinted linear base) but at low alpha so the card reads as
  // a quiet surface, not a sticker.
  "blue-soft": {
    background: `
      radial-gradient(110% 90% at 18% 18%, rgba(37,103,255,0.20) 0%, rgba(37,103,255,0) 60%),
      radial-gradient(95% 80% at 88% 88%, rgba(37,103,255,0.12) 0%, rgba(37,103,255,0) 60%),
      linear-gradient(180deg, #F7F9FF 0%, #EAF1FF 100%)
    `
  },
  "peach-soft": {
    background: `
      radial-gradient(115% 90% at 16% 18%, rgba(255,177,216,0.30) 0%, rgba(255,177,216,0) 60%),
      radial-gradient(100% 85% at 88% 22%, rgba(255,199,150,0.28) 0%, rgba(255,199,150,0) 60%),
      linear-gradient(180deg, #FFF7EE 0%, #FFEFE0 100%)
    `
  },
  "sky-soft": {
    background: `
      radial-gradient(115% 90% at 18% 22%, rgba(159,180,255,0.30) 0%, rgba(159,180,255,0) 60%),
      radial-gradient(100% 85% at 88% 88%, rgba(200,168,255,0.22) 0%, rgba(200,168,255,0) 60%),
      linear-gradient(180deg, #F2F6FF 0%, #EEF3FF 100%)
    `
  }
};

const RADIUS = { md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl" } as const;

/**
 * Palette → background-image registry. **This is the one place to re-skin every
 * gradient surface on the site.** Map a palette to an image under /public and
 * EVERY GradientCard / GradientFeatureCard using that palette swaps its CSS
 * gradient for the image automatically — no component or page edits.
 *
 * To change a look: edit one path below (the library ships pre-compressed
 * ~15KB blurred webps in /public/media/gradient-library). To revert a palette
 * to its tuned CSS gradient, delete its row (or set it to `undefined`). A
 * per-card `backgroundImage` prop always wins over this map.
 */
export const PALETTE_IMAGE: Partial<Record<GradientPalette, string>> = {
  peach: "/media/gradient-library/nature-blurred-11.webp",
  sky: "/media/gradient-library/nature-blurred-08.webp",
  aurora: "/media/gradient-library/nature-blurred-14.webp",
  blue: "/media/gradient-library/nature-blurred-17.webp",
  "ink-blue": "/media/gradient-library/nature-blurred-05.webp",
  "blue-soft": "/media/gradient-library/nature-blurred-23.webp",
  "peach-soft": "/media/gradient-library/nature-blurred-31.webp",
  "sky-soft": "/media/gradient-library/nature-blurred-14.webp"
};

/** Every image in /public/media/gradient-library, in library order. */
const GRADIENT_LIBRARY = Array.from(
  { length: 40 },
  (_, i) => `/media/gradient-library/nature-blurred-${String(i + 1).padStart(2, "0")}.webp`
);

/** The 7 images `PALETTE_IMAGE` reserves, so a drawn surface never echoes a palette. */
const RESERVED_IMAGES = new Set(Object.values(PALETTE_IMAGE));

/**
 * The unreserved pool — 33 of the 40 library images, none of which any palette
 * uses. Draw from this when a surface needs to be visibly distinct from its
 * siblings rather than to carry a palette's meaning.
 */
export const GRADIENT_POOL: readonly string[] = GRADIENT_LIBRARY.filter(
  (src) => !RESERVED_IMAGES.has(src)
);

/**
 * A distinct pool image per index — for card GRIDS, where cycling a two- or
 * three-palette sequence makes every third card look like a repeat. Australia
 * ships 23 database-validation services; at three palettes that was the same
 * two images eleven times each.
 *
 * Wraps past the pool length rather than throwing, so a grid longer than 33
 * degrades to a repeat instead of a crash. `offset` lets sibling grids on one
 * page start from different points in the pool.
 */
export function gradientPoolAt(index: number, offset = 0): string {
  const pool = GRADIENT_POOL;
  return pool[(((index + offset) % pool.length) + pool.length) % pool.length];
}

/**
 * Legibility veil drawn over image surfaces. Light palettes get a white wash,
 * dark palettes an ink wash, stronger toward the bottom where captions sit.
 * Tune the alphas here if cards read low-contrast — or just swap the image in
 * `PALETTE_IMAGE` for a calmer one.
 */
const IMAGE_SCRIM = {
  light: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.30) 100%)",
  dark: "linear-gradient(180deg, rgba(7,7,7,0.28) 0%, rgba(7,7,7,0.52) 100%)"
} as const;

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  (
    {
      className,
      palette = "peach",
      aspect = "4/5",
      radius = "lg",
      backgroundImage,
      scrim = true,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const cfg = PALETTES[palette];
    const image = backgroundImage ?? PALETTE_IMAGE[palette];
    // Composite the scrim + image as stacked CSS background layers (veil on
    // top, image beneath). Doing it in `background` — rather than an overlay
    // element — keeps `children` as direct DOM nodes, so cards that lay their
    // children out with flex/grid on the root (navbar, FeatureRowList, bento)
    // are unaffected.
    const imageLayers = image
      ? scrim
        ? `${cfg.dark ? IMAGE_SCRIM.dark : IMAGE_SCRIM.light}, url(${image})`
        : `url(${image})`
      : undefined;
    return (
      <div
        data-didit-component="gradient-card"
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          RADIUS[radius],
          cfg.dark ? "text-canvas" : "text-ink",
          className
        )}
        style={{
          background: image ? undefined : cfg.background,
          backgroundImage: imageLayers,
          backgroundSize: image ? "cover" : undefined,
          backgroundPosition: image ? "center" : undefined,
          backgroundRepeat: image ? "no-repeat" : undefined,
          aspectRatio: aspect === "auto" ? undefined : aspect,
          ...style
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GradientCard.displayName = "GradientCard";

export { GradientCard };
