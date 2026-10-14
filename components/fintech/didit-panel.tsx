"use client";

import type { PaymentWithLink, VerificationView } from "./api";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown, Layers, X } from "lucide-react";

import { Chip, focusRing, useMoney, type Tone } from "./ui";

import { Modal } from "@/components/demo-center/modal";
import { docs } from "@/lib/docs";
import {
  REVIEW_RULE,
  REVIEW_THRESHOLD,
  type CheckStatus,
} from "@/lib/fintech/model";
import {
  MODULE_DOCS,
  STEPS,
  type ApiCall,
  type StepKey,
} from "@/lib/fintech/steps";
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
        className={cn(
          "inline-flex items-center gap-1 rounded-2xs text-[13px] font-medium text-blue hover:text-blue-deep",
          focusRing,
        )}
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
        className={cn(
          "inline-flex items-center gap-1 rounded-2xs font-medium text-blue hover:text-blue-deep",
          focusRing,
        )}
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
  monitoring,
}: {
  verification: VerificationView | null;
  payments: PaymentWithLink[];
  consoleHome: string;
  /** The ongoing-monitoring estimate, once the customer is approved. */
  monitoring?: React.ReactNode;
}) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const titleId = React.useId();
  const recent = payments.slice(0, 3);

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-md border border-line bg-canvas p-4"
      data-testid="fx-operator"
    >
      <div className="mb-3 flex items-center gap-2">
        <Layers aria-hidden className="size-4 text-muted" />
        <h3
          className="m-0 text-[14px] font-semibold tracking-tight text-ink"
          id={titleId}
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
          <div className="rounded-sm border border-line bg-surface p-3">
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
            <p className="fx-code m-0 mt-1 break-all text-[11px] text-table-head">
              {verification.sessionId}
            </p>
            <ul className="m-0 mt-2.5 flex list-none flex-col gap-1.5 p-0">
              {verification.checks.map((check) => (
                <li
                  key={check.key}
                  className="flex min-w-0 items-center justify-between gap-3 text-[12px] text-muted"
                >
                  <span className="truncate">
                    {t(`checking.checks.${check.key}`)}
                  </span>
                  <Chip tone={CHECK_TONE[check.status]}>
                    {t(`checking.status.${check.status}`)}
                  </Chip>
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
            className="rounded-sm border border-line bg-surface p-3"
            data-testid="fx-operator-transaction"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[13px] font-medium text-ink">
                {t("operator.transaction", { number: p.number ?? "-" })}
                <span className="tnum ms-1.5 font-normal text-muted">
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
                          <span className="fx-code block text-[11px] text-table-head">
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

        {monitoring}
      </div>

      <p className="m-0 mt-3 text-[11px] leading-[14px] text-table-head">
        {t("operator.login")}
      </p>
    </section>
  );
}

function CallList({ calls }: { calls: ApiCall[] }) {
  const t = useTranslations("Fintech");

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {calls.map((call) => (
        <li
          key={call.path}
          className="flex items-center gap-2 rounded-sm border border-line bg-canvas px-2.5 py-2"
        >
          <span
            className={cn(
              "fx-code flex-none rounded-2xs px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
              METHOD_STYLE[call.method],
            )}
          >
            {call.method}
          </span>
          <code className="fx-code min-w-0 flex-1 truncate text-[12px] text-ink">
            {call.path}
          </code>
          <a
            aria-label={`${t("panel.docs")}: ${call.path}`}
            className={cn(
              "inline-flex flex-none items-center gap-0.5 rounded-2xs text-[12px] font-medium text-blue hover:text-blue-deep",
              focusRing,
            )}
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
  );
}

/** The steps, each expandable; the visitor's current step opens by itself. */
export function DiditSteps({ current }: { current: StepKey }) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const idPrefix = React.useId();
  const [open, setOpen] = React.useState<StepKey | null>(current);

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
              isCurrent
                ? "border-blue/50 bg-blue-tint"
                : "border-line bg-canvas",
            )}
            data-current={isCurrent || undefined}
            data-step={step.key}
          >
            <button
              aria-controls={expanded ? `${idPrefix}-${step.key}` : undefined}
              aria-expanded={expanded}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-4 py-3 text-start",
                focusRing,
              )}
              type="button"
              onClick={() => setOpen(expanded ? null : step.key)}
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
              <div className="px-4 pb-4" id={`${idPrefix}-${step.key}`}>
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
                          className={cn(
                            "module-chip hover:bg-blue/[0.2]",
                            focusRing,
                          )}
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
                    <CallList calls={step.calls} />
                  </>
                ) : null}

                {step.production.length > 0 ? (
                  <>
                    <p className="eyebrow eyebrow-muted mb-2 mt-3.5">
                      {t("panel.production")}
                    </p>
                    <CallList calls={step.production} />
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
  const titleId = React.useId();

  return (
    <aside aria-labelledby={titleId} className="flex flex-col gap-4">
      <div>
        <h2
          className="m-0 text-[20px] font-display tracking-display text-ink"
          id={titleId}
        >
          {t("panel.title")}
        </h2>
        <p className="m-0 mt-1.5 text-[13px] text-muted">
          {t("panel.subtitle")}
        </p>
      </div>
      <DiditSteps current={current} />
      {operator}
    </aside>
  );
}

/**
 * Phones: opens the panel's sheet. It sits with the demo's own controls in
 * the page header rather than floating, so it never covers the bank's
 * buttons.
 */
export function PanelButton({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("Fintech");

  return (
    <button
      className={cn(
        "btn-base h-9 border border-blue/40 bg-blue-soft px-3.5 text-[13px] text-blue-deep hover:bg-blue/[0.2] sm:hidden",
        focusRing,
      )}
      type="button"
      onClick={onOpen}
    >
      <Layers aria-hidden className="size-3.5" />
      {t("panel.open")}
    </button>
  );
}

/**
 * Phones: the panel in the demo centre's modal (focus trap, Escape, focus
 * restored to PanelButton on close), so the bank app keeps the whole screen.
 */
export function PanelSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("Fintech");

  return (
    <Modal
      label={t("panel.title")}
      open={open}
      width="max-w-[560px] h-[calc(100dvh-32px)] bg-[rgb(var(--fx-page))]"
      onClose={onClose}
    >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-none justify-end px-3 pt-3">
            <button
              aria-label={t("panel.close")}
              className={cn(
                "flex size-8 items-center justify-center rounded-pill bg-elevated text-muted transition-colors duration-fast hover:text-ink",
                focusRing,
              )}
              type="button"
              onClick={onClose}
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </div>
    </Modal>
  );
}
