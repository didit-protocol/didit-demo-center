"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, Play, Terminal } from "lucide-react";

import { Modal, ModalCloseButton } from "./modal";

import { type Demo, requestDocsUrl } from "@/lib/demos";
import { cn } from "@/lib/utils";

type ApiState = "idle" | "loading" | "done";

/**
 * The playground for demos with no hosted flow (KYB, UBO, transaction
 * monitoring, wallet screening, standalone AML, face search, IP analysis).
 *
 * It shows the REAL request - the documented endpoint, headers and body - and
 * replays a FIXTURE response. Nothing is sent and nothing is billed, which the
 * header says out loud so no one mistakes the trace for a live run.
 */
export function ApiPlaygroundModal({
  demo,
  open,
  onClose,
  onOpenSample,
}: {
  demo: Demo | null;
  open: boolean;
  onClose: () => void;
  onOpenSample: () => void;
}) {
  const [state, setState] = React.useState<ApiState>("idle");
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!open) setState("idle");
  }, [open, demo]);

  React.useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  if (!demo || !demo.request) return null;

  const request = demo.request;

  const send = () => {
    setState("loading");
    timerRef.current = window.setTimeout(() => setState("done"), 900);
  };

  return (
    <Modal
      label={`${demo.title} API playground`}
      open={open}
      width="max-w-[1000px]"
      z="z-[90]"
      onClose={onClose}
    >
      <div className="flex flex-none items-center gap-3 border-b border-line px-5 py-4">
        <span className="flex size-9 flex-none items-center justify-center rounded-xs bg-surface">
          <Image
            alt=""
            className="size-5"
            height={20}
            src={demo.icon}
            width={20}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-base font-semibold tracking-tight text-ink">
            {demo.title} · API playground
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
            {request.method} {request.url}
          </p>
        </div>
        <span className="hidden flex-none items-center rounded-pill bg-warning-bg px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-warning sm:inline-flex">
          Fixture · nothing billed
        </span>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className="grid flex-1 overflow-y-auto lg:grid-cols-2">
        <div className="flex flex-col gap-3 border-b border-line p-5 lg:border-b-0 lg:border-r">
          <p className="eyebrow eyebrow-muted">Request</p>
          <div className="flex flex-col gap-1.5 rounded-xs border border-line bg-surface px-2.5 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-5 flex-none items-center rounded-2xs px-1.5 font-mono text-[9px] font-medium tracking-[0.16em] text-canvas",
                  request.method === "GET" ? "bg-ink" : "bg-blue",
                )}
              >
                {request.method}
              </span>
              <span className="break-all font-mono text-[11px] leading-4 text-ink">
                {request.url}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted">
              x-api-key: $DIDIT_API_KEY
            </span>
          </div>

          {request.body ? (
            <pre className="code-block rounded-xs border border-line bg-canvas text-ink">
              {request.body}
            </pre>
          ) : (
            <div className="rounded-xs border border-dashed border-subtle-gray/50 bg-surface p-3.5">
              <p className="m-0 font-mono text-[11px] text-muted">
                No request body · read-only call
              </p>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              className="btn-primary h-10 pl-4 pr-2.5"
              disabled={state === "loading"}
              type="button"
              onClick={send}
            >
              Send request
              <Play className="size-[18px]" />
            </button>
            <button
              className="btn-muted h-10 px-3.5 text-[13px]"
              type="button"
              onClick={() => setState("idle")}
            >
              Reset
            </button>
          </div>

          <p className="m-0 text-[11px] leading-4 text-table-head">
            {request.note}{" "}
            <a
              className="text-blue"
              href={requestDocsUrl(request)}
              rel="noreferrer"
              target="_blank"
            >
              docs.didit.me/{request.docsPath}
            </a>
          </p>
        </div>

        <div className="flex min-h-[280px] flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <p className="eyebrow eyebrow-muted flex-1">Response</p>
            {state === "done" && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
                <span className="size-1.5 rounded-pill bg-success" />
                200 OK · fixture
              </span>
            )}
          </div>

          {state === "idle" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-subtle-gray/50 bg-surface p-6 text-center">
              <Terminal className="size-5 text-table-head" />
              <p className="m-0 text-[13px] font-medium text-muted">
                Send the request to see the decision
              </p>
              <p className="m-0 max-w-[260px] text-[11px] text-table-head">
                The response is a fixture. No screening, monitoring or
                verification is actually performed.
              </p>
            </div>
          )}

          {state === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xs border border-line p-6">
              <span className="size-6 animate-spin rounded-pill border-4 border-elevated border-t-muted" />
              <p className="m-0 text-[13px] font-medium text-muted">
                Replaying the fixture…
              </p>
            </div>
          )}

          {state === "done" && (
            <div className="flex flex-col gap-3">
              <pre className="code-block rounded-xs bg-ink text-elevated">
                {demo.response}
              </pre>
              {demo.trace && (
                <div className="panel">
                  <div className="panel-head">
                    <p className="panel-title">What the platform did</p>
                  </div>
                  {demo.trace.map((entry) => (
                    <div
                      key={entry.label}
                      className="flex gap-2.5 border-b border-surface px-3 py-2.5 last:border-b-0"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 flex-none rounded-pill",
                          entry.ok ? "bg-success" : "bg-warning",
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-xs font-medium text-ink">
                          {entry.label}
                        </span>
                        <span className="text-[11px] leading-4 text-muted">
                          {entry.detail}
                        </span>
                      </span>
                      <span className="tnum flex-none font-mono text-[10px] text-table-head">
                        {entry.ms}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {demo.sample && (
                <button
                  className="btn-dark h-10 px-4 text-[13px]"
                  type="button"
                  onClick={onOpenSample}
                >
                  Open the full sample decision
                  <ArrowRight className="size-[18px]" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
