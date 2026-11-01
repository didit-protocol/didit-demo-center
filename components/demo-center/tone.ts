import type { VerdictTone } from "@/lib/demos";

/**
 * The three verdict tones, expressed once. Everything that shows a verdict -
 * card, row, chip, status banner - reads from here, so "Approved" is the same
 * green everywhere and semantic colour never leaks into decoration.
 */
export const VERDICT_STYLE: Record<
  VerdictTone | "neutral",
  { surface: string; border: string; text: string; dot: string; icon: string }
> = {
  approved: {
    surface: "bg-success-bg",
    border: "border-success/40",
    text: "text-success",
    dot: "bg-success",
    icon: "/icons/demo/verdict-approved.svg",
  },
  review: {
    surface: "bg-warning-bg",
    border: "border-warning/40",
    text: "text-warning",
    dot: "bg-warning",
    icon: "/icons/demo/verdict-review.svg",
  },
  declined: {
    surface: "bg-danger-bg",
    border: "border-danger/40",
    text: "text-danger",
    dot: "bg-danger",
    icon: "/icons/demo/verdict-declined.svg",
  },
  neutral: {
    surface: "bg-black/[0.05]",
    border: "border-line",
    text: "text-muted",
    dot: "bg-table-head",
    icon: "",
  },
};

/** Map a live session status string onto a verdict tone. */
export function statusTone(status: string): VerdictTone {
  const s = status.trim().toLowerCase();

  if (["approved", "success", "completed"].includes(s)) return "approved";
  if (["declined", "rejected", "failed", "expired", "abandoned"].includes(s))
    return "declined";

  return "review";
}
