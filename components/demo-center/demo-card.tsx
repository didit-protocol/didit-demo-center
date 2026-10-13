"use client";

import type { Demo } from "@/lib/demos";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function DemoCard({ demo, onOpen }: { demo: Demo; onOpen: () => void }) {
  const hosted = demo.mode === "hosted";

  return (
    <button className="demo-card" type="button" onClick={onOpen}>
      <span className="flex items-start gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-xs bg-surface">
          <Image
            alt=""
            className="size-[22px]"
            height={22}
            src={demo.icon}
            width={22}
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            {demo.title}
          </span>
          <span className="text-xs tracking-tight text-muted">
            {demo.subtitle}
          </span>
        </span>
        <span
          className={cn(
            "mode-chip",
            hosted ? "mode-chip-hosted" : "mode-chip-api",
          )}
        >
          {hosted ? "Hosted flow" : "API demo"}
        </span>
      </span>

      <span className="block text-[13px] leading-[18px] tracking-tight text-muted">
        {demo.blurb}
      </span>

      <span className="flex flex-wrap gap-1">
        {demo.chips.map((chip) => (
          <span key={chip} className="meta-chip h-[22px]">
            {chip}
          </span>
        ))}
      </span>

      <span className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="tnum text-[11px] tracking-tight text-muted">
          {demo.price}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue">
          {demo.cta}
          <ArrowRight className="size-4" />
        </span>
      </span>
    </button>
  );
}
