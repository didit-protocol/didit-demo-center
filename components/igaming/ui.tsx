import type { Tone } from "@/lib/igaming/policy";

import * as React from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The few pieces every Aurora Play screen shares. Colours are design-system
 * tokens only, so they follow the demo's light and dark themes.
 */

export const TONE_STYLE: Record<
  Tone,
  { surface: string; text: string; dot: string }
> = {
  approved: { surface: "bg-success-bg", text: "text-success", dot: "bg-success" },
  review: { surface: "bg-warning-bg", text: "text-warning", dot: "bg-warning" },
  declined: { surface: "bg-danger-bg", text: "text-danger", dot: "bg-danger" },
  info: { surface: "bg-blue-soft", text: "text-blue-deep", dot: "bg-blue" },
  neutral: { surface: "bg-surface", text: "text-muted", dot: "bg-table-head" },
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const style = TONE_STYLE[tone];

  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-xs font-medium",
        style.surface,
        style.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-pill", style.dot)} />
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      aria-hidden
      className={cn("size-4 animate-spin", className)}
    />
  );
}

export function SectionHead({
  label,
  title,
  action,
}: {
  label?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        {label ? <p className="ig-label mb-2">{label}</p> : null}
        <h3 className="m-0 text-base font-semibold tracking-tight text-ink">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

/** A Didit module glyph from public/icons, inverted on the dark theme. */
export function Glyph({ src, className }: { src: string; className?: string }) {
  return (
    <Image
      alt=""
      className={cn("ig-glyph size-4", className)}
      height={16}
      src={src}
      width={16}
    />
  );
}

export function Notice({
  tone,
  children,
  action,
}: {
  tone: Tone;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const style = TONE_STYLE[tone];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xs px-3.5 py-3 text-[13px] leading-5",
        style.surface,
        style.text,
      )}
      role={tone === "declined" ? "alert" : "status"}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}
