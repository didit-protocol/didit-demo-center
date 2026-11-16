/** Didit Brand v5 — Tailwind preset
 *
 * Drop into any Tailwind v3 project by listing this file under `presets` in the project's
 * tailwind.config.{ts,js,cjs}:
 *
 *   module.exports = {
 *     presets: [require("path/to/design/brand/components/tailwind.preset.cjs")],
 *     content: ["./app/**\/*.{ts,tsx}", "./components/**\/*.{ts,tsx}"],
 *   };
 *
 * Requires globals.css to be imported once (for the CSS variables this preset references).
 * Works with shadcn/ui's components out of the box — the color aliases match.
 */

const withOpacity =
  (v) =>
  ({ opacityValue }) =>
    opacityValue !== undefined ? `rgb(${v} / ${opacityValue})` : `rgb(${v})`;

const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" }
    },
    extend: {
      colors: {
        /* Didit surface tokens — now mapped to OpenAI Developers
           grayscale (Canvas White / Cloud Gray / Whisper Gray /
           Slate Text / Graphite Text) under their existing names so
           every component inherits the new look without per-file
           edits. The Didit Blue accent is preserved verbatim. */
        canvas: c("canvas"),
        cream: c("cream"),
        surface: c("surface"),
        elevated: c("elevated"),
        line: c("line"),
        muted: c("muted"),
        "table-head": c("table-head"),
        ink: c("ink"),
        "accent-black": c("accent-black"),
        "subtle-gray": c("subtle-gray"),
        "input-pale": c("input-pale"),
        "dark-overlay": c("dark-overlay"),
        blue: {
          DEFAULT: c("blue"),
          deep: c("blue-deep"),
          soft: c("blue-soft"),
          tint: c("blue-tint")
        },

        /* shadcn aliases — resolve to our tokens */
        background: c("background"),
        foreground: c("foreground"),
        card: c("card"),
        "card-foreground": c("card-foreground"),
        popover: c("popover"),
        "popover-foreground": c("popover-foreground"),
        primary: {
          DEFAULT: c("primary"),
          foreground: c("primary-foreground")
        },
        secondary: {
          DEFAULT: c("secondary"),
          foreground: c("secondary-foreground")
        },
        accent: {
          DEFAULT: c("accent"),
          foreground: c("accent-foreground")
        },
        destructive: {
          DEFAULT: c("destructive"),
          foreground: c("destructive-foreground")
        },
        "muted-foreground": c("muted-foreground"),
        border: c("border"),
        input: c("input"),
        ring: c("ring"),

        success: { DEFAULT: c("success-fg"), bg: c("success-bg") },
        warning: { DEFAULT: c("warning-fg"), bg: c("warning-bg") },
        danger: { DEFAULT: c("danger-fg"), bg: c("danger-bg") }
      },

      borderRadius: {
        /* Didit radius scale (Figma "Layout / Radius"):
             none 0 · 2xs 4 · xs 6 · sm 12 · md 16 · lg 24 ·
             xl 32 · 2xl 40 · full 999.
           DEFAULT (`rounded`) stays the 8px legacy surface radius;
           callout / editorial are legacy aliases; pill === full. */
        none: "var(--radius-none)" /* 0 */,
        "2xs": "var(--radius-2xs)" /* 4px */,
        xs: "var(--radius-xs)" /* 6px */,
        sm: "var(--radius-sm)" /* 12px */,
        md: "var(--radius-md)" /* 16px */,
        lg: "var(--radius-lg)" /* 24px */,
        xl: "var(--radius-xl)" /* 32px */,
        "2xl": "var(--radius-2xl)" /* 40px */,
        full: "var(--radius-full)" /* 999px */,
        DEFAULT: "var(--radius)" /* 8px (legacy default) */,
        callout: "var(--radius-callout)" /* 10px (legacy) */,
        editorial: "var(--radius-editorial)" /* 14px (legacy) */,
        pill: "var(--radius-pill)" /* full pill */
      },

      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif"
        ],
        // `font-mono` renders Inter (not a true monospace) — Didit uses it
        // only for uppercase, letter-spaced eyebrows / labels.
        mono: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"]
      },

      fontSize: {
        /* Display scale — Inter 500 with tight tracking */
        "display-xl": ["6rem", { lineHeight: "1", letterSpacing: "-0.035em" }],
        display: ["4rem", { lineHeight: "1", letterSpacing: "-0.03em" }],
        h1: ["3rem", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        h2: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        h3: ["1.375rem", { lineHeight: "1.3", letterSpacing: "-0.015em" }],
        /* Body */
        "body-lg": ["1.1875rem", { lineHeight: "1.55" }],
        body: ["1.0625rem", { lineHeight: "1.55" }],
        small: ["0.875rem", { lineHeight: "1.45" }],
        nav: ["0.8125rem", { lineHeight: "1" }]
      },

      fontWeight: {
        /* OpenAI Sans (Inter) weight ladder: 600 prominent headings,
           500 subheadings + important text, 400 body. */
        regular: "400",
        body: "400",
        medium: "500",
        display: "500" /* Didit display still 500 — matches OpenAI subheading weight */,
        semibold: "600" /* OpenAI primary-heading weight */
      },

      letterSpacing: {
        /* Tightly tracked OpenAI Sans values, plus the legacy Didit
           v5 tracking aliases. Scaled per size so 16px body uses
           -0.011em and 30px display uses -0.02em. */
        tighter: "-0.035em",
        tight: "-0.025em",
        normal: "0",
        wide: "0.04em",
        wider: "0.5px",
        body: "var(--tracking-body)" /* -0.011em */,
        subheading: "var(--tracking-subheading)" /* -0.011em */,
        "heading-sm": "var(--tracking-heading-sm)" /* -0.011em */,
        display: "var(--tracking-display)" /* -0.02em */
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-subtle)" /* OpenAI default lift */,
        subtle: "var(--shadow-subtle)" /* 0 1px 2px -1px rgba(0,0,0,0.08) */,
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        editorial: "var(--shadow-editorial)",
        ring: "0 0 0 3px rgba(37, 103, 255, 0.2)",
        "ring-danger": "0 0 0 3px rgba(182, 58, 46, 0.15)"
      },

      maxWidth: {
        /* OpenAI Developers contained page width. */
        page: "var(--page-max-width)" /* 1200px */
      },

      transitionTimingFunction: {
        out: "var(--ease-out)",
        in: "var(--ease-in)"
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "400ms"
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" }
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" }
        },
        /* TopBar entrance — the announcement strip slides down into its
           already-reserved row, so the navbar/hero never shift. */
        "topbar-enter": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "caret-blink": {
          "0%, 70%, 100%": { opacity: "1" },
          "20%, 50%": { opacity: "0" }
        },
        "mark-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(0.92)", opacity: "0.75" }
        },
        "mark-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(var(--orbit-radius,18px)) rotate(0deg)" },
          "100%": {
            transform: "rotate(360deg) translateX(var(--orbit-radius,18px)) rotate(-360deg)"
          }
        },
        draw: {
          from: { strokeDashoffset: "var(--draw-length, 1000)" },
          to: { strokeDashoffset: "0" }
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        },
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-12deg)" },
          "100%": { transform: "translateX(220%)  skewX(-12deg)" }
        },
        "mark-sweep": {
          "0%": { transform: "translateY(-180px)" },
          "100%": { transform: "translateY(560px)" }
        },
        "mark-fill": {
          "0%, 100%": { clipPath: "inset(100% 0 0 0)" },
          "50%": { clipPath: "inset(0 0 0 0)" }
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.45" },
          "40%": { transform: "scale(1)", opacity: "1" }
        },
        /* Cloud-drift — four phase-shifted loops the CloudGradient blobs
           use to produce the slow OpenAI "moving cloud" backdrop. Each
           blob translates a few % in x/y over 22-30s, then comes home. */
        "cloud-drift-a": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(6%, 4%, 0) scale(1.06)" }
        },
        "cloud-drift-b": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-5%, 6%, 0) scale(1.08)" }
        },
        "cloud-drift-c": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-7%, -3%, 0) scale(1.05)" }
        },
        "cloud-drift-d": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(4%, -6%, 0) scale(1.07)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 520ms cubic-bezier(0.32, 0.72, 0, 1)",
        "accordion-up": "accordion-up 340ms cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 200ms var(--ease-out)",
        "fade-out": "fade-out 120ms var(--ease-in)",
        "zoom-in": "zoom-in 200ms var(--ease-out)",
        "slide-in": "slide-in-from-top 200ms var(--ease-out)",
        "topbar-enter": "topbar-enter 500ms var(--ease-out) 150ms both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "mark-pulse": "mark-pulse 2.4s ease-in-out infinite",
        "mark-spin": "mark-spin 2s linear infinite",
        orbit: "orbit 4s linear infinite",
        draw: "draw 1.4s var(--ease-out) forwards",
        marquee: "marquee 28s linear infinite",
        "reveal-up": "reveal-up 600ms var(--ease-out) both",
        shine: "shine 2.6s ease-in-out infinite",
        "mark-sweep": "mark-sweep 2s linear infinite",
        "mark-fill": "mark-fill 2.8s ease-in-out infinite",
        "dot-bounce": "dot-bounce 1.2s ease-in-out infinite",
        "cloud-drift-a": "cloud-drift-a 24s var(--ease-out) infinite",
        "cloud-drift-b": "cloud-drift-b 28s var(--ease-out) infinite",
        "cloud-drift-c": "cloud-drift-c 26s var(--ease-out) infinite",
        "cloud-drift-d": "cloud-drift-d 30s var(--ease-out) infinite"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
