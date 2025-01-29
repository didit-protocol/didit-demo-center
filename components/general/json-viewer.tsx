"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
            <span className="text-blue-600">{key}</span>
            <span className="text-gray-600">:</span>
            {value.includes('"') ? (
              <span className="text-green-600">{value}</span>
            ) : (
              <span className="text-orange-600">{value}</span>
            )}
          </span>
        );
      }
      return (
        <span key={i} className="block text-gray-800">
          {line}
        </span>
      );
    });
  };

  return (
    <Card className={cn("w-full rounded-xl overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </div>
      </CardHeader>
      <CardContent className={cn("p-6 relative bg-gray-50", contentClassName)}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-12 top-4 text-gray-500 hover:text-gray-900"
          onClick={copyToClipboard}
        >
          <Copy className="h-5 w-5" />
          <span className="sr-only">Copy JSON</span>
        </Button>
        <pre
          className={cn(
            "font-mono text-sm leading-relaxed p-4 rounded-lg overflow-auto h-full",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          )}
        >
          <code>{formatJsonWithSyntaxHighlighting(data)}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
