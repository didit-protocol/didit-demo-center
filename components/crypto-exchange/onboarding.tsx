"use client";

import type { Kestrel, KestrelAccount } from "./use-kestrel";

import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  ExternalLink,
  Fingerprint,
  IdCard,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { Notice, Spinner, StatusChip, TONE } from "./ui";

import {
  accountCopy,
  type AccountStage,
} from "@/lib/crypto-exchange/onboarding";
import { consoleLinks } from "@/lib/crypto-exchange/console";
import { cn } from "@/lib/utils";

const PROMISES = [
  {
    icon: ShieldCheck,
    title: "Verified in about two minutes",
    body: "An ID document and a selfie. Didit checks both and screens you against sanctions and PEP lists.",
  },
  {
    icon: Fingerprint,
    title: "Every wallet screened",
    body: "Deposits and withdrawals are checked against blockchain analytics before funds move.",
  },
  {
    icon: ScanFace,
    title: "Withdrawals only by you",
    body: "Each withdrawal asks for a selfie, matched against the one you take today.",
  },
];

const STEPS = [
  { icon: IdCard, label: "Scan an ID document" },
  { icon: ScanFace, label: "Take a selfie" },
  { icon: ShieldCheck, label: "Sanctions and PEP screening" },
];

export function SignUpScreen({ kestrel }: { kestrel: Kestrel }) {
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] md:items-start md:gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <p className="eyebrow eyebrow-accent mb-3">Buy, store and send ETH</p>
          <h2 className="m-0 text-balance text-[30px] font-display leading-[1.08] tracking-display text-ink sm:text-[36px]">
            An exchange account you can trust with your keys.
          </h2>
          <p className="mt-3 max-w-[460px] text-[15px] leading-6 text-muted">
            Kestrel verifies every customer before they trade, and screens every
            transfer. You will see each check happen.
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {PROMISES.map((promise) => (
            <li key={promise.title} className="flex gap-3">
              <span className="flex size-9 flex-none items-center justify-center rounded-sm bg-blue-soft text-blue">
                <promise.icon className="size-[18px]" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">
                  {promise.title}
                </span>
                <span className="text-[13px] leading-5 text-muted">
                  {promise.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-5 rounded-md border border-line bg-surface p-5">
        <div>
          <h3 className="m-0 text-lg font-semibold tracking-tight text-ink">
            Open your Kestrel account
          </h3>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Verification opens right here, in a Didit window.
          </p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {STEPS.map((step, index) => (
            <li
              key={step.label}
              className="flex items-center gap-3 rounded-sm border border-line bg-canvas px-3 py-2.5"
            >
              <span className="flex size-6 flex-none items-center justify-center rounded-pill bg-elevated text-xs font-semibold text-muted tnum">
                {index + 1}
              </span>
              <step.icon className="size-4 flex-none text-muted" />
              <span className="text-sm text-ink">{step.label}</span>
            </li>
          ))}
        </ol>
        <button
          className="btn-base h-12 w-full bg-blue pl-5 pr-3 text-white hover:bg-blue-deep disabled:opacity-60"
          disabled={kestrel.signingUp || !kestrel.hydrated || !kestrel.sdkReady}
          type="button"
          onClick={kestrel.signUp}
        >
          {kestrel.signingUp ? (
            <>
              <Spinner /> Creating your verification
            </>
          ) : (
            <>
              Verify my identity
              <ArrowRight className="ml-auto size-5" />
            </>
          )}
        </button>
        {kestrel.accountError && (
          <Notice tone="declined">{kestrel.accountError}</Notice>
        )}
        <p className="m-0 text-[12px] leading-[18px] text-muted">
          A real exchange creates your login first. Didit&apos;s Authentication
          SDK is not public yet, so this demo starts at verification. Didit only
          receives the user id Kestrel assigns you.
        </p>
      </div>
    </div>
  );
}

const STAGE_ICON: Record<AccountStage, typeof CircleCheck> = {
  approved: CircleCheck,
  review: Timer,
  declined: CircleX,
  processing: Timer,
  unknown: CircleAlert,
};

const STAGE_TONE = {
  approved: "approved",
  review: "review",
  declined: "declined",
  processing: "neutral",
  unknown: "neutral",
} as const;

function checkTone(status: string | null) {
  const value = (status ?? "").toLowerCase();

  if (value === "approved") return "approved";
  if (value === "declined") return "declined";
  if (value.includes("review")) return "review";

  return "neutral";
}

/** Any account that is not open yet: in progress, in review or declined. */
export function AccountScreen({
  kestrel,
  account,
}: {
  kestrel: Kestrel;
  account: KestrelAccount;
}) {
  const copy = accountCopy(account);
  const tone = STAGE_TONE[account.stage];
  const Icon = STAGE_ICON[account.stage];

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <div
        className={cn(
          "flex items-start gap-4 rounded-md border p-5",
          TONE[tone].surface,
        )}
      >
        <span className="flex size-11 flex-none items-center justify-center rounded-sm bg-canvas/70">
          <Icon className={cn("size-6", TONE[tone].text)} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "m-0 text-lg font-semibold tracking-tight",
              TONE[tone].text,
            )}
          >
            {copy.title}
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">{copy.body}</p>
        </div>
      </div>

      <div className="rounded-md border border-line">
        <p className="eyebrow eyebrow-muted border-b border-line px-4 py-3">
          What Didit checked
        </p>
        <ul className="m-0 list-none p-0">
          {account.checks.map((check) => (
            <li
              key={check.label}
              className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <span className="text-sm text-ink">{check.label}</span>
              <StatusChip tone={checkTone(check.status)}>
                {check.status ?? "Not run yet"}
              </StatusChip>
            </li>
          ))}
        </ul>
      </div>

      {kestrel.accountError && (
        <Notice tone="declined">{kestrel.accountError}</Notice>
      )}

      <div className="flex flex-wrap gap-2.5">
        {account.stage === "processing" && kestrel.hasSessionUrl && (
          <button
            className="btn-base h-11 bg-blue px-5 text-white hover:bg-blue-deep"
            type="button"
            onClick={kestrel.continueVerification}
          >
            Continue verification
            <ArrowRight className="size-4" />
          </button>
        )}
        {account.stage !== "declined" && (
          <button
            className="btn-base h-11 border border-line bg-canvas px-5 text-ink hover:bg-surface"
            type="button"
            onClick={kestrel.refreshAccount}
          >
            <RotateCcw className="size-4" />
            Check again
          </button>
        )}
        <button
          className="btn-base h-11 px-4 text-muted hover:text-ink"
          type="button"
          onClick={kestrel.reset}
        >
          Start over
        </button>
      </div>

      <OperatorLink account={account} />
    </div>
  );
}

export function OperatorLink({ account }: { account: KestrelAccount }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[18px] text-muted">
      <span>
        Operator side: session{" "}
        <code className="break-all text-ink">{account.sessionId}</code>
      </span>
      <a
        className="inline-flex items-center gap-1 font-medium text-blue hover:text-blue-deep"
        href={consoleLinks(account.console).session(account.sessionId)}
        rel="noreferrer"
        target="_blank"
      >
        Open in the Didit Console
        <ExternalLink className="size-3.5" />
      </a>
    </p>
  );
}
