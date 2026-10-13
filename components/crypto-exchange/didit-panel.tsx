"use client";

import type { PanelStep, PanelStepId } from "@/lib/crypto-exchange/panel";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink, X } from "lucide-react";

import { docs } from "@/lib/docs";
import { PANEL_STEPS } from "@/lib/crypto-exchange/panel";
import { cn } from "@/lib/utils";

const SIDE_LABEL = { server: "Backend", browser: "Browser", didit: "Didit" } as const;

function StepBody({ step }: { step: PanelStep }) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <p className="m-0 text-[13px] leading-5 text-muted">{step.summary}</p>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {step.modules.map((module) => (
          <li
            key={module.label}
            className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-blue-soft py-0 pl-1.5 pr-2.5 text-xs font-medium text-blue-deep"
          >
            <Image
              alt=""
              className="kestrel-icon size-4"
              height={16}
              src={module.icon}
              width={16}
            />
            {module.label}
          </li>
        ))}
      </ul>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {step.calls.map((call) => (
          <li key={call.label}>
            <a
              className="group flex flex-col gap-1 rounded-sm border border-line bg-canvas px-3 py-2.5 transition-colors duration-fast hover:border-blue/40"
              href={docs(call.docsPath)}
              rel="noreferrer"
              target="_blank"
            >
              <span className="flex items-center gap-2">
                <span className="rounded-2xs bg-elevated px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                  {SIDE_LABEL[call.side]}
                </span>
                <code className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                  {call.label}
                </code>
                <ExternalLink className="size-3.5 flex-none text-muted transition-colors group-hover:text-blue" />
              </span>
              <span className="text-[12px] leading-[18px] text-muted">{call.detail}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepList({ active }: { active: PanelStepId }) {
  const [open, setOpen] = React.useState<PanelStepId>(active);

  // Follow the user through the app; a manual pick stays until they move on.
  React.useEffect(() => setOpen(active), [active]);

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {PANEL_STEPS.map((step, index) => {
        const expanded = open === step.id;

        return (
          <li
            key={step.id}
            className={cn(
              "rounded-md border bg-surface transition-colors duration-fast",
              step.id === active ? "border-blue/50" : "border-line",
            )}
            data-active={step.id === active || undefined}
          >
            <button
              aria-expanded={expanded}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              type="button"
              onClick={() => setOpen(step.id)}
            >
              <span
                className={cn(
                  "flex size-6 flex-none items-center justify-center rounded-pill text-xs font-semibold tnum",
                  step.id === active ? "bg-blue text-white" : "bg-elevated text-muted",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                {step.title}
              </span>
              {step.id === active && (
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-blue">
                  Now
                </span>
              )}
              <ChevronDown
                className={cn(
                  "size-4 flex-none text-muted transition-transform duration-fast",
                  expanded && "rotate-180",
                )}
              />
            </button>
            {expanded && <StepBody step={step} />}
          </li>
        );
      })}
    </ol>
  );
}

function PanelHeader() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="eyebrow eyebrow-accent">How this uses Didit</p>
      <p className="m-0 text-[13px] leading-5 text-muted">
        Every step below is a real call to the Didit API, linked to its docs
        page.
      </p>
    </div>
  );
}

/** The side panel on desktop, a bottom sheet behind a button on smaller screens. */
export function DiditPanel({ active }: { active: PanelStepId }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <>
      <aside
        aria-label="How this uses Didit"
        className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4"
      >
        <PanelHeader />
        <StepList active={active} />
      </aside>

      <button
        className="fixed bottom-4 left-1/2 z-[60] inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-canvas shadow-lg lg:hidden"
        type="button"
        onClick={() => setSheetOpen(true)}
      >
        How this uses Didit
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-[70] flex items-end lg:hidden">
          <button
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-black/50"
            tabIndex={-1}
            type="button"
            onClick={() => setSheetOpen(false)}
          />
          <div
            aria-label="How this uses Didit"
            aria-modal="true"
            className="relative flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-lg border-t border-line bg-canvas p-5 pb-8 text-ink"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <PanelHeader />
              </div>
              <button
                aria-label="Close"
                className="flex size-9 flex-none items-center justify-center rounded-pill bg-elevated text-muted"
                type="button"
                onClick={() => setSheetOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <StepList active={active} />
          </div>
        </div>
      )}
    </>
  );
}
