"use client";

import { DemoCard } from "./demo-card";

import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type Demo,
  type DemoCategory,
} from "@/lib/demos";

export function DemoGrid({
  demos,
  query,
  onOpen,
}: {
  demos: Demo[];
  query: string;
  onOpen: (demo: Demo) => void;
}) {
  const groups = CATEGORY_ORDER.map((category: DemoCategory) => ({
    category,
    items: demos.filter((demo) => demo.category === category),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-subtle-gray/50 p-12 text-center">
        <p className="m-0 text-[15px] font-medium text-ink">
          No demo matches “{query}”.
        </p>
        <p className="mt-2 text-[13px] text-muted">
          Try “liveness”, “UBO”, “wallet” - or compose your own flow in the
          workflow builder.
        </p>
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.category} className="mb-10">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="m-0 text-[15px] font-semibold tracking-tight text-ink">
              {CATEGORY_META[group.category].title}
            </h2>
            <span aria-hidden className="h-px flex-1 bg-line" />
            <span className="hidden text-xs text-muted sm:inline">
              {CATEGORY_META[group.category].meta}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((demo) => (
              <DemoCard key={demo.id} demo={demo} onOpen={() => onOpen(demo)} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
