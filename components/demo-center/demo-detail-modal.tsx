"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, Check, Copy, Info, Loader2, Upload } from "lucide-react";

import { CodeBlock } from "./code-block";
import { Modal, ModalCloseButton } from "./modal";
import { SampleDecisionView } from "./sample-decision";

import { cn } from "@/lib/utils";
import {
  type Demo,
  demoDocsUrl,
  requestDocsUrl,
  snippetFor,
} from "@/lib/demos";

type Tab = "overview" | "result" | "code";

const LANGUAGES = [
  { key: "curl", label: "cURL" },
  { key: "node", label: "Node" },
];

type DemoDetailModalProps = {
  demo: Demo | null;
  onClose: () => void;
  /** Hosted demos: create a real session and hand it to the Didit SDK modal. */
  onStart: (demo: Demo, portraitImage?: string) => void;
  isStarting: boolean;
  startError: string | null;
};

export function DemoDetailModal({
  demo,
  onClose,
  onStart,
  isStarting,
  startError,
}: DemoDetailModalProps) {
  const [tab, setTab] = React.useState<Tab>("overview");
  const [language, setLanguage] = React.useState<"curl" | "node">("curl");
  const [copiedId, setCopiedId] = React.useState(false);
  const [portrait, setPortrait] = React.useState<string | null>(null);
  const [portraitName, setPortraitName] = React.useState<string | null>(null);
  const [portraitError, setPortraitError] = React.useState<string | null>(null);

  // A new demo starts on its most interesting tab: API demos lead with the
  // sample decision, hosted demos with how the flow works.
  React.useEffect(() => {
    if (!demo) return;
    setTab(demo.sample ? "result" : "overview");
    setCopiedId(false);
    setPortrait(null);
    setPortraitName(null);
    setPortraitError(null);
  }, [demo]);

  React.useEffect(() => {
    if (!copiedId) return;
    const timer = window.setTimeout(() => setCopiedId(false), 2000);

    return () => window.clearTimeout(timer);
  }, [copiedId]);

  if (!demo) return null;

  const isApi = demo.mode === "api";
  const workflowLabel = demo.workflowId ?? "not published on this environment";
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    ...(demo.sample
      ? [{ key: "result" as Tab, label: "Sample decision" }]
      : []),
    { key: "code", label: "Integrate" },
  ];

  const readPortrait = (file: File) => {
    // The session endpoint takes a base64 portrait up to 2 MB.
    if (file.size > 2 * 1024 * 1024) {
      setPortraitError("That image is over 2 MB - pick a smaller one.");

      return;
    }
    const reader = new FileReader();

    reader.onload = () => {
      setPortrait(String(reader.result));
      setPortraitName(file.name);
      setPortraitError(null);
    };
    reader.onerror = () => setPortraitError("That file could not be read.");
    reader.readAsDataURL(file);
  };

  const startBlocked =
    demo.mode === "hosted" &&
    (!demo.workflowId || (demo.requiresPortrait && !portrait));

  return (
    <Modal
      label={`${demo.title} demo`}
      open={Boolean(demo)}
      width="max-w-[840px]"
      onClose={onClose}
    >
      <div className="flex-none px-6 pt-6">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 flex-none items-center justify-center rounded-sm bg-surface">
            <Image
              alt=""
              className="size-6"
              height={24}
              src={demo.icon}
              width={24}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-2xl font-display leading-7 tracking-display text-ink">
                {demo.title}
              </h2>
              <span
                className={cn(
                  "mode-chip",
                  isApi ? "mode-chip-api" : "mode-chip-hosted",
                )}
              >
                {isApi ? "API demo" : "Hosted flow"}
              </span>
            </div>
            <p className="mt-2 max-w-[600px] text-[13px] leading-[18px] text-muted">
              {demo.longDescription}
            </p>
            {!isApi && (
              <div className="mt-3 inline-flex max-w-full flex-wrap items-center gap-2 rounded-sm border border-line bg-surface p-1.5 sm:rounded-pill sm:py-1 sm:pl-2.5 sm:pr-1.5">
                <span className="eyebrow eyebrow-muted">Workflow id</span>
                <span className="truncate font-mono text-[11px] text-ink">
                  {workflowLabel}
                </span>
                {demo.workflowId && (
                  <button
                    className="inline-flex h-[22px] items-center gap-1.5 rounded-pill bg-canvas px-2.5 text-[11px] font-medium text-muted shadow-sm transition-colors duration-fast hover:text-ink"
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(demo.workflowId as string)
                        .then(() => setCopiedId(true))
                        .catch(() => setCopiedId(false));
                    }}
                  >
                    {copiedId ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedId ? "Copied" : "Copy id"}
                  </button>
                )}
              </div>
            )}
            {demo.note && (
              <p className="mt-2 text-[11px] text-table-head">{demo.note}</p>
            )}
          </div>
          <ModalCloseButton onClose={onClose} />
        </div>

        <div className="mt-5 grid grid-cols-1 overflow-hidden rounded-xs border border-line sm:grid-cols-3">
          {demo.stats.map((stat) => (
            <div
              key={stat.label}
              className="border-b border-line px-3.5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <p className="tnum m-0 text-base font-medium tracking-tight text-ink">
                {stat.value}
              </p>
              <p className="eyebrow eyebrow-muted mt-1.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-0.5 border-b border-line">
          {tabs.map((entry) => (
            <button
              key={entry.key}
              className={cn(
                "px-3 py-2.5 text-[13px] font-medium tracking-tight transition-colors duration-fast",
                tab === entry.key
                  ? "text-ink shadow-[inset_0_-2px_0_0_rgb(var(--ink))]"
                  : "text-muted hover:text-ink",
              )}
              type="button"
              onClick={() => setTab(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="eyebrow eyebrow-muted mb-3">How it works</p>
              <div className="flex flex-col gap-2">
                {demo.steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-3 rounded-xs border border-line bg-surface p-3.5"
                  >
                    <span className="tnum flex size-6 flex-none items-center justify-center rounded-pill bg-blue text-xs font-medium text-canvas">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-medium tracking-tight text-ink">
                        {step.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-[18px] text-muted">
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow eyebrow-muted mb-3">Modules included</p>
              <div className="flex flex-wrap gap-1.5">
                {demo.modules.map((module) => (
                  <span key={module.label} className="module-chip">
                    <Image
                      alt=""
                      className="size-4"
                      height={16}
                      src={module.icon}
                      width={16}
                    />
                    {module.label}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow eyebrow-muted mb-3">Best for</p>
              <p className="m-0 mb-2.5 text-sm leading-5 text-ink">
                {demo.bestFor}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {demo.useCases.map((useCase) => (
                  <span key={useCase} className="meta-chip h-7">
                    {useCase}
                  </span>
                ))}
              </div>
            </div>

            {demo.requiresPortrait && (
              <div>
                <p className="eyebrow eyebrow-muted mb-3">Reference photo</p>
                <div className="rounded-xs border border-dashed border-subtle-gray/50 bg-surface p-4">
                  <p className="m-0 text-[13px] leading-[18px] text-muted">
                    Biometric authentication matches a fresh selfie against a
                    face you already hold, so the session needs one before it
                    can open. Pick a clear, front-facing photo (JPEG, PNG or
                    WebP, up to 2 MB) - it is sent straight to the session
                    endpoint as{" "}
                    <span className="font-mono">portrait_image</span> and never
                    stored by this page.
                  </p>
                  <label className="btn-outline mt-3 h-9 cursor-pointer px-3.5 text-[13px]">
                    <Upload className="size-4" />
                    {portraitName ? "Choose another photo" : "Choose a photo"}
                    <input
                      accept="image/jpeg,image/png,image/webp,image/tiff"
                      className="sr-only"
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) readPortrait(file);
                      }}
                    />
                  </label>
                  {portraitName && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
                      <Check className="size-3.5" />
                      {portraitName}
                    </p>
                  )}
                  {portraitError && (
                    <p className="mt-2 text-xs text-danger">{portraitError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "result" && demo.sample && (
          <SampleDecisionView
            responsePath={
              demo.request?.method === "POST" &&
              demo.request.url.includes("/v3/")
                ? new URL(demo.request.url).pathname
                : "/v3/session/{id}/decision/"
            }
            sample={demo.sample}
            trace={demo.trace}
          />
        )}

        {tab === "code" && (
          <div className="flex flex-col gap-4">
            <CodeBlock
              activeLanguage={language}
              code={snippetFor(demo, language)}
              languages={LANGUAGES}
              title={isApi ? "Call the API" : "Create the session"}
              onLanguageChange={(key) => setLanguage(key as "curl" | "node")}
            />
            <CodeBlock
              code={demo.response}
              title="Decision response · trimmed"
              tone="dark"
            />
            <div className="flex items-start gap-2.5 rounded-xs bg-blue-soft p-3.5">
              <Info className="mt-px size-4 flex-none text-blue-deep" />
              <p className="m-0 text-xs leading-4 text-blue-deep">
                Every hosted flow uses{" "}
                <span className="font-mono">POST /v3/session/</span> with{" "}
                <span className="font-mono">x-api-key</span> - only{" "}
                <span className="font-mono">workflow_id</span> changes, and KYB
                returns{" "}
                <span className="font-mono">session_kind: business</span>.
                Standalone modules are separate server-to-server endpoints,
                priced outside the workflow free tier.
              </p>
            </div>
            {demo.request && (
              <p className="m-0 text-[11px] leading-4 text-table-head">
                {demo.request.note}{" "}
                <a
                  className="text-blue"
                  href={requestDocsUrl(demo.request)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Read the endpoint reference
                </a>
                .
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-none flex-wrap items-center gap-3 border-t border-line bg-canvas px-6 py-4">
        <span className="hidden min-w-0 flex-1 truncate font-mono text-[11px] text-table-head sm:block">
          {isApi ? demo.request?.url : `workflow_id ${workflowLabel}`}
        </span>
        {startError && (
          <p className="w-full text-xs text-danger sm:w-auto sm:flex-1">
            {startError}
          </p>
        )}
        <a
          className="btn-muted h-11 flex-none px-[18px]"
          href={demoDocsUrl(demo)}
          rel="noreferrer"
          target="_blank"
        >
          Docs
        </a>
        <button
          className="btn-primary h-11 flex-none pl-[18px] pr-2.5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={startBlocked || isStarting}
          title={
            startBlocked && demo.requiresPortrait && !portrait
              ? "Choose a reference photo first"
              : startBlocked
                ? "This workflow is not published on this environment yet"
                : undefined
          }
          type="button"
          onClick={() => onStart(demo, portrait ?? undefined)}
        >
          {isStarting
            ? "Creating session…"
            : isApi
              ? "Open API playground"
              : "Start demo"}
          {isStarting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ArrowRight className="size-6" />
          )}
        </button>
      </div>
    </Modal>
  );
}
