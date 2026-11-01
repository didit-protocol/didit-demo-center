/**
 * The demo centre and didit.me are one visual system.
 *
 * The preset is the website's own `tailwind.preset.cjs`, vendored byte-for-byte
 * (see scripts/website-chrome/manifest.mjs), so every token - `bg-canvas`,
 * `text-ink`, `text-muted`, `border-line`, `rounded-xs`, `duration-fast`,
 * `max-w-page` - resolves to exactly the value it has on didit.me. The vendored
 * navbar and footer compile from the same config as the catalogue they wrap.
 *
 * `extend` below adds only two things:
 *  - the legacy colour aliases the pre-redesign pages (/accs, /ibeta, the
 *    CAPTCHA demo) still reference, so they keep rendering unchanged;
 *  - the handful of animations the catalogue's modals use.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("./vendor/didit-website/tailwind.preset.cjs")],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./vendor/didit-website/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy aliases - only the pre-redesign routes still use these.
        "app-black": "#1A1A1A",
        "app-white": "#FEFEFE",
        "dusty-gray": "#9DA1A1",
        "graphite-gray": "#4B5058",
        "light-gray": "#F6F6F6",
        "light-blue": "#90B1FF",
        lime: "#ECF86E",
      },
      // Legacy scales - same story as the colours above.
      boxShadow: {
        soft: "0 2px 8px 0 rgba(0, 0, 0, 0.04)",
        card: "0 4px 24px 0 rgba(0, 0, 0, 0.06)",
        "card-hover": "0 8px 32px 0 rgba(0, 0, 0, 0.1)",
        elevated: "0 12px 40px 0 rgba(0, 0, 0, 0.12)",
      },
      backgroundImage: {
        "gradient-hero":
          "radial-gradient(circle at 50% 0%, #dcefff 0%, #eef3ff 50%, #ffffff 100%)",
      },
      fontSize: {
        "body-md": ["15px", { lineHeight: "22px", letterSpacing: "-0.3px" }],
        "body-sm": ["14px", { lineHeight: "20px", letterSpacing: "-0.28px" }],
        "label-md": ["13px", { lineHeight: "16px", letterSpacing: "-0.26px" }],
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.97) translateY(12px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        rise: "rise 450ms var(--ease-out) both",
        "modal-in": "modal-in 220ms var(--ease-out) both",
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
      },
    },
  },
  darkMode: ["class"],
  plugins: [require("tailwindcss-animate")],
};
