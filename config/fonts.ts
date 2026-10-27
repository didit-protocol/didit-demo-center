import { Inter, Sora } from "next/font/google";
import localFont from "next/font/local";

/**
 * Inter is the brand's only typeface. The design system uses it for body,
 * headings AND the tracked all-caps eyebrows (`font-mono` in the Tailwind
 * preset resolves to Inter too), so one family covers the whole app. Weights
 * stop at 600: the system forbids headings heavier than 500 and reserves 600
 * for prominent headings.
 */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

/**
 * The industry demos' own type. Didit Grotesk (the design system's face, the
 * same file didit.me serves) sets the Demo Center bar, the live layer and the
 * hub; each customer app brings its own family, never Didit's.
 */
export const fontDidit = localFont({
  src: "../styles/fonts/DiditGrotesk-Variable.woff2",
  variable: "--font-didit",
  display: "swap",
  weight: "300 800",
});

export const fontDiditMono = localFont({
  src: "../styles/fonts/DiditGroteskMono-Variable.woff2",
  variable: "--font-didit-mono",
  display: "swap",
});

/** The console view replicates the console, which is set in Inter. */
export const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

/** Aurora Play, the casino. */
export const fontSora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
