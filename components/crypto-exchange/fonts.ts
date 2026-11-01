import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

/** Kestrel's own type: Space Grotesk, with IBM Plex Mono for every figure. */
export const fontKestrelSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-ks-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const fontKestrelMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ks-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});
