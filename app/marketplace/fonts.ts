import { DM_Sans, Fraunces } from "next/font/google";

/** Northmarket's own type: Fraunces for headings, DM Sans for the rest. */
export const fontFraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["500", "600"],
});

export const fontDmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
