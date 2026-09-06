import { Inter } from "next/font/google";

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
