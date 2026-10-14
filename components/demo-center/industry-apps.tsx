"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@website/components/ui/container";

<<<<<<< HEAD
import { INDUSTRY_APPS } from "@/lib/industry-apps";

/** The catalogue's link to the industry apps (lib/industry-apps.ts). */
export function IndustryApps() {
  return (
    <section
      aria-labelledby="industry-apps"
      className="border-t border-line bg-canvas"
    >
      <Container className="py-12" size="xl">
        <p className="eyebrow eyebrow-accent mb-3">Industry apps</p>
        <h2
          className="m-0 text-[28px] font-display leading-[1.1] tracking-display text-ink"
          id="industry-apps"
        >
          See it inside a real product.
        </h2>
        <p className="mt-2.5 max-w-[620px] text-[15px] leading-[1.5] text-muted">
          Complete apps that chain several modules the way a customer in that
          industry would, from sign-up to the compliance team&apos;s view.
        </p>
        <ul className="m-0 mt-7 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {INDUSTRY_APPS.map((app) => (
            <li key={app.href}>
              <Link className="demo-card h-full" href={app.href}>
                <span className="flex items-center gap-3">
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
                      {app.name}
=======
                      {app.title}
>>>>>>> origin/main
                    </span>
                    <span className="text-xs tracking-tight text-muted">
                      {app.industry}
                    </span>
                  </span>
<<<<<<< HEAD
                  <span className="mode-chip mode-chip-hosted">Live app</span>
                </span>
                <span className="block text-[13px] leading-[18px] tracking-tight text-muted">
                  {app.summary}
                </span>
                <span className="flex flex-wrap gap-1">
                  {app.modules.map((module) => (
                    <span key={module} className="meta-chip h-[22px]">
                      {module}
                    </span>
                  ))}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 border-t border-line pt-3 text-[13px] font-medium text-blue">
                  Open the app
                  <ArrowRight className="size-4" />
=======
                  <ArrowRight aria-hidden className="size-5 text-muted" />
                </span>
                <span className="text-[13px] leading-5 text-muted">
                  {app.blurb}
>>>>>>> origin/main
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
