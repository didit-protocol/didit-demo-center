"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@website/components/ui/container";

import { HERO_STATS, DEMOS } from "@/lib/demos";
import { DOC_LINKS } from "@/lib/docs";

export function Hero({ onStartFirst }: { onStartFirst: () => void }) {
  return (
    <section className="border-b border-line bg-canvas">
      <Container
        className="grid items-end gap-10 pb-10 pt-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14 lg:pt-[72px]"
        size="xl"
      >
        <div className="animate-rise">
          <p className="eyebrow eyebrow-accent mb-5">
            Authenticate · Verify · Monitor
          </p>
          <h1 className="text-balance text-[38px] font-display leading-[1.02] tracking-tighter text-ink sm:text-[48px] lg:text-[60px]">
            Every module, live.
            <br />
            <span className="text-blue">One sandbox.</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-pretty text-body text-muted">
            Run the real thing - {DEMOS.length} pre-built workflows across KYC,
            KYB, monitoring and fraud. Launch a live session on your own device,
            or click through a sample decision for the flows that run
            server-side. Every demo ships with the request that created it.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <button
              className="btn-primary h-11 pl-[18px] pr-2.5"
              type="button"
              onClick={onStartFirst}
            >
              Start with free KYC
              <ArrowRight className="size-6" />
            </button>
            <a
              className="btn-muted h-11 px-[18px]"
              href={DOC_LINKS.apiReference}
              rel="noreferrer"
              target="_blank"
            >
              Read the API reference
            </a>
          </div>
        </div>

        <dl className="grid grid-cols-2 border-l border-t border-line">
          {HERO_STATS.map((stat) => (
            <div
              key={stat.label}
              className="border-b border-r border-line px-5 py-[18px]"
            >
              <dd className="tnum m-0 text-[28px] font-display tracking-display text-ink">
                {stat.value}
              </dd>
              <dt className="eyebrow eyebrow-muted mt-1.5">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
