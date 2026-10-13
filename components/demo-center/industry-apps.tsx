"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@website/components/ui/container";

/**
 * Full apps a prospect recognises as their own product, each built on the
 * real Didit API end to end. The catalogue above shows one module at a time;
 * these show the modules working together inside a product.
 */
const INDUSTRY_APPS = [
  {
    href: "/fintech",
    icon: "/icons/modules/transactions.svg",
    title: "Fintech",
    subtitle: "Kestrel, a neobank",
    blurb:
      "Sign-up with KYC and AML, payments through transaction monitoring, a large transfer held for review and ongoing AML monitoring.",
    chips: ["KYC + AML", "Transaction monitoring", "Ongoing monitoring"],
  },
];

export function IndustryApps() {
  return (
    <section className="border-t border-line bg-canvas">
      <Container className="py-14" size="xl">
        <p className="eyebrow eyebrow-accent mb-3.5">Industry apps</p>
        <h2 className="m-0 text-[32px] font-display leading-[1.1] tracking-display text-ink">
          See it inside a product.
        </h2>
        <p className="mt-3.5 max-w-[620px] text-[15px] leading-[1.5] text-muted">
          Complete apps built on Didit, live on staging: every screen is a real
          API call, with the operator side of each record next to it.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {INDUSTRY_APPS.map((app) => (
            <Link key={app.href} className="demo-card" href={app.href}>
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
                    {app.subtitle}
                  </span>
                </span>
                <span className="mode-chip mode-chip-hosted">App</span>
              </span>
              <span className="block text-[13px] leading-[18px] tracking-tight text-muted">
                {app.blurb}
              </span>
              <span className="flex flex-wrap gap-1">
                {app.chips.map((chip) => (
                  <span key={chip} className="meta-chip h-[22px]">
                    {chip}
                  </span>
                ))}
              </span>
              <span className="mt-auto flex items-center justify-end border-t border-line pt-3">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue">
                  Open the app
                  <ArrowRight className="size-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
