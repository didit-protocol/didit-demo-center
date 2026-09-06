"use client";

import { Search } from "lucide-react";
import { Container } from "@website/components/ui/container";

import { CATEGORY_META, CATEGORY_ORDER, type DemoCategory } from "@/lib/demos";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  category: DemoCategory | "All";
  onCategoryChange: (category: DemoCategory | "All") => void;
  counts: Record<DemoCategory | "All", number>;
  query: string;
  onQueryChange: (query: string) => void;
};

export function FilterBar({
  category,
  onCategoryChange,
  counts,
  query,
  onQueryChange,
}: FilterBarProps) {
  const chips: { key: DemoCategory | "All"; label: string }[] = [
    { key: "All", label: "All demos" },
    ...CATEGORY_ORDER.map((key) => ({ key, label: CATEGORY_META[key].label })),
  ];

  return (
    // Sits directly under the vendored chrome, which is itself sticky. Its
    // height is not a constant - the announcement bar is dismissible and the
    // navbar reflows on small screens - so the offset comes from
    // `--site-header-bottom`, the custom property the chrome's own
    // navbar-measurement.ts keeps up to date on <html>. The fallback is the
    // announcement bar + navbar at desktop, for the first paint before the
    // measurement lands.
    <section
      className="sticky z-40 border-b border-line bg-canvas/90 backdrop-blur-[12px]"
      style={{ top: "var(--site-header-bottom, 104px)" }}
    >
      <Container className="flex flex-wrap items-center gap-4 py-3.5" size="xl">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {chips.map((chip) => {
            const active = category === chip.key;

            return (
              <button
                key={chip.key}
                aria-pressed={active}
                className={cn(
                  "filter-chip",
                  active ? "filter-chip-on" : "filter-chip-off",
                )}
                type="button"
                onClick={() => onCategoryChange(chip.key)}
              >
                {chip.label}
                <span
                  className={cn(
                    "tnum text-[11px]",
                    active ? "text-canvas/60" : "text-table-head",
                  )}
                >
                  {counts[chip.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex h-9 w-full flex-none items-center gap-2 rounded-sm border border-line bg-canvas px-3 focus-within:border-blue sm:w-[260px]">
          <Search aria-hidden className="size-4 flex-none text-muted" />
          <input
            data-demo-search
            aria-label="Search demos"
            className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-table-head"
            placeholder="Search modules, e.g. UBO"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
      </Container>
    </section>
  );
}
