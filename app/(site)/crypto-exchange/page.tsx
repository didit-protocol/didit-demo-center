import { Metadata } from "next";

import "@/styles/crypto-exchange.css";

import { ExchangeDemo } from "@/components/crypto-exchange/exchange-demo";

export const metadata: Metadata = {
  title: "Crypto exchange demo",
  description:
    "Kestrel, a crypto exchange running on Didit: KYC and AML onboarding, wallet screening on deposits and withdrawals, the Travel Rule and a selfie step-up, with the operator's compliance view.",
};

export default function CryptoExchangePage() {
  return <ExchangeDemo />;
}
