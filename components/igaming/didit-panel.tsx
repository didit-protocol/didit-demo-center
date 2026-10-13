"use client";

import type { Aurora } from "./use-aurora";
import type { ActivityItem } from "@/lib/igaming/ledger";

import * as React from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";

import { Glyph, Spinner, StatusPill } from "./ui";

import {
  consoleLinks,
  formatMoney,
  sessionView,
  transactionView,
} from "@/lib/igaming/policy";
import { DIDIT_STEPS, type StepId } from "@/lib/igaming/steps";
import { docs } from "@/lib/docs";
import { cn } from "@/lib/utils";

export type PanelTab = "how" | "operator" | "log";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "how", label: "How it uses Didit" },
  { id: "operator", label: "Operator view" },
  { id: "log", label: "API log" },
];

/** The journey step the player is on, for the panel's highlight. */
export function activeStep(aurora: Aurora): StepId {
  const state = aurora.state;

  if (!state?.age?.summary || !state.ageSeen) {
    return state?.age?.summary ? "location" : "register";
  }
  if (state.selfExcluded) return "safer";
  const latest = state.activity[0];
  const held = state.activity.find(
    (item) => item.record?.id === state.kyc?.transactionId,
  );

  if (held?.record?.status === "AWAITING_USER" || aurora.busy === "verify")
    return "step-up";
  if (!latest) return "cashier";
  if (latest.kind === "bonus_claim") return "bonus";
  if (latest.kind === "deposit_limit") return "safer";

  return "cashier";
}

function HowItWorks({ active }: { active: StepId }) {
  const activeRef = React.useRef<HTMLLIElement | null>(null);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {DIDIT_STEPS.map((step, index) => {
        const on = step.id === active;

        return (
          <li
            key={step.id}
            ref={on ? activeRef : undefined}
            aria-current={on ? "step" : undefined}
            className={cn(
              "rounded-xs border p-3.5 transition-colors duration-base",
              on ? "border-blue/40 bg-blue-tint" : "border-line bg-canvas",
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "tnum flex size-5 flex-none items-center justify-center rounded-pill text-[11px] font-semibold",
                  on ? "bg-blue text-white" : "bg-surface text-muted",
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] font-semibold leading-5 text-ink">
                  {step.title}
                </p>
                <p className="mb-0 mt-1 text-xs leading-[18px] text-muted">
                  {step.player}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {step.modules.map((module) => (
                    <span
                      key={module.label}
                      className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-surface pl-1.5 pr-2 text-[11px] font-medium text-ink"
                    >
                      <Glyph className="size-3.5" src={module.icon} />
                      {module.label}
                    </span>
                  ))}
                </div>
                {on ? (
                  <ul className="m-0 mt-2.5 list-none space-y-1 p-0">
                    {step.calls.map((call) => (
                      <li
                        key={call}
                        className="break-words font-mono text-[11px] leading-4 text-muted"
                        style={{
                          fontFamily:
                            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                        }}
                      >
                        {call}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                  {step.docs.map((doc) => (
                    <a
                      key={doc.docsPath}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-blue hover:text-blue-deep"
                      href={docs(doc.docsPath)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {doc.label}
                      <ArrowUpRight aria-hidden className="size-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ConsoleLink({ href, children }: { href: string | null; children: string }) {
  if (!href) return null;

  return (
    <a
      className="inline-flex flex-none items-center gap-0.5 text-xs font-medium text-blue hover:text-blue-deep"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3" />
    </a>
  );
}

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  bet: "Bet",
  bonus_claim: "Bonus claim",
  deposit_limit: "Limit change",
};

function OperatorView({ aurora }: { aurora: Aurora }) {
  const { state, operator } = aurora;
  const links = operator.console ? consoleLinks(operator.console) : null;

  React.useEffect(() => {
    if (state) void aurora.refreshOperator();
    // Refresh once per player when the tab opens.
  }, [state?.playerId]);

  if (!state) {
    return (
      <p className="m-0 text-[13px] leading-5 text-muted">
        Create an account in the app to see what Aurora Play&apos;s team sees
        in the Didit Business Console.
      </p>
    );
  }

  const checks = [
    { label: "Age check", kind: "age" as const, check: state.age },
    { label: "ID verification", kind: "kyc" as const, check: state.kyc },
  ].filter((item) => item.check);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-xs leading-[18px] text-muted">
          The same records, as the operator reads them. Console links need a
          login to the demo organization.
        </p>
        <button
          aria-label="Refresh operator view"
          className="flex size-8 flex-none items-center justify-center rounded-pill border border-line text-muted hover:text-ink"
          disabled={operator.loading}
          type="button"
          onClick={() => void aurora.refreshOperator()}
        >
          {operator.loading ? (
            <Spinner className="size-3.5" />
          ) : (
            <RefreshCw aria-hidden className="size-3.5" />
          )}
        </button>
      </div>

      <div className="rounded-xs border border-line p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="ig-label mb-1.5">Player</p>
            <p className="m-0 text-[13px] font-semibold text-ink">
              {operator.player?.name ?? state.name}
            </p>
            <p className="m-0 mt-0.5 break-all font-mono text-[11px] text-muted">
              vendor_data {state.playerId}
            </p>
          </div>
          {operator.player ? (
            <StatusPill
              tone={operator.player.status === "BLOCKED" ? "declined" : "approved"}
            >
              {operator.player.status}
            </StatusPill>
          ) : null}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-3">
          <ConsoleLink
            href={
              links && operator.player?.internalId
                ? links.user(operator.player.internalId)
                : null
            }
          >
            Player in Console
          </ConsoleLink>
          <ConsoleLink href={links ? links.rules() : null}>Rules</ConsoleLink>
          <ConsoleLink href={links ? links.lists() : null}>Lists</ConsoleLink>
        </div>
      </div>

      {checks.map(({ label, kind, check }) => {
        const summary = check!.summary;
        const view = summary ? sessionView(kind, summary.status) : null;

        return (
          <div key={label} className="rounded-xs border border-line p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="ig-label mb-1.5">Session · {label}</p>
                <p className="m-0 break-all font-mono text-[11px] text-muted">
                  {check!.sessionId}
                </p>
              </div>
              <StatusPill tone={view?.tone ?? "neutral"}>
                {summary?.status ?? "Not read yet"}
              </StatusPill>
            </div>
            {summary ? (
              <p className="mb-0 mt-2 text-xs leading-[18px] text-muted">
                {[
                  summary.estimatedAge !== null
                    ? `Estimated age ${summary.estimatedAge}`
                    : null,
                  summary.ip?.country
                    ? `IP ${summary.ip.country}`
                    : null,
                  summary.ip?.isVpnOrTor ? "VPN or Tor" : null,
                  summary.ip?.isDataCenter ? "data-centre IP" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            <div className="mt-2.5">
              <ConsoleLink
                href={links ? links.session(check!.sessionId) : null}
              >
                Session in Console
              </ConsoleLink>
            </div>
          </div>
        );
      })}

      {state.activity.map((item) => {
        const record = item.record;
        const view = record ? transactionView(item.kind, record.status) : null;

        return (
          <div key={item.key} className="rounded-xs border border-line p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="ig-label mb-1.5">
                  Transaction · {KIND_LABEL[item.kind]}
                </p>
                <p className="tnum m-0 text-[13px] font-semibold text-ink">
                  {formatMoney(item.amount)}
                  {record ? (
                    <span className="font-normal text-muted">
                      {" "}
                      · score {record.score}
                    </span>
                  ) : null}
                </p>
              </div>
              {record ? (
                <StatusPill tone={view!.tone}>{record.status}</StatusPill>
              ) : (
                <StatusPill tone="declined">HTTP 400</StatusPill>
              )}
            </div>
            {record ? (
              <>
                {record.ruleHits.length > 0 ? (
                  <ul className="m-0 mt-2.5 list-none space-y-1.5 p-0">
                    {record.ruleHits.map((hit) => (
                      <li
                        key={hit.title}
                        className="flex items-start gap-2 text-xs leading-[18px] text-ink"
                      >
                        <span className="mt-[7px] size-1.5 flex-none rounded-pill bg-warning" />
                        <span className="min-w-0 flex-1">
                          {hit.title}
                          <span className="text-muted">
                            {hit.scoreDelta ? ` · +${hit.scoreDelta}` : ""}
                            {hit.statusTarget ? ` · ${hit.statusTarget}` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-0 mt-2 text-xs text-muted">No rule hits.</p>
                )}
                <p className="mb-0 mt-2 break-all text-[11px] leading-4 text-muted">
                  {[
                    record.device.fingerprint
                      ? `Device ${record.device.fingerprint.slice(0, 12)}…`
                      : null,
                    record.device.ipCountry
                      ? `IP ${record.device.ipCountry}`
                      : null,
                    record.device.isDataCenter ? "data-centre IP" : null,
                    record.device.isVpnOrTor ? "VPN or Tor" : null,
                    record.tags.length ? record.tags.join(", ") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-2.5">
                  <ConsoleLink href={links ? links.transaction(record.id) : null}>
                    Transaction in Console
                  </ConsoleLink>
                </div>
              </>
            ) : (
              <p className="mb-0 mt-2 text-xs leading-[18px] text-danger">
                {item.error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApiLog({ aurora }: { aurora: Aurora }) {
  if (aurora.log.length === 0) {
    return (
      <p className="m-0 text-[13px] leading-5 text-muted">
        Every Didit call appears here as you play: server calls made with the
        API key, browser calls made with the player&apos;s transaction token,
        and the hosted flows the web SDK opens.
      </p>
    );
  }

  return (
    <ul className="m-0 list-none p-0">
      {aurora.log.map((entry) => {
        const ok = entry.status !== null && entry.status < 400;

        return (
          <li
            key={entry.id}
            className="flex items-start gap-2.5 border-t border-line py-2.5 first:border-t-0"
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 w-[52px] flex-none items-center justify-center rounded-pill text-[9px] font-semibold uppercase tracking-[0.08em]",
                entry.via === "server"
                  ? "bg-surface text-muted"
                  : entry.via === "browser"
                    ? "bg-blue-soft text-blue-deep"
                    : "bg-success-bg text-success",
              )}
            >
              {entry.via}
            </span>
            <span
              className="min-w-0 flex-1 break-all text-[11px] leading-[18px] text-ink"
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              }}
            >
              <span className="font-semibold">{entry.method}</span> {entry.path}
            </span>
            <span
              className={cn(
                "tnum flex-none text-[11px] font-semibold",
                entry.status === null
                  ? "text-muted"
                  : ok
                    ? "text-success"
                    : "text-danger",
              )}
            >
              {entry.status ?? "open"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DiditPanel({
  aurora,
  tab,
  onTab,
  className,
}: {
  aurora: Aurora;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  className?: string;
}) {
  return (
    <div className={cn("ig-card flex min-h-0 flex-col", className)}>
      <div className="flex-none border-b border-line px-4 pt-4">
        <p className="ig-label mb-2">Behind the scenes</p>
        <div className="-mb-px flex gap-4" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              aria-selected={tab === item.id}
              className={cn(
                "border-b-2 pb-2.5 text-[13px] font-medium transition-colors duration-fast",
                tab === item.id
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink",
              )}
              role="tab"
              type="button"
              onClick={() => onTab(item.id)}
            >
              {item.label}
              {item.id === "log" && aurora.log.length > 0 ? (
                <span className="tnum ml-1 text-muted">{aurora.log.length}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" role="tabpanel">
        {tab === "how" ? <HowItWorks active={activeStep(aurora)} /> : null}
        {tab === "operator" ? <OperatorView aurora={aurora} /> : null}
        {tab === "log" ? <ApiLog aurora={aurora} /> : null}
      </div>
    </div>
  );
}
