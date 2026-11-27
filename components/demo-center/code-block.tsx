"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CodeBlockProps = {
  title: string;
  code: string;
  /** Dark panels are used for responses, light ones for requests. */
  tone?: "light" | "dark";
  /** Optional language switcher rendered in the header. */
  languages?: { key: string; label: string }[];
  activeLanguage?: string;
  onLanguageChange?: (key: string) => void;
  className?: string;
};

export function CodeBlock({
  title,
  code,
  tone = "light",
  languages,
  activeLanguage,
  onLanguageChange,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard unavailable (insecure origin, denied permission). The code is
      // on screen and selectable, so there is nothing to recover.
    }
  };

  return (
    <div className={cn("panel", className)}>
      <div className="flex items-center gap-2.5 border-b border-line bg-surface py-2 pl-3.5 pr-2.5">
        <p className="panel-title flex-1">{title}</p>
        {languages?.map((language) => (
          <button
            key={language.key}
            className={cn(
              "h-6 rounded-pill px-2.5 text-[11px] font-medium transition-colors duration-fast",
              activeLanguage === language.key
                ? "bg-ink text-canvas"
                : "text-muted hover:bg-black/[0.06]",
            )}
            type="button"
            onClick={() => onLanguageChange?.(language.key)}
          >
            {language.label}
          </button>
        ))}
        <button
          className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-black/[0.04] px-2.5 text-[11px] font-medium text-muted transition-colors duration-fast hover:bg-black/[0.1] hover:text-ink"
          type="button"
          onClick={copy}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className={cn(
          "code-block",
          tone === "dark" ? "bg-ink text-elevated" : "bg-canvas text-ink",
        )}
      >
        {code}
      </pre>
    </div>
  );
}
