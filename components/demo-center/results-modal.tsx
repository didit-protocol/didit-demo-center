"use client";

import type { Demo } from "@/lib/demos";
import type { VerdictTone } from "@/lib/demos";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Copy,
  ExternalLink,
  FileText,
  Timer,
} from "lucide-react";

import { Modal, ModalCloseButton } from "./modal";
import { VERDICT_STYLE } from "./tone";

import { cn } from "@/lib/utils";
import { DOC_LINKS } from "@/lib/docs";

type StatusView = {
  label: string;
  icon: typeof CircleCheck;
  description: string;
  tone: VerdictTone | "neutral";
};

/**
 * The states the pre-redesign callback page reported, kept verbatim so a
 * returning integrator reads the same words - Approved, Declined, Pending,
 * and an Unknown fallback that echoes whatever the hosted flow sent. "In
 * Review" is added because it is a real session status the API returns and
 * the old page folded it into Pending.
 */
const STATUS_VIEW: Record<string, StatusView> = {
  approved: {
    label: "Approved",
    icon: CircleCheck,
    description: "The identity has been successfully verified.",
    tone: "approved",
  },
  declined: {
    label: "Declined",
    icon: CircleX,
    description: "The verification could not be completed.",
    tone: "declined",
  },
  review: {
    label: "In Review",
    icon: Timer,
    description: "The verification is being reviewed before a final decision.",
    tone: "review",
  },
  pending: {
    label: "Pending",
    icon: Timer,
    description: "The verification is still being processed.",
    tone: "review",
  },
};

/** Map a raw session status onto the view above, preserving the unknown case. */
function statusView(raw: string): StatusView {
  const s = raw.trim().toLowerCase();

  if (["approved", "success", "completed"].includes(s))
    return STATUS_VIEW.approved;
  if (["declined", "rejected", "failed"].includes(s))
    return STATUS_VIEW.declined;
  if (s === "in review" || s === "in_review") return STATUS_VIEW.review;
  if (
    [
      "pending",
      "in progress",
      "in_progress",
      "processing",
      "not started",
      "not_started",
      "awaiting user",
      "resubmitted",
    ].includes(s)
  )
    return STATUS_VIEW.pending;

  return {
    // The old page showed the raw status when it did not recognise it, which
    // is the only way to debug a status the demo has not seen before.
    label: raw || "Unknown",
    icon: CircleAlert,
    description: "The verification status is unknown.",
    tone: "neutral",
  };
}

export type ResultsState = {
  sessionId: string;
  status: string;
  demo: Demo | null;
};

/**
 * The verification-results view, as a modal.
 *
 * It is the same surface for both entry points: the Didit SDK's `onComplete`
 * (which fires in place, so the catalogue never navigates away) and a return to
 * /verification/callback (which the hosted flow redirects to when the user
 * finishes on another device). Like the pre-redesign page, it reports only the
 * status the hosted flow's redirect carries - it does not fetch the session's
 * decision, so a demo visitor never sees another person's verification data.
 */
export function ResultsModal({
  state,
  open,
  onClose,
  onRunAnother,
}: {
  state: ResultsState | null;
  open: boolean;
  onClose: () => void;
  onRunAnother: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const sessionId = state?.sessionId ?? "";

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!state) return null;

  const view = statusView(state.status);
  const style = VERDICT_STYLE[view.tone];
  const StatusIcon = view.icon;

  return (
    <Modal
      label="Verification results"
      open={open}
      width="max-w-[720px]"
      z="z-[100]"
      onClose={onClose}
    >
      <div className="flex-none px-6 pt-[22px]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-2xl font-display leading-7 tracking-display text-ink">
              Verification results
            </h2>
            <p className="mt-1.5 text-[13px] leading-[18px] text-muted">
              Your verification session has been processed
              {state.demo ? ` - ${state.demo.title}` : ""}.
            </p>
          </div>
          <ModalCloseButton onClose={onClose} />
        </div>
        <div className="mb-1 mt-4 inline-flex items-center gap-2 rounded-pill bg-blue-soft px-3 py-2">
          <FileText className="size-4 flex-none text-blue-deep" />
          <p className="m-0 text-xs text-blue-deep">
            This is a demo session. In production, verification data is returned
            via webhook.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-6 pb-6 pt-5">
        <div
          className={cn(
            "flex flex-none items-center gap-3.5 rounded-xs border p-4",
            style.surface,
            style.border,
          )}
        >
          <span className="flex size-11 flex-none items-center justify-center rounded-sm bg-canvas/70">
            <StatusIcon className={cn("size-6", style.text)} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "m-0 text-base font-semibold tracking-tight",
                style.text,
              )}
            >
              Verification {view.label}
            </h3>
            <p className="mt-1 text-[13px] text-muted">{view.description}</p>
          </div>
        </div>

        <div className="flex flex-none items-center gap-4 rounded-xs border border-line p-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow eyebrow-muted mb-1.5">Session id</p>
            <p className="m-0 break-all font-mono text-xs text-ink">
              {sessionId || "—"}
            </p>
          </div>
          <button
            aria-label="Copy session id"
            className="flex size-9 flex-none items-center justify-center rounded-pill bg-surface text-muted transition-colors duration-fast hover:bg-black/[0.1] hover:text-ink"
            disabled={!sessionId}
            type="button"
            onClick={() => {
              navigator.clipboard
                ?.writeText(sessionId)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-3 border-t border-line px-6 py-4">
        <a
          className="btn-muted h-11 flex-none px-4 text-[13px]"
          href={DOC_LINKS.apiReference}
          rel="noreferrer"
          target="_blank"
        >
          API documentation
          <ExternalLink className="size-4" />
        </a>
        <span className="hidden flex-1 sm:block" />
        <button
          className="btn-muted h-11 flex-none pl-3.5 pr-[18px]"
          type="button"
          onClick={onClose}
        >
          <ArrowLeft className="size-4" />
          Back to Demo Center
        </button>
        <button
          className="btn-primary h-11 flex-none pl-[18px] pr-2.5"
          type="button"
          onClick={onRunAnother}
        >
          Run another demo
          <ArrowRight className="size-6" />
        </button>
      </div>
    </Modal>
  );
}
