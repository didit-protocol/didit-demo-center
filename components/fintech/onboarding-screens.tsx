"use client";

import type { ApiError, VerificationView } from "./api";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  CircleX,
  IdCard,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Timer,
  UserCheck,
} from "lucide-react";

import { BankMark } from "./bank-frame";
import {
  Chip,
  Field,
  Notice,
  Progress,
  ScreenTitle,
  Spinner,
  inputClass,
  toneClasses,
  type Tone,
} from "./ui";

import {
  COUNTRIES,
  parseSignUp,
  type CheckStatus,
  type OnboardingStatus,
  type SignUpField,
  type SignUpInput,
} from "@/lib/fintech/model";
import { cn } from "@/lib/utils";

const ONBOARDING_STEPS = 3;

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const t = useTranslations("Fintech");
  const points = [
    { key: "verify", icon: ScanFace },
    { key: "send", icon: ArrowLeftRight },
    { key: "safe", icon: ShieldCheck },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      <div
        aria-hidden
        className="fintech-card-art relative mb-8 aspect-[1.586] w-full max-w-[300px] self-center overflow-hidden rounded-md p-5 text-white shadow-md"
      >
        <BankMark className="size-8" tone="inverted" />
        <span className="absolute right-5 top-6 h-6 w-8 rounded-[5px] bg-white/25" />
        <p className="absolute bottom-5 left-5 m-0 text-lg font-display tracking-display">
          {t("bank.name")}
        </p>
      </div>

      <ScreenTitle body={t("welcome.body")} title={t("welcome.title")} />

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {points.map(({ key, icon: Icon }) => (
          <li
            key={key}
            className="flex items-center gap-3 text-[14px] text-ink"
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-pill bg-blue-soft text-blue-deep">
              <Icon aria-hidden className="size-4" />
            </span>
            {t(`welcome.points.${key}`)}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        <button
          className="btn-primary h-12 w-full"
          type="button"
          onClick={onStart}
        >
          {t("welcome.cta")}
          <ArrowRight aria-hidden className="size-5" />
        </button>
        <p className="mt-3 text-center text-xs leading-[16px] text-muted">
          {t("welcome.note")}
        </p>
      </div>
    </div>
  );
}

/** Localized country names, sorted the way the visitor reads them. */
function useCountryOptions() {
  const locale = useLocale();

  return React.useMemo(() => {
    let names: Intl.DisplayNames | null = null;

    try {
      names = new Intl.DisplayNames([locale, "en"], { type: "region" });
    } catch {
      names = null;
    }

    return COUNTRIES.map((c) => ({
      value: c.iso3,
      label: names?.of(c.iso2) ?? c.iso2,
    })).sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [locale]);
}

export function SignUpScreen({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  /** Resolves to null on success, or the error the API returned. */
  onSubmit: (input: SignUpInput) => Promise<ApiError | null>;
}) {
  const t = useTranslations("Fintech");
  const countries = useCountryOptions();
  const [form, setForm] = React.useState({ name: "", email: "", country: "" });
  const [errors, setErrors] = React.useState<SignUpField[]>([]);
  const [failure, setFailure] = React.useState<ApiError | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const update =
    (field: SignUpField) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => current.filter((f) => f !== field));
    };

  const errorFor = (field: SignUpField) =>
    errors.includes(field) ? t(`signup.errors.${field}`) : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);

    const parsed = parseSignUp(form);

    if (!parsed.ok) {
      setErrors(parsed.errors);

      return;
    }

    setSubmitting(true);
    const error = await onSubmit(parsed.value);

    setSubmitting(false);
    if (!error) return;
    if (error.fields?.length) setErrors(error.fields as SignUpField[]);
    else setFailure(error);
  };

  return (
    <form noValidate className="flex h-full flex-col" onSubmit={submit}>
      <Progress
        current={1}
        label={t("signup.progress", { current: 1, total: ONBOARDING_STEPS })}
        total={ONBOARDING_STEPS}
      />
      <ScreenTitle body={t("signup.body")} title={t("signup.title")} />

      <div className="flex flex-col gap-4">
        <Field error={errorFor("name")} id="fx-name" label={t("signup.name")}>
          <input
            autoComplete="name"
            className={inputClass}
            placeholder={t("signup.namePlaceholder")}
            value={form.name}
            onChange={update("name")}
          />
        </Field>
        <Field
          error={errorFor("email")}
          id="fx-email"
          label={t("signup.email")}
        >
          <input
            autoComplete="email"
            className={inputClass}
            inputMode="email"
            placeholder={t("signup.emailPlaceholder")}
            type="email"
            value={form.email}
            onChange={update("email")}
          />
        </Field>
        <Field
          error={errorFor("country")}
          id="fx-country"
          label={t("signup.country")}
        >
          <select
            className={cn(inputClass, !form.country && "text-table-head")}
            value={form.country}
            onChange={update("country")}
          >
            <option disabled value="">
              {t("signup.countryPlaceholder")}
            </option>
            {countries.map((c) => (
              <option key={c.value} className="text-ink" value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {failure ? (
        <div className="mt-4">
          <Notice tone="declined">
            <FailureText error={failure} />
          </Notice>
        </div>
      ) : null}

      <div className="mt-auto pt-8">
        <p className="mb-4 text-xs leading-[16px] text-muted">
          {t("signup.consent")}
        </p>
        <div className="flex gap-2.5">
          <button
            className="btn-muted h-12 flex-none px-5"
            disabled={submitting}
            type="button"
            onClick={onBack}
          >
            {t("common.back")}
          </button>
          <button
            className="btn-primary h-12 flex-1 disabled:opacity-70"
            disabled={submitting}
            type="submit"
          >
            {submitting ? <Spinner /> : null}
            {submitting ? t("signup.submitting") : t("signup.submit")}
          </button>
        </div>
      </div>
    </form>
  );
}

/** One translated line for any API failure. */
export function FailureText({ error }: { error: ApiError }) {
  const t = useTranslations("Fintech");

  if (error.error === "unavailable") return <>{t("common.unavailable")}</>;
  if (error.error === "didit" && error.detail)
    return <>{t("common.diditError", { detail: error.detail })}</>;

  return <>{t("common.error")}</>;
}

export function VerifyScreen({
  resume,
  starting,
  cancelled,
  failure,
  onStart,
}: {
  resume: boolean;
  starting: boolean;
  cancelled: boolean;
  failure: string | null;
  onStart: () => void;
}) {
  const t = useTranslations("Fintech");
  const steps = [
    { key: "id", icon: IdCard },
    { key: "liveness", icon: ScanFace },
    { key: "face", icon: UserCheck },
    { key: "aml", icon: ShieldCheck },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      <Progress
        current={2}
        label={t("verify.progress", { current: 2, total: ONBOARDING_STEPS })}
        total={ONBOARDING_STEPS}
      />
      <ScreenTitle body={t("verify.body")} title={t("verify.title")} />

      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {steps.map(({ key, icon: Icon }, index) => (
          <li
            key={key}
            className="flex items-center gap-3 rounded-sm border border-line bg-surface px-3.5 py-3 text-[14px] text-ink"
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-pill bg-canvas text-blue">
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="flex-1">{t(`verify.steps.${key}`)}</span>
            <span className="tnum text-xs text-table-head">{index + 1}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col gap-3">
        {cancelled ? (
          <Notice tone="info">{t("verify.cancelled")}</Notice>
        ) : null}
        {failure ? (
          <Notice tone="declined">
            {t("verify.failed", { reason: failure })}
          </Notice>
        ) : null}
      </div>

      <div className="mt-auto pt-8">
        <button
          className="btn-primary h-12 w-full disabled:opacity-70"
          disabled={starting}
          type="button"
          onClick={onStart}
        >
          {starting ? (
            <Spinner />
          ) : (
            <BadgeCheck aria-hidden className="size-5" />
          )}
          {starting
            ? t("verify.starting")
            : resume
              ? t("verify.resume")
              : t("verify.cta")}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Smartphone aria-hidden className="size-3.5 flex-none" />
          {t("verify.phone")}
        </p>
      </div>
    </div>
  );
}

const CHECK_TONE: Record<CheckStatus, Tone> = {
  pending: "neutral",
  passed: "approved",
  review: "review",
  failed: "declined",
};

export function CheckingScreen({
  verification,
  slow,
}: {
  verification: VerificationView | null;
  slow: boolean;
}) {
  const t = useTranslations("Fintech");
  const checks = verification?.checks ?? [
    { key: "id", status: "pending" },
    { key: "liveness", status: "pending" },
    { key: "face", status: "pending" },
    { key: "aml", status: "pending" },
  ];

  return (
    <div aria-busy className="flex h-full flex-col">
      <Progress
        current={3}
        label={t("verify.progress", { current: 3, total: ONBOARDING_STEPS })}
        total={ONBOARDING_STEPS}
      />
      <div className="mb-6 flex size-12 items-center justify-center rounded-pill bg-blue-soft text-blue-deep">
        <Spinner className="size-6" />
      </div>
      <ScreenTitle body={t("checking.body")} title={t("checking.title")} />

      <ul
        aria-live="polite"
        className="m-0 flex list-none flex-col divide-y divide-line rounded-sm border border-line p-0"
      >
        {checks.map((check) => (
          <li
            key={check.key}
            className="flex items-center justify-between gap-3 px-3.5 py-3 text-[14px] text-ink"
          >
            {t(`checking.checks.${check.key}`)}
            <Chip tone={CHECK_TONE[check.status as CheckStatus]}>
              {t(`checking.status.${check.status}`)}
            </Chip>
          </li>
        ))}
      </ul>

      {slow ? (
        <div className="mt-4">
          <Notice tone="info">{t("checking.slow")}</Notice>
        </div>
      ) : null}
    </div>
  );
}

const OUTCOME: Record<
  "approved" | "review" | "declined" | "expired",
  { tone: Tone; icon: typeof CircleCheck }
> = {
  approved: { tone: "approved", icon: CircleCheck },
  review: { tone: "review", icon: Timer },
  declined: { tone: "declined", icon: CircleX },
  expired: { tone: "neutral", icon: Timer },
};

export type OutcomeKind = keyof typeof OUTCOME;

export function outcomeKind(status: OnboardingStatus): OutcomeKind | null {
  return status === "approved" ||
    status === "review" ||
    status === "declined" ||
    status === "expired"
    ? status
    : null;
}

/**
 * The account decision, in the bank's words. The customer is never told WHY
 * a review or a decline happened - least of all about an AML match, which
 * would tip off a listed person. The operator panel shows the reason.
 */
export function OutcomeScreen({
  kind,
  name,
  email,
  onContinue,
  onReset,
}: {
  kind: OutcomeKind;
  name: string;
  email: string;
  onContinue: () => void;
  onReset: () => void;
}) {
  const t = useTranslations("Fintech");
  const { tone, icon: Icon } = OUTCOME[kind];
  const style = toneClasses(tone);
  const firstName = name.split(" ")[0] || name;

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "mb-6 flex size-14 items-center justify-center rounded-pill",
          style.surface,
          style.text,
        )}
      >
        <Icon aria-hidden className="size-7" />
      </div>
      <ScreenTitle
        body={t(`outcome.${kind}.body`, { name: firstName, email })}
        title={t(`outcome.${kind}.title`)}
      />

      {kind === "review" ? (
        <p className="m-0 flex items-center gap-2 text-[13px] text-muted">
          <span className="size-2 animate-pulse-dot rounded-pill bg-warning" />
          {t("outcome.review.live")}
        </p>
      ) : null}

      <div className="mt-auto pt-8">
        {kind === "approved" ? (
          <button
            className="btn-primary h-12 w-full"
            type="button"
            onClick={onContinue}
          >
            {t("outcome.approved.cta")}
            <ArrowRight aria-hidden className="size-5" />
          </button>
        ) : null}
        {kind === "declined" || kind === "expired" ? (
          <button
            className="btn-muted h-12 w-full"
            type="button"
            onClick={onReset}
          >
            {t(`outcome.${kind}.cta`)}
          </button>
        ) : null}
      </div>
    </div>
  );
}
