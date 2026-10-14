import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

import { BRAND } from "@/lib/marketplace/catalog";

/** The catalogue's way into the marketplace demo (/marketplace). */
export function MarketplaceCatalogueCard() {
  return (
    <Link
      className="demo-card flex-row items-center gap-4 sm:gap-5"
      href="/marketplace"
    >
      <span className="flex size-11 flex-none items-center justify-center rounded-sm bg-blue-soft text-blue-deep">
        <Store className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="eyebrow eyebrow-accent mb-1.5 block">
          Industry demo · Marketplace
        </span>
        <span className="block text-base font-medium tracking-tight text-ink">
          {BRAND.name}: seller KYB, buyer age checks, monitored payouts
        </span>
        <span className="mt-1 block text-[13px] leading-[18px] text-muted">
          A resale marketplace running Didit end to end, including the second
          shop caught on a shared device and the operator view.
        </span>
      </span>
      <ArrowRight className="size-5 flex-none text-muted" />
    </Link>
  );
}
