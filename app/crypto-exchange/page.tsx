import { Metadata } from "next";
import { Suspense } from "react";

import "@/styles/demos/live.css";
import "@/styles/demos/kestrel.css";

import {
  fontKestrelMono,
  fontKestrelSans,
} from "@/components/crypto-exchange/fonts";
import { KestrelDemo } from "@/components/crypto-exchange/kestrel-demo";

export const metadata: Metadata = {
  title: "Crypto exchange demo: Kestrel",
  description:
    "A fictional crypto exchange running Didit end to end: a passkey sign-up, KYC and AML before the first deposit, deposits screened by the sending wallet, a Travel Rule withdrawal with a selfie and a sanctioned wallet declined.",
  alternates: { canonical: "/crypto-exchange" },
};

export default function CryptoExchangePage() {
  return (
    <div className={`${fontKestrelSans.variable} ${fontKestrelMono.variable}`}>
      <Suspense>
        <KestrelDemo />
      </Suspense>
    </div>
  );
}
