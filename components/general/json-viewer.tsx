"use client";

import { useState } from "react";
import { Copy, Check, Code2, ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface JsonViewerProps {
  title: string;
  data: any;
  className?: string;
  contentClassName?: string;
}

export function JsonViewer({
  title,
  data,
  className,
  contentClassName,
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJsonWithSyntaxHighlighting = (obj: any) => {
    const json = JSON.stringify(obj, null, 2);

    return json.split("\n").map((line, i) => {
      if (line.includes(":")) {
        const [key, ...rest] = line.split(":");
        const value = rest.join(":");

        return (
          <span key={i} className="block">
            <span className="text-accent">{key}</span>
            <span className="text-dusty-gray">:</span>
            {value.includes('"') ? (
              <span className="text-green-600">{value}</span>
            ) : value.includes("true") || value.includes("false") ? (
              <span className="text-purple-600">{value}</span>
            ) : value.includes("null") ? (
              <span className="text-dusty-gray">{value}</span>
            ) : (
              <span className="text-amber-600">{value}</span>
            )}
          </span>
        );
      }

      return (
        <span key={i} className="block text-graphite-gray">
          {line}
        </span>
      );
    });
  };

  return (
    <div className={cn("card-base overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-label-lg text-app-black hover:text-accent transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-dusty-gray" />
          ) : (
            <ChevronRight className="h-4 w-4 text-dusty-gray" />
          )}
          <Code2 className="h-4 w-4 text-accent" />
          <span>{title}</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-label-sm text-dusty-gray">
            {new Date().toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </span>
          <button
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              copied
                ? "bg-green-100 text-green-600"
                : "text-dusty-gray hover:bg-gray-100 hover:text-app-black"
            )}
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">{copied ? "Copied" : "Copy JSON"}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className={cn("pt-4", contentClassName)}>
          <pre
            className={cn(
              "font-mono text-[13px] leading-relaxed p-4 rounded-xl overflow-auto",
              "bg-gray-50 border border-gray-100",
              "max-h-[500px] custom-scrollbar",
            )}
          >
            <code>{formatJsonWithSyntaxHighlighting(data)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
