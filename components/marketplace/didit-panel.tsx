"use client";

import type { ChapterGuide, GuideCall } from "@/lib/marketplace/guide";

import { BookOpen, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { docs } from "@/lib/docs";

const SIDE_LABEL: Record<GuideCall["side"], string> = {
  server: "Your server",
  browser: "Browser",
  didit: "Didit",
};

const SIDE_STYLE: Record<GuideCall["side"], string> = {
  server: "bg-ink/[0.07] text-ink",
  browser: "bg-blue-soft text-blue-deep",
  didit: "bg-success-bg text-success",
};

/**
 * "How this uses Didit": the modules a chapter runs and every call it makes,
 * in order, each one linked to its page on docs.didit.me.
 */
export function DiditPanel({
  chapter,
  className,
  headingId,
}: {
  chapter: ChapterGuide;
  className?: string;
  headingId?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div>
        <p className="eyebrow eyebrow-accent mb-2">How this uses Didit</p>
        <h2
          className="m-0 text-base font-medium tracking-tight text-ink"
          id={headingId}
        >
          {chapter.number}. {chapter.title}
        </h2>
      </div>

      <div>
        <p className="eyebrow eyebrow-muted mb-2.5">Modules</p>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {chapter.modules.map((module) => (
            <li
              key={module}
              className="inline-flex h-7 items-center rounded-pill bg-blue/[0.12] px-2.5 text-xs font-medium text-blue-deep"
            >
              {module}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="eyebrow eyebrow-muted mb-2.5">Calls, in order</p>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {chapter.calls.map((call, index) => (
            <li key={`${call.call}-${index}`} className="mkt-inset p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-pill px-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em]",
                    SIDE_STYLE[call.side],
                  )}
                >
                  {SIDE_LABEL[call.side]}
                </span>
              </div>
              <p className="m-0 break-words font-mono text-[12px] leading-5 text-ink [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
                {call.call}
              </p>
              <p className="mt-1 text-[13px] leading-[18px] text-muted">
                {call.detail}
              </p>
              <a
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-blue-deep hover:underline"
                href={docs(call.docsPath)}
                rel="noreferrer"
                target="_blank"
              >
                <BookOpen className="size-3.5 flex-none" />
                docs.didit.me/{call.docsPath}
                <ExternalLink className="size-3 flex-none" />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
