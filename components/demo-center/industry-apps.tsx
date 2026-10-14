"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@website/components/ui/container";

/**
 * Full product demos, one per industry, that run several Didit modules
 * together inside a fictional operator's own app. Each entry links to its
 * route; the catalogue above stays the place for single modules.
 */
const INDUSTRY_APPS = [
  {
    href: "/igaming",
    icon: "/icons/industries/igaming.svg",
    industry: "iGaming",
    title: "Aurora Play",
    blurb:
      "Casino and sportsbook: age estimation at sign-up, licensed markets, monitored deposits, an ID check at 2,000 EUR, bonus abuse and self-exclusion.",
  },
  {
    href: "/fintech",
    icon: "/icons/industries/fintech.svg",
    industry: "Fintech",
    title: "Alder",
    blurb:
      "Neobank: sign-up with KYC and AML screening, payments through transaction monitoring, a large transfer held for review and ongoing AML monitoring.",
  },
<<<<<<< HEAD
  {
    href: "/crypto-exchange",
    icon: "/icons/industries/crypto.svg",
    industry: "Crypto exchange",
    title: "Kestrel",
    blurb:
      "KYC and AML at sign-up, wallet screening on every deposit and withdrawal, the Travel Rule and a selfie step-up, with the compliance view of each transfer.",
=======
  // Marketplace demo (DID-7138).
  {
    href: "/marketplace",
    icon: "/icons/industries/marketplaces.svg",
    industry: "Marketplace",
    title: "Northmarket",
    blurb:
      "Resale marketplace: seller KYB with UBOs and the representatives' ID checks, buyer age checks at 1,000 EUR, monitored orders and payouts, and a second shop caught on a shared device.",
>>>>>>> origin/main
  },
];

export function IndustryApps() {
  return (
    <section className="border-t border-line bg-canvas">
      <Container className="py-12" size="xl">
        <p className="eyebrow mb-3">Industry demo apps</p>
        <h2 className="m-0 text-[28px] font-display leading-[1.1] tracking-display text-ink">
          Every module, in a real product.
        </h2>
        <ul className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_APPS.map((app) => (
            <li key={app.href}>
              <Link className="demo-card h-full" href={app.href}>
                <span className="flex items-start gap-3">
                  <span className="flex size-10 flex-none items-center justify-center rounded-xs bg-surface">
                    <Image
                      alt=""
                      className="size-[22px]"
                      height={22}
                      src={app.icon}
                      width={22}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold tracking-tight text-ink">
                      {app.title}
                    </span>
                    <span className="text-xs tracking-tight text-muted">
                      {app.industry}
                    </span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 text-muted" />
                </span>
                <span className="text-[13px] leading-5 text-muted">
                  {app.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
