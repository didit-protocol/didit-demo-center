"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Code, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Collapsible, syntax-highlighted decision payload.
 *
 * Highlighting is line-based on purpose: the payload is already pretty-printed
 * JSON, so splitting on the first colon is enough to colour keys, strings,
 * booleans and nulls without pulling a tokenizer into the bundle.
 */
function colourFor(value: string): string {
  if (value.includes('"')) return "text-success";
  if (/\b(true|false)\b/.test(value)) return "text-blue-deep";
  if (value.includes("null")) return "text-table-head";
  if (value.trim() === "{" || value.trim() === "[") return "text-muted";

  return "text-warning";
}

export function DecisionJson({
  json,
  endpoint,
  loading = false,
  error,
}: {
  json: string;
  endpoint: string;
  loading?: boolean;
  error?: string | null;
}) {
  const [open, setOpen] = React.useState(true);

  const lines = React.useMemo(
    () =>
      json.split("\n").map((line) => {
        const index = line.indexOf(":");

        if (index === -1)
          return { key: line, sep: "", value: "", tone: "text-muted" };

        return {
          key: line.slice(0, index),
          sep: ":",
          value: line.slice(index + 1),
          tone: colourFor(line.slice(index + 1)),
        };
      }),
    [json],
  );

  return (
    <div className="panel flex-none">
      <div className="flex items-center gap-2.5 border-b border-line bg-surface px-3.5 py-2.5">
        <button
          aria-expanded={open}
          className="flex flex-1 items-center justify-start gap-2 text-[13px] font-medium text-ink"
          type="button"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="size-4 text-table-head" />
          ) : (
            <ChevronRight className="size-4 text-table-head" />
          )}
          <Code className="size-4 text-blue" />
          Session decision
        </button>
        <span className="hidden font-mono text-[10px] text-table-head sm:inline">
          {endpoint}
        </span>
      </div>
      {open && (
        <div className="max-h-[320px] overflow-auto bg-canvas p-4 font-mono text-xs leading-5">
          {loading ? (
            <p className="m-0 flex items-center gap-2 text-muted">
              <Loader2 className="size-3.5 animate-spin" />
              Fetching the decision…
            </p>
          ) : error ? (
            <p className="m-0 text-danger">{error}</p>
          ) : (
            lines.map((line, index) => (
              // Line order is the payload's own order and never reshuffles, so
              // the index is a stable key here.
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className="whitespace-pre">
                <span className="text-blue">{line.key}</span>
                <span className="text-table-head">{line.sep}</span>
                <span className={cn(line.tone)}>{line.value}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
