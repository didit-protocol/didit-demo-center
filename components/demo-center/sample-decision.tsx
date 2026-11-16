"use client";

import type { SampleDecision, TraceEntry } from "@/lib/demos";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

import { VERDICT_STYLE } from "./tone";

import { cn } from "@/lib/utils";

/**
 * The "Sample decision" tab: a verdict banner, the run trace, the structured
 * sections and the expandable per-subject rows. Every value is a fixture -
 * the banner says so - but the field names are the ones the live API returns.
 */
export function SampleDecisionView({
  sample,
  trace,
  responsePath,
}: {
  sample: SampleDecision;
  trace?: TraceEntry[];
  responsePath: string;
}) {
  const [openRow, setOpenRow] = React.useState<number | null>(null);
  const verdict = VERDICT_STYLE[sample.tone];

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn(
          "flex items-center gap-3.5 rounded-xs border p-4",
          verdict.surface,
          verdict.border,
        )}
      >
        <Image
          alt=""
          className="size-5 flex-none"
          height={20}
          src={verdict.icon}
          width={20}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "m-0 text-[15px] font-semibold tracking-tight",
              verdict.text,
            )}
          >
            {sample.verdict}
          </p>
          <p className="mt-1 text-xs text-muted">{sample.summary}</p>
        </div>
        <div className="flex-none text-right">
          <p
            className={cn(
              "tnum m-0 text-2xl font-display tracking-display",
              verdict.text,
            )}
          >
            {sample.score}
          </p>
          <p className="eyebrow eyebrow-muted mt-1">{sample.scoreLabel}</p>
        </div>
      </div>

      {trace && trace.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title flex-1">What the platform did</p>
            <p className="panel-title">Fixture run</p>
          </div>
          {trace.map((entry) => (
            <div
              key={entry.label}
              className="flex gap-3 border-b border-surface px-3.5 py-[11px] last:border-b-0"
            >
              <span
                className={cn(
                  "mt-1.5 size-[7px] flex-none rounded-pill",
                  entry.ok ? "bg-success" : "bg-warning",
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium tracking-tight text-ink">
                  {entry.label}
                </span>
                <span className="text-xs leading-4 text-muted">
                  {entry.detail}
                </span>
              </span>
              <span className="tnum flex-none text-[11px] text-table-head">
                {entry.ms}
              </span>
            </div>
          ))}
        </div>
      )}

      {sample.sections.map((section) => (
        <div key={section.title} className="panel">
          <div className="panel-head">
            <p className="panel-title">{section.title}</p>
          </div>
          {section.rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col gap-1 border-b border-surface px-3.5 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="flex-none font-mono text-[11px] text-muted sm:w-[190px]">
                {row.key}
              </span>
              <span
                className={cn(
                  "tnum min-w-0 flex-1 text-[13px]",
                  row.tone ? VERDICT_STYLE[row.tone].text : "text-ink",
                  row.strong && "font-medium",
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ))}

      <div>
        <p className="eyebrow eyebrow-muted mb-2.5">{sample.listTitle}</p>
        <div className="flex flex-col gap-1.5">
          {sample.items.map((item, index) => {
            const open = openRow === index;
            const tone = VERDICT_STYLE[item.tone];

            return (
              <div
                key={item.name}
                className={cn(
                  "overflow-hidden rounded-xs border bg-canvas",
                  open ? "border-subtle-gray/40" : "border-line",
                )}
              >
                <button
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-fast hover:bg-surface"
                  type="button"
                  onClick={() => setOpenRow(open ? null : index)}
                >
                  <Image
                    alt=""
                    className="size-6 flex-none rounded-pill object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                    height={24}
                    src={item.avatar}
                    width={24}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium tracking-tight text-ink">
                      {item.name}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {item.meta}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "hidden h-6 flex-none items-center rounded-pill px-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em] sm:inline-flex",
                      tone.surface,
                      tone.text,
                    )}
                  >
                    {item.tag}
                  </span>
                  <span className="tnum w-11 flex-none text-right text-[13px] font-medium text-ink">
                    {item.score}
                  </span>
                  {open ? (
                    <ChevronUp className="size-4 flex-none text-table-head" />
                  ) : (
                    <ChevronDown className="size-4 flex-none text-table-head" />
                  )}
                </button>
                {open && (
                  <div className="animate-fade-in px-3.5 pb-3.5 pl-[50px]">
                    <p className="m-0 mb-2.5 text-[13px] leading-[18px] text-muted">
                      {item.detail}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className="meta-chip h-[22px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-table-head">
          Sample payload - field names match the live{" "}
          <span className="font-mono">{responsePath}</span> response.
        </p>
      </div>
    </div>
  );
}
