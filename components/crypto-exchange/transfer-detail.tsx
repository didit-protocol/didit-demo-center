"use client";

import type { ActivityItem, Kestrel } from "./use-kestrel";

import * as React from "react";
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  ExternalLink,
  RotateCcw,
  ScanFace,
  Timer,
  Wallet,
} from "lucide-react";

import { activityChip } from "./wallet";
import {
  Notice,
  RiskMeter,
  Spinner,
  StatusChip,
  TONE,
  formatEth,
  formatTime,
  formatUsd,
} from "./ui";

import { CONSOLE_DEEP_LINKS, consoleLinks } from "@/lib/crypto-exchange/console";
import {
  depositOutcome,
  riskBand,
  shortAddress,
  statusLabel,
  statusTone,
  travelRuleLabel,
  withdrawalStage,
  type Tone,
  type TransactionView,
} from "@/lib/crypto-exchange/transactions";
import { cn } from "@/lib/utils";

interface StageCopy {
  tone: Tone;
  icon: typeof Timer;
  title: string;
  body: string;
  action?: string;
}

function depositCopy(view: TransactionView): StageCopy {
  const band = riskBand(view.screening?.riskScore ?? null);

  switch (depositOutcome(view)) {
    case "credited":
      return {
        tone: "approved",
        icon: CircleCheck,
        title: "Deposit credited",
        body: `Didit screened the sending wallet (${band.label.toLowerCase()}) and Kestrel's rules let it through. ${formatEth(view.amount)} is in your balance.`,
      };
    case "frozen":
      return {
        tone: "declined",
        icon: CircleX,
        title: "Deposit frozen",
        body: "The sending wallet is linked to sanctioned activity. Kestrel did not credit the funds, and its compliance team has the full report below.",
      };
    case "review":
      return {
        tone: "review",
        icon: Timer,
        title: "Deposit in review",
        body: "The sending wallet scored high on risk. A compliance analyst decides before the funds are credited.",
      };
    default:
      return {
        tone: "neutral",
        icon: Timer,
        title: "Deposit pending",
        body: "Didit has not decided on this deposit yet.",
      };
  }
}

function withdrawalCopy(view: TransactionView): StageCopy {
  const travelRule = view.travelRule?.status ?? "";

  switch (withdrawalStage(view)) {
    case "blocked":
      return {
        tone: "declined",
        icon: CircleX,
        title: "Withdrawal blocked",
        body: "The destination wallet is linked to sanctioned activity. Nothing was sent, and the funds are back in your balance.",
      };
    case "review":
      return {
        tone: "review",
        icon: Timer,
        title: "Withdrawal in review",
        body: "Didit flagged this transfer. A compliance analyst decides before anything is sent, and the funds stay on hold.",
      };
    case "prove-ownership":
      return {
        tone: "review",
        icon: Wallet,
        title: "Prove the wallet is yours",
        body:
          travelRule === "COUNTERPARTY_VASP_NOT_FOUND"
            ? "Didit looked for the receiving exchange on the Travel Rule networks it can reach and found none, so the transfer falls back to proving the address is yours."
            : "Under the Travel Rule, Kestrel must confirm who controls a self-hosted wallet before sending to it. Sign a message, upload a screenshot or declare it.",
        action: "Prove ownership",
      };
    case "step-up":
      return {
        tone: "review",
        icon: ScanFace,
        title: "Confirm it's you",
        body: "A quick selfie, matched against the one from your sign-up. No withdrawal leaves Kestrel without it.",
        action: "Take a selfie",
      };
    case "step-up-unavailable":
      return {
        tone: "review",
        icon: Timer,
        title: "Waiting for a selfie check",
        body: "Didit could not start the selfie check for this account, so Kestrel holds the withdrawal. The compliance view shows why.",
      };
    case "awaiting-counterparty":
      return {
        tone: "review",
        icon: Timer,
        title: "Waiting for the other exchange",
        body: "Didit sent your details and the beneficiary's to the receiving exchange. Kestrel releases the funds once it confirms.",
      };
    case "travel-rule-stuck":
      return {
        tone: "review",
        icon: Timer,
        title: `Travel Rule: ${travelRuleLabel(travelRule).toLowerCase()}`,
        body: "The Travel Rule exchange did not complete, so Kestrel holds the funds until compliance resolves it.",
      };
    default:
      return {
        tone: "approved",
        icon: CircleCheck,
        title: "Withdrawal approved",
        body: `Every check passed. Kestrel can broadcast ${formatEth(view.amount)} to ${shortAddress(view.wallet ?? "")} now. There is no chain behind this demo, so only the balance moves.`,
      };
  }
}

/** "score +60; change_status:IN_REVIEW" in words. */
function describeActions(actions: string | null): string[] {
  if (!actions) return [];

  return actions.split(";").map((part) => {
    const action = part.trim();
    const score = action.match(/^score ([+-]?\d+)$/);
    const status = action.match(/^change_status:(\w+)$/);

    if (score) return `Score ${score[1]}`;
    if (status) return `Status: ${statusLabel(status[1])}`;

    return action;
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-40 flex-none text-[13px] text-muted">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-sm border border-line bg-canvas">
      <h4 className="eyebrow eyebrow-muted m-0 border-b border-line bg-surface px-4 py-2.5">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function ComplianceView({ view }: { view: TransactionView }) {
  const screening = view.screening;
  const band = riskBand(screening?.riskScore ?? null);
  const factors = Array.from(new Set(screening?.riskFactors ?? []));
  const usd = formatUsd(view.usdValue);

  return (
    <section
      aria-label="Compliance view"
      className="overflow-hidden rounded-md border border-line bg-surface"
      data-testid="kestrel-compliance-view"
    >
      <header className="flex flex-wrap items-center gap-3 bg-ink px-4 py-3 text-canvas sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.16em] opacity-70">
            Operator side
          </p>
          <h3 className="m-0 text-base font-semibold tracking-tight">Compliance view</h3>
        </div>
        <a
          className="btn-base h-9 bg-canvas px-3.5 text-[13px] text-ink hover:bg-surface"
          href={consoleLinks.transaction(view.id)}
          rel="noreferrer"
          target="_blank"
        >
          Open in the Didit Console
          <ExternalLink className="size-3.5" />
        </a>
      </header>

      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <Section title="Decision">
          <dl className="m-0">
            <Row label="Status">
              <StatusChip tone={statusTone(view.status)}>{statusLabel(view.status)}</StatusChip>
            </Row>
            <Row label="Risk score">
              <span className="tnum">{view.score}</span>
              {view.decisionReason && (
                <span className="text-muted"> · {view.decisionReason}</span>
              )}
            </Row>
            <Row label="Amount">
              <span className="tnum">{formatEth(view.amount)}</span>
              {usd && <span className="text-muted"> · {usd}</span>}
            </Row>
            <Row label="Transaction">
              <code className="break-all text-[12px]">{view.id}</code>
            </Row>
          </dl>
        </Section>

        <Section title="Wallet screening">
          {screening ? (
            <dl className="m-0">
              <Row label={view.kind === "deposit" ? "Sending wallet" : "Destination"}>
                <code className="break-all text-[12px]">{view.wallet}</code>
              </Row>
              <Row label="Risk">
                <span className="flex flex-wrap items-center gap-3">
                  <RiskMeter score={screening.riskScore} tone={band.tone} />
                  <span className={cn("tnum font-medium", TONE[band.tone].text)}>
                    {screening.riskScore ?? "-"}/100
                  </span>
                  {screening.severity && (
                    <StatusChip tone={band.tone}>{screening.severity}</StatusChip>
                  )}
                </span>
              </Row>
              <Row label="Provider">{screening.provider}</Row>
              {screening.summary && (
                <Row label="Summary">
                  <span className="text-[13px] leading-5">{screening.summary}</span>
                </Row>
              )}
              {factors.length > 0 && (
                <Row label="Risk factors">
                  <span className="flex flex-wrap gap-1.5">
                    {factors.map((factor) => (
                      <span
                        key={factor}
                        className="rounded-pill bg-danger-bg px-2 py-0.5 text-xs text-danger"
                      >
                        {factor}
                      </span>
                    ))}
                  </span>
                </Row>
              )}
              <Row label="Sanctioned wallet">
                {screening.walletSanctioned ? (
                  <StatusChip tone="declined">Yes</StatusChip>
                ) : (
                  "No"
                )}
              </Row>
            </dl>
          ) : (
            <p className="m-0 px-4 py-3 text-sm text-muted">No screening on this transfer.</p>
          )}
        </Section>

        <Section title="Rules that fired">
          {view.rules.length === 0 ? (
            <p className="m-0 px-4 py-3 text-sm text-muted">No rule matched.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {view.rules.map((rule) => (
                <li
                  key={rule.title}
                  className="flex flex-col gap-1.5 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {rule.title}
                    {rule.isTest && (
                      <span className="rounded-pill bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted">
                        Test mode: recorded only
                      </span>
                    )}
                  </span>
                  {describeActions(rule.actions).length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {describeActions(rule.actions).map((action) => (
                        <span
                          key={action}
                          className="rounded-pill bg-elevated px-2 py-0.5 text-xs text-muted"
                        >
                          {action}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {view.travelRule && (
          <Section title="Travel Rule">
            <dl className="m-0">
              <Row label="Exchange">
                {travelRuleLabel(view.travelRule.status)}{" "}
                <code className="text-[12px] text-muted">{view.travelRule.status}</code>
              </Row>
              <Row label="Required">{view.travelRule.required ? "Yes" : "No"}</Row>
            </dl>
          </Section>
        )}

        {view.stepUp && (
          <Section title="Selfie step-up">
            <dl className="m-0">
              <Row label="Session">
                <a
                  className="inline-flex items-center gap-1 break-all text-[12px] text-blue hover:text-blue-deep"
                  href={consoleLinks.session(view.stepUp.sessionId)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <code>{view.stepUp.sessionId}</code>
                  <ExternalLink className="size-3 flex-none" />
                </a>
              </Row>
              <Row label="Status">{view.stepUp.status}</Row>
            </dl>
          </Section>
        )}

        {!CONSOLE_DEEP_LINKS && (
          <p className="m-0 px-1 text-[12px] leading-[18px] text-muted">
            The Console opens on its home page here; search for the transaction id above
            to land on this record.
          </p>
        )}
      </div>
    </section>
  );
}

export function TransferDetail({
  kestrel,
  item,
  onBack,
}: {
  kestrel: Kestrel;
  item: ActivityItem;
  onBack: () => void;
}) {
  const { view } = item;
  const copy = item.kind === "deposit" ? depositCopy(view) : withdrawalCopy(view);
  const chip = activityChip(item);
  const busy = kestrel.busyItem === item.id;
  const Icon = copy.icon;

  return (
    <div className="flex flex-col gap-5">
      <button
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Wallet
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="eyebrow eyebrow-muted">
            {item.kind === "deposit" ? "Deposit" : "Withdrawal"} · {item.label}
          </p>
          <p className="m-0 tnum text-[32px] font-display leading-none tracking-display text-ink">
            {formatEth(item.kind === "deposit" ? view.amount : `-${view.amount}`, {
              sign: true,
            })}
          </p>
          <p className="m-0 text-xs text-muted">
            {view.wallet ? shortAddress(view.wallet) : ""} · {formatTime(item.createdAt)}
          </p>
        </div>
        <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
      </div>

      <div
        className={cn("flex flex-col gap-4 rounded-md border p-5 sm:flex-row sm:items-center", TONE[copy.tone].surface)}
        data-testid="kestrel-stage"
      >
        <span className="flex size-11 flex-none items-center justify-center rounded-sm bg-canvas/70">
          <Icon className={cn("size-6", TONE[copy.tone].text)} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("m-0 text-base font-semibold tracking-tight", TONE[copy.tone].text)}>
            {copy.title}
          </h3>
          <p className="mt-1 text-[13px] leading-5 text-muted">{copy.body}</p>
        </div>
        {(copy.action || item.kind === "withdrawal") && (
          <div className="flex flex-none flex-wrap gap-2">
            {copy.action && (
              <button
                className="btn-base h-10 bg-blue px-4 text-white hover:bg-blue-deep disabled:opacity-60"
                disabled={busy}
                type="button"
                onClick={() => kestrel.runAction(item)}
              >
                {busy ? (
                  <>
                    <Spinner /> Waiting for Didit
                  </>
                ) : (
                  copy.action
                )}
              </button>
            )}
            {!copy.action && withdrawalStage(view) !== "ready" && withdrawalStage(view) !== "blocked" && (
              <button
                className="btn-base h-10 border border-line bg-canvas px-4 text-ink hover:bg-surface disabled:opacity-60"
                disabled={busy}
                type="button"
                onClick={() => kestrel.checkAgain(item)}
              >
                {busy ? <Spinner /> : <RotateCcw className="size-4" />}
                Check again
              </button>
            )}
          </div>
        )}
      </div>

      {kestrel.sdkError && <Notice tone="declined">{kestrel.sdkError}</Notice>}

      <ComplianceView view={view} />
    </div>
  );
}
