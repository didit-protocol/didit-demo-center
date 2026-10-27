import { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";

import "@/styles/demos/live.css";
import "@/styles/demos/alder.css";

import { AlderDemo } from "@/components/fintech/alder-demo";

/** Alder's own type: the bank's brand, never Didit's. */
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Fintech demo: Alder",
  description:
    "A fictional neobank running Didit end to end: a passkey sign-up, KYC and AML before the IBAN, a 5,000 EUR transfer to a new payee held for a step-up, and an account takeover blocked at sign-in.",
  alternates: { canonical: "/fintech" },
};

export default function FintechPage() {
  return (
    <div className={manrope.variable} style={{ display: "contents" }}>
      <Suspense>
        <AlderDemo />
      </Suspense>
    </div>
  );
}
