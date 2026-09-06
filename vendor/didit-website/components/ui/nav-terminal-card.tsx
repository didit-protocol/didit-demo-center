"use client";

import * as React from "react";
import { Link } from "@website/i18n/navigation";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@website/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Didit v5 NavTerminalCard — animated terminal card for the
 * Developers > Quickstart slot in the navbar dropdown.
 *
 * Replaces the static gradient + icon background on the Quickstart card
 * with a looping ASCII terminal that types `$ claude` then watches a
 * Claude Code agent integrate Didit. The intent is to make "Quickstart"
 * read as IS HAPPENING NOW rather than as a static link, mirroring the
 * `code-typer` aesthetic from the home hero.
 *
 * Loop semantics: each line types char-by-char at `typeSpeed` ms/char,
 * pauses for `pause` ms when finished, then the next line begins. After
 * the final line the cycle restarts after `loopPause` ms.
 *
 * Line classification (auto-derived from the first non-space character):
 *   $ / >    -> "input"   (typed char-by-char, blinking caret while typing)
 *   #        -> "comment" (muted)
 *   ↻        -> "spinner" (rendered fully, blue accent on spinner glyph)
 *   ✓        -> "success" (rendered fully, blue checkmark)
 *   →        -> "arrow"   (rendered fully, blue accent)
 *   anything else -> "raw" (rendered fully)
 */
export interface NavTerminalLine {
  /** Line content. Prefixes "$ " "> " "# " "↻ " "✓ " "→ " auto-set kind. */
  text: string;
  /** ms to pause AFTER this line finishes before the next line starts. */
  pause?: number;
  /** Override auto-classified line kind. */
  kind?: "input" | "comment" | "spinner" | "success" | "arrow" | "raw";
}

export interface NavTerminalCardProps {
  href: string;
  external?: boolean;
  label: string;
  /** Eyebrow line under the label in the bottom CTA strip. */
  description: string;
  cta?: string;
  lines: NavTerminalLine[];
  /** ms between full-cycle restarts. Default 1800. */
  loopPause?: number;
  /** ms per typed character on input lines. Default 28. */
  typeSpeed?: number;
}

const PREFIX_KIND: Record<string, NonNullable<NavTerminalLine["kind"]>> = {
  $: "input",
  ">": "input",
  "#": "comment",
  "↻": "spinner",
  "✓": "success",
  "→": "arrow"
};

function classifyLine(line: NavTerminalLine): NavTerminalLine & {
  kind: NonNullable<NavTerminalLine["kind"]>;
} {
  if (line.kind) return { ...line, kind: line.kind };
  const head = line.text.trimStart().slice(0, 1);
  return { ...line, kind: PREFIX_KIND[head] ?? "raw" };
}

// Line colors map onto the design-system code-block dark theme tokens
// (`.dcode--dark` in globals.css): cool-white text, neon-mint strings for
// success, lifted Didit Blue keywords for arrows/accents.
const LINE_COLOR_CLASS: Record<NonNullable<NavTerminalLine["kind"]>, string> = {
  input: "text-[var(--dc-text)]",
  comment: "text-[var(--dc-com)]",
  spinner: "text-[var(--dc-punc)]",
  success: "text-[var(--dc-str)]",
  arrow: "text-[var(--dc-kw)]",
  raw: "text-[rgba(237,240,246,0.85)]"
};

export function NavTerminalCard({
  href,
  external,
  label,
  description,
  cta,
  lines,
  loopPause = 1800,
  typeSpeed = 28
}: NavTerminalCardProps) {
  const tI18n = useTranslations("translation_v1.ui.navTerminalCard");
  const enriched = React.useMemo(() => lines.map(classifyLine), [lines]);
  const [lineIdx, setLineIdx] = React.useState(0);
  const [charIdx, setCharIdx] = React.useState(0);
  const [completed, setCompleted] = React.useState<number[]>([]);
  const [cycleKey, setCycleKey] = React.useState(0);

  // Reset on cycle restart
  React.useEffect(() => {
    setLineIdx(0);
    setCharIdx(0);
    setCompleted([]);
  }, [cycleKey]);

  React.useEffect(() => {
    if (lineIdx >= enriched.length) {
      const t = setTimeout(() => setCycleKey((k) => k + 1), loopPause);
      return () => clearTimeout(t);
    }
    const cur = enriched[lineIdx];

    // Non-input lines render in one frame; just hold for `pause`.
    if (cur.kind !== "input") {
      const hold = cur.pause ?? 320;
      const t = setTimeout(() => {
        setCompleted((c) => [...c, lineIdx]);
        setLineIdx((i) => i + 1);
        setCharIdx(0);
      }, hold);
      return () => clearTimeout(t);
    }

    // Input lines type char by char.
    const targetLen = cur.text.length;
    if (charIdx < targetLen) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), typeSpeed);
      return () => clearTimeout(t);
    }
    const tail = cur.pause ?? 480;
    const t = setTimeout(() => {
      setCompleted((c) => [...c, lineIdx]);
      setLineIdx((i) => i + 1);
      setCharIdx(0);
    }, tail);
    return () => clearTimeout(t);
  }, [lineIdx, charIdx, enriched, loopPause, typeSpeed]);

  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      aria-label={label}
      data-didit-component="nav-terminal-card"
      className="group block rounded focus-visible:shadow-ring focus-visible:outline-none"
    >
      {/* !h overrides .dcode's height:100% (auto in this slot) so the card
          keeps its fixed dropdown height with the CTA strip pinned below
          the typed lines. */}
      <figure className="dcode dcode--dark relative !h-[280px] overflow-hidden transition-opacity duration-fast group-hover:opacity-95">
        {/* Header bar — design-system code-block grammar: mono uppercase
            caption + a blue step chip (no mac traffic dots, flat fills). */}
        <figcaption className="dcode__bar">
          <span className="dcode__endpoint">{tI18n("diditZsh")}</span>
          <span className="dcode__step dcode__step--blue inline-flex items-center gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--dc-kw)]" />
            {tI18n("navTerminalCard.live")}
          </span>
        </figcaption>

        {/* Code body — DS mono pane (SF Mono stack, 13px/21px) */}
        <div className="space-y-[2px] px-[18px] py-4 font-[family-name:var(--dc-mono)] text-[13px] leading-[21px]">
          {enriched.map((line, i) => {
            const isActive = i === lineIdx;
            const isDone = completed.includes(i);
            const visible = isActive || isDone;
            if (!visible) {
              return (
                <div key={i} aria-hidden className="opacity-0">
                  &nbsp;
                </div>
              );
            }

            const display =
              isDone || line.kind !== "input" ? line.text : line.text.slice(0, charIdx);

            return (
              <div key={i} className={cn("transition-opacity", LINE_COLOR_CLASS[line.kind])}>
                <span>{display || " "}</span>
                {isActive && line.kind === "input" && charIdx < line.text.length && (
                  <span
                    aria-hidden
                    className="ml-[1px] inline-block h-[0.9em] w-[6px] translate-y-[0.1em] animate-caret-blink bg-[var(--dc-kw)]"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* CTA strip pinned to bottom — DS foot grammar: hairline divider on
            the flat dark surface (no translucency / backdrop blur). */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-[var(--dc-line)] bg-[var(--dc-bar)] px-[18px] py-3">
          <span className="flex flex-col">
            <span className="font-display text-[15px] font-medium leading-tight tracking-[-0.015em] text-[var(--dc-text)]">
              {label}
            </span>
            <span className="mt-0.5 font-[family-name:var(--dc-mono)] text-[10.5px] uppercase tracking-[0.14em] text-[rgba(237,240,246,0.55)]">
              {description}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--dc-text)] transition-transform duration-fast group-hover:translate-x-0.5">
            {cta ?? label}
            <ArrowUpRight className="size-4 opacity-90" />
          </span>
        </div>
      </figure>
    </Link>
  );
}
