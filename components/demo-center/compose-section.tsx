"use client";

import Image from "next/image";
import { ArrowUpRight, Workflow } from "lucide-react";
import { Container } from "@website/components/ui/container";

import { FLOW_NODES } from "@/lib/demos";
import { DOC_LINKS } from "@/lib/docs";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const NODE_TONE: Record<string, { surface: string; text: string }> = {
  neutral: { surface: "bg-surface", text: "text-muted" },
  approved: { surface: "bg-success-bg", text: "text-success" },
  info: { surface: "bg-blue-soft", text: "text-blue-deep" },
  declined: { surface: "bg-danger-bg", text: "text-danger" },
};

export function ComposeSection() {
  return (
    <section className="border-t border-line bg-surface">
      <Container
        className="grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12"
        size="xl"
      >
        <div>
          <p className="eyebrow mb-3.5">None of these fit?</p>
          <h2 className="m-0 text-[32px] font-display leading-[1.1] tracking-display text-ink">
            Compose any flow. <span className="text-blue">No code.</span>
          </h2>
          <p className="mt-3.5 max-w-[520px] text-[15px] leading-[1.5] text-muted">
            Every demo above is just a workflow id. Chain 25+ modules with your
            own branching logic in the console, copy the id, and pass it to the
            same endpoint.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              className="btn-dark h-11 pl-[18px] pr-2.5"
              href={siteConfig.links.console}
              rel="noreferrer"
              target="_blank"
            >
              Open the builder
              <ArrowUpRight className="size-6" />
            </a>
            <a
              className="btn-outline h-11 px-[18px]"
              href={DOC_LINKS.workflows}
              rel="noreferrer"
              target="_blank"
            >
              Workflow docs
            </a>
          </div>
        </div>

        <div className="rounded-sm border border-line bg-canvas p-1.5">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
            <Workflow aria-hidden className="size-4 text-muted" />
            <p className="eyebrow eyebrow-muted">Adaptive age · node graph</p>
          </div>
          <div className="flex flex-col p-2">
            {FLOW_NODES.map((node) => {
              const tone = NODE_TONE[node.tone];

              return (
                <div
                  key={node.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xs p-2.5",
                    tone.surface,
                  )}
                >
                  <span className="flex size-[26px] flex-none items-center justify-center rounded-xs border border-line bg-canvas">
                    <Image
                      alt=""
                      className="size-[15px]"
                      height={15}
                      src={node.icon}
                      width={15}
                    />
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-ink">
                    {node.label}
                  </span>
                  <span
                    className={cn("tnum text-[11px] tracking-tight", tone.text)}
                  >
                    {node.condition}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
