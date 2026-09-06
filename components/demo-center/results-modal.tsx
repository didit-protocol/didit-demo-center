"use client";

import type { Demo } from "@/lib/demos";

import * as React from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Copy,
  ExternalLink,
  FileText,
  Timer,
} from "lucide-react";

import { DecisionJson } from "./decision-json";
import { Modal, ModalCloseButton } from "./modal";
import { statusTone, VERDICT_STYLE } from "./tone";

import { cn } from "@/lib/utils";
import { DOC_LINKS } from "@/lib/docs";

const STATUS_COPY: Record<
  string,
  { label: string; icon: typeof CircleCheck; description: string }
> = {
  approved: {
    label: "Approved",
    icon: CircleCheck,
    description: "The identity has been successfully verified.",
  },
  declined: {
    label: "Declined",
    icon: CircleX,
    description: "The verification could not be completed.",
  },
  review: {
    label: "In Review",
    icon: Timer,
    description: "The verification is still being processed.",
  },
};

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
 * finishes on another device). The decision itself is fetched from this app's
 * own /api/verification route, so what you read here is the real payload for a
 * real session - not a fixture.
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
  const [decision, setDecision] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sessionId = state?.sessionId ?? "";

  React.useEffect(() => {
    if (!open || !sessionId) return;

    let cancelled = false;

    setLoading(true);
    setError(null);
    fetch(`/api/verification?sessionId=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const data = await response.json();

        if (cancelled) return;
        if (!response.ok) {
          setError(
            data?.error ??
              "The decision could not be fetched for this session yet.",
          );
          setDecision("");

          return;
        }
        setDecision(JSON.stringify(data, null, 2));
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "The decision could not be fetched - check your connection.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!state) return null;

  const tone = statusTone(state.status);
  const style = VERDICT_STYLE[tone];
  const copy = STATUS_COPY[tone];
  const StatusIcon = copy.icon;

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
        <div className="mt-3.5 inline-flex items-center gap-2 rounded-pill bg-blue-soft px-3 py-2">
          <FileText className="size-4 flex-none text-blue-deep" />
          <p className="m-0 text-xs text-blue-deep">
            This is a demo session. In production, verification data is returned
            via webhook.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-6 pb-6 pt-4.5">
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
              Verification {copy.label}
            </h3>
            <p className="mt-1 text-[13px] text-muted">{copy.description}</p>
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

        <DecisionJson
          endpoint="GET /v3/session/{id}/decision/"
          error={error}
          json={decision}
          loading={loading}
        />
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
          className="btn-muted h-11 flex-none px-[18px]"
          type="button"
          onClick={onClose}
        >
          Close
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
