import { Metadata } from "next";

import { MarketplaceDemo } from "@/components/marketplace/marketplace-demo";

export const metadata: Metadata = {
  title: "Marketplace demo",
  description:
    "A resale marketplace running Didit end to end: seller KYB with key people, buyer age checks on high-value orders, monitored payouts and a second shop caught on a shared device.",
  alternates: { canonical: "/marketplace" },
};

export default function MarketplacePage() {
  return <MarketplaceDemo />;
}
