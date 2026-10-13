"use client";

import type { PaymentWithLink, VerificationView } from "./api";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown, Layers, X } from "lucide-react";

import { Chip, useMoney, type Tone } from "./ui";

import { docs } from "@/lib/docs";
import { REVIEW_RULE, REVIEW_THRESHOLD, type CheckStatus } from "@/lib/fintech/model";
import { MODULE_DOCS, STEPS, type StepKey } from "@/lib/fintech/steps";
import { cn } from "@/lib/utils";

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-success-bg text-success",
  POST: "bg-blue-soft text-blue-deep",
  SDK: "bg-elevated text-ink",
  WEBHOOK: "bg-warning-bg text-warning",
};

const RAW_TONE: Record<string, Tone> = {
  approved: "approved",
  in_review: "review",
  "in review": "review",
  declined: "declined",
};

/** A raw Didit status, shown verbatim the way the console shows it. */
function RawStatus({ status }: { status: string }) {
  const tone = RAW_TONE[status.trim().toLowerCase()] ?? "neutral";

  return <Chip tone={tone}>{status || "-"}</Chip>;
}

const CHECK_TONE: Record<CheckStatus, Tone> = {
  pending: "neutral",
  passed: "approved",
  review: "review",
  failed: "declined",
};

function ConsoleLink({
  href,
  home,
  record,
}: {
  href: string | null;
  home: string;
  record: string;
}) {
  const t = useTranslations("Fintech");

  if (href) {
    return (
      <a
        className="inline-flex items-center gap-1 text-[13px] font-medium text-blue hover:text-blue-deep"
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {t("operator.open")}
        <ArrowUpRight aria-hidden className="size-3.5" />
      </a>
    );
  }

  return (
    <p className="m-0 text-xs leading-[16px] text-muted">
      <a
        className="inline-flex items-center gap-1 font-medium text-blue hover:text-blue-deep"
        href={home}
        rel="noreferrer"
        target="_blank"
      >
        {t("operator.openConsole")}
        <ArrowUpRight aria-hidden className="size-3.5" />
      </a>{" "}
      {t("operator.find", { record })}
    </p>
  );
}

/**
 * The operator side of the same records: what the bank's compliance team
 * opens in the Didit console. Every value is the one the API returned for
 * THIS visitor's session and payments - raw statuses, risk score, the rule
 * that held a payment.
 */
export function OperatorView({
  verification,
  payments,
  consoleHome,
}: {
  verification: VerificationView | null;
  payments: PaymentWithLink[];
  consoleHome: string;
}) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const recent = payments.slice(0, 3);

  return (
    <section
      aria-labelledby="fx-operator"
      className="rounded-md border border-line bg-surface p-4"
      data-testid="fx-operator"
    >
      <div className="mb-3 flex items-center gap-2">
        <Layers aria-hidden className="size-4 text-muted" />
        <h3
          className="m-0 text-[14px] font-semibold tracking-tight text-ink"
          id="fx-operator"
        >
          {t("operator.title")}
        </h3>
      </div>
      <p className="m-0 mb-3 text-xs leading-[16px] text-muted">
        {t("operator.body")}
      </p>

      {!verification && recent.length === 0 ? (
        <p className="m-0 rounded-sm border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
          {t("operator.empty")}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {verification ? (
          <div className="rounded-sm border border-line bg-canvas p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[13px] font-medium text-ink">
                {verification.sessionNumber
                  ? t("operator.sessionNumber", {
                      number: verification.sessionNumber,
                    })
                  : t("operator.session")}
              </p>
              <RawStatus status={verification.rawStatus} />
            </div>
            <p className="m-0 mt-1 break-all font-mono text-[11px] text-table-head">
              {verification.sessionId}
            </p>
            <ul className="m-0 mt-2.5 grid list-none grid-cols-2 gap-1.5 p-0">
              {verification.checks.map((check) => (
                <li
                  key={check.key}
                  className="flex items-center justify-between gap-1.5 text-[12px] text-muted"
                >
                  <span className="truncate">
                    {t(`checking.checks.${check.key}`)}
                  </span>
                  <span
                    className={cn(
                      "size-2 flex-none rounded-pill",
                      {
                        neutral: "bg-table-head",
                        approved: "bg-success",
                        review: "bg-warning",
                        declined: "bg-danger",
                        info: "bg-blue",
                      }[CHECK_TONE[check.status]],
                    )}
                    title={t(`checking.status.${check.status}`)}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-2.5">
              <ConsoleLink
                home={consoleHome}
                href={verification.consoleUrl}
                record={
                  verification.sessionNumber
                    ? `#${verification.sessionNumber}`
                    : verification.sessionId
                }
              />
            </div>
          </div>
        ) : null}

        {recent.map((p) => (
          <div
            key={p.id}
            className="rounded-sm border border-line bg-canvas p-3"
            data-testid="fx-operator-transaction"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[13px] font-medium text-ink">
                {t("operator.transaction", { number: p.number ?? "-" })}
                <span className="tnum ml-1.5 font-normal text-muted">
                  {p.direction === "in" ? "+" : "-"}
                  {money(p.amount)}
                </span>
              </p>
              <RawStatus status={p.rawStatus} />
            </div>
            <dl className="m-0 mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12px]">
              <dt className="text-muted">{t("operator.score")}</dt>
              <dd className="tnum m-0 text-ink">{p.score}</dd>
              <dt className="text-muted">{t("operator.rule")}</dt>
              <dd className="m-0 text-ink">
                {p.rules.length > 0
                  ? p.rules.map((rule) => (
                      <span key={rule.title} className="block">
                        {rule.title}
                        {rule.actions ? (
                          <span className="block font-mono text-[11px] text-table-head">
                            {rule.actions}
                          </span>
                        ) : null}
                      </span>
                    ))
                  : t("operator.noRule")}
              </dd>
            </dl>
            <div className="mt-2">
              <ConsoleLink
                home={consoleHome}
                href={p.consoleUrl}
                record={`#${p.number ?? p.id}`}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="m-0 mt-3 text-[11px] leading-[14px] text-table-head">
        {t("operator.login")}
      </p>
    </section>
  );
}

/** The steps, each expandable; the visitor's current step opens by itself. */
export function DiditSteps({ current }: { current: StepKey }) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const [open, setOpen] = React.useState<StepKey>(current);

  React.useEffect(() => setOpen(current), [current]);

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {STEPS.map((step, index) => {
        const expanded = open === step.key;
        const isCurrent = current === step.key;

        return (
          <li
            key={step.key}
            className={cn(
              "rounded-md border transition-colors duration-fast",
              isCurrent ? "border-blue/50 bg-blue-tint" : "border-line bg-canvas",
            )}
            data-current={isCurrent || undefined}
            data-step={step.key}
          >
            <button
              aria-controls={`fx-step-${step.key}`}
              aria-expanded={expanded}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              type="button"
              onClick={() => setOpen(step.key)}
            >
              <span
                className={cn(
                  "tnum flex size-6 flex-none items-center justify-center rounded-pill text-xs font-semibold",
                  isCurrent ? "bg-blue text-white" : "bg-elevated text-muted",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-medium text-ink">
                {t(`panel.steps.${step.key}.title`)}
              </span>
              {isCurrent ? (
                <span className="eyebrow eyebrow-accent hidden sm:inline">
                  {t("panel.current")}
                </span>
              ) : null}
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 flex-none text-muted transition-transform duration-fast",
                  expanded && "rotate-180",
                )}
              />
            </button>

            {expanded ? (
              <div className="px-4 pb-4" id={`fx-step-${step.key}`}>
                <p className="m-0 text-[13px] leading-[19px] text-muted">
                  {t(`panel.steps.${step.key}.body`, {
                    threshold: money(REVIEW_THRESHOLD),
                    rule: REVIEW_RULE.title,
                  })}
                </p>

                {step.modules.length > 0 ? (
                  <>
                    <p className="eyebrow eyebrow-muted mb-2 mt-3.5">
                      {t("panel.modules")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {step.modules.map((m) => (
                        <a
                          key={m.key}
                          className="module-chip hover:bg-blue/[0.2]"
                          href={docs(MODULE_DOCS[m.key].docsPath)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Image
                            alt=""
                            className="fx-glyph size-4"
                            height={16}
                            src={m.icon}
                            width={16}
                          />
                          {t(`panel.moduleNames.${m.key}`)}
                        </a>
                      ))}
                    </div>
                  </>
                ) : null}

                {step.calls.length > 0 ? (
                  <>
                    <p className="eyebrow eyebrow-muted mb-2 mt-3.5">
                      {t("panel.calls")}
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {step.calls.map((call) => (
                        <li
                          key={call.path}
                          className="flex items-center gap-2 rounded-sm border border-line bg-canvas px-2.5 py-2"
                        >
                          <span
                            className={cn(
                              "flex-none rounded-2xs px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                              METHOD_STYLE[call.method],
                            )}
                          >
                            {call.method}
                          </span>
                          <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink">
                            {call.path}
                          </code>
                          <a
                            className="inline-flex flex-none items-center gap-0.5 text-[12px] font-medium text-blue hover:text-blue-deep"
                            href={docs(call.docsPath)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {t("panel.docs")}
                            <ArrowUpRight aria-hidden className="size-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function DiditPanel({
  current,
  operator,
}: {
  current: StepKey;
  operator: React.ReactNode;
}) {
  const t = useTranslations("Fintech");

  return (
    <aside aria-labelledby="fx-panel" className="flex flex-col gap-4">
      <div>
        <h2
          className="m-0 text-[20px] font-display tracking-display text-ink"
          id="fx-panel"
        >
          {t("panel.title")}
        </h2>
        <p className="m-0 mt-1.5 text-[13px] text-muted">{t("panel.subtitle")}</p>
      </div>
      <DiditSteps current={current} />
      {operator}
    </aside>
  );
}

/**
 * Phones: the panel lives in a bottom sheet behind a floating button, so the
 * bank app keeps the whole screen.
 */
export function PanelSheet({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Fintech");
  const [open, setOpen] = React.useState(false);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        className="btn-dark fixed bottom-4 right-4 z-[60] h-11 px-4 shadow-lg sm:hidden"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Layers aria-hidden className="size-4" />
        {t("panel.open")}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] sm:hidden">
          <button
            aria-label={t("panel.close")}
            className="modal-scrim animate-fade-in cursor-default"
            tabIndex={-1}
            type="button"
            onClick={() => setOpen(false)}
          />
          <div
            aria-label={t("panel.title")}
            aria-modal="true"
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-lg border-t border-line bg-canvas shadow-lg"
            role="dialog"
          >
            <div className="flex flex-none items-center justify-between px-4 pb-2 pt-3">
              <span
                aria-hidden
                className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-pill bg-elevated"
              />
              <span />
              <button
                ref={closeRef}
                aria-label={t("panel.close")}
                className="flex size-8 items-center justify-center rounded-pill bg-elevated text-muted hover:text-ink"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-6">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
