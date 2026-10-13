"use client";

import type { ApiError, PaymentWithLink } from "./api";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from "lucide-react";

import { FailureText } from "./onboarding-screens";
import {
  Chip,
  Field,
  Notice,
  ScreenTitle,
  Spinner,
  inputClass,
  toneClasses,
  useMoney,
  useWhen,
  type Tone,
} from "./ui";
import { api } from "./api";

import {
  MAX_AMOUNT,
  MIN_AMOUNT,
  REVIEW_THRESHOLD,
  parsePayment,
  triggersReview,
  type Balances,
  type MonitoringEstimate,
  type PaymentField,
  type PaymentInput,
  type PaymentKind,
} from "@/lib/fintech/model";
import { cn } from "@/lib/utils";

/** The customer-facing label of a payment's state. */
export type PaymentLabel = "received" | "sent" | "held" | "declined" | "action";

export function paymentLabel(payment: PaymentWithLink): PaymentLabel {
  if (payment.status === "cleared")
    return payment.direction === "in" ? "received" : "sent";

  return payment.status;
}

export const LABEL_TONE: Record<PaymentLabel, Tone> = {
  received: "approved",
  sent: "approved",
  held: "review",
  declined: "declined",
  action: "info",
};

function PaymentRow({
  payment,
  onOpen,
}: {
  payment: PaymentWithLink;
  onOpen: () => void;
}) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const when = useWhen();
  const label = paymentLabel(payment);
  const inbound = payment.direction === "in";
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight;

  return (
    <li>
      <button
        className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors duration-fast hover:bg-surface"
        type="button"
        onClick={onOpen}
      >
        <span
          className={cn(
            "flex size-9 flex-none items-center justify-center rounded-pill",
            inbound ? "bg-success-bg text-success" : "bg-elevated text-ink",
          )}
        >
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">
            {inbound
              ? t("payment.fromSelf")
              : t("payment.to", { name: payment.counterparty ?? "" })}
          </span>
          <span className="block text-xs text-muted">
            {when(payment.createdAt)}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          <span
            className={cn(
              "tnum text-[14px] font-medium",
              payment.status === "declined"
                ? "text-muted line-through"
                : inbound
                  ? "text-success"
                  : "text-ink",
            )}
          >
            {inbound ? "+" : "-"}
            {money(payment.amount)}
          </span>
          {label === "received" || label === "sent" ? null : (
            <Chip tone={LABEL_TONE[label]}>{t(`payment.status.${label}`)}</Chip>
          )}
        </span>
      </button>
    </li>
  );
}

export function HomeScreen({
  name,
  payments,
  balances,
  loading,
  failure,
  atLimit,
  limit,
  monitoring,
  onAdd,
  onSend,
  onRefresh,
  onOpen,
}: {
  name: string;
  payments: PaymentWithLink[];
  balances: Balances;
  loading: boolean;
  failure: ApiError | null;
  atLimit: boolean;
  limit: number;
  monitoring: React.ReactNode;
  onAdd: () => void;
  onSend: () => void;
  onRefresh: () => void;
  onOpen: (payment: PaymentWithLink) => void;
}) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const firstName = name.split(" ")[0] || name;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[22px] font-display tracking-display text-ink">
          {t("home.greeting", { name: firstName })}
        </h2>
        <Chip tone="approved">{t("home.verified")}</Chip>
      </div>

      <section className="rounded-md border border-line bg-surface p-5">
        <p className="eyebrow eyebrow-muted">{t("home.balance")}</p>
        <p
          className="tnum m-0 mt-2.5 text-[38px] font-display leading-none tracking-display text-ink"
          data-testid="fx-balance"
        >
          {money(balances.available)}
        </p>
        {balances.held > 0 ? (
          <p className="m-0 mt-2.5 flex items-center gap-1.5 text-[13px] text-warning">
            <Timer aria-hidden className="size-3.5" />
            {t("home.held", { amount: money(balances.held) })}
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            className="btn-primary h-11 disabled:opacity-60"
            disabled={atLimit}
            type="button"
            onClick={onAdd}
          >
            <Plus aria-hidden className="size-4" />
            {t("home.add")}
          </button>
          <button
            className="btn-dark h-11 disabled:opacity-60"
            disabled={atLimit}
            type="button"
            onClick={onSend}
          >
            <Send aria-hidden className="size-4" />
            {t("home.send")}
          </button>
        </div>
      </section>

      {atLimit ? (
        <Notice tone="info">{t("home.limit", { limit })}</Notice>
      ) : null}

      <section aria-labelledby="fx-activity">
        <div className="mb-1 flex items-center justify-between">
          <h3
            className="m-0 text-[15px] font-semibold tracking-tight text-ink"
            id="fx-activity"
          >
            {t("home.activity")}
          </h3>
          <button
            aria-label={t("home.refresh")}
            className="flex size-8 items-center justify-center rounded-pill text-muted transition-colors duration-fast hover:bg-surface hover:text-ink"
            type="button"
            onClick={onRefresh}
          >
            <RefreshCw
              aria-hidden
              className={cn("size-4", loading && "animate-spin")}
            />
          </button>
        </div>
        {failure ? (
          <Notice tone="declined">
            <FailureText error={failure} />
          </Notice>
        ) : null}
        {payments.length === 0 && !failure ? (
          <div className="rounded-sm border border-dashed border-line px-4 py-6 text-center">
            <p className="m-0 text-[14px] font-medium text-ink">
              {t("home.emptyTitle")}
            </p>
            <p className="m-0 mt-1.5 text-[13px] leading-[18px] text-muted">
              {t("home.emptyBody", { threshold: money(REVIEW_THRESHOLD) })}
            </p>
          </div>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                onOpen={() => onOpen(payment)}
              />
            ))}
          </ul>
        )}
      </section>

      {monitoring}
    </div>
  );
}

const PRESETS: Record<PaymentKind, number[]> = {
  deposit: [1000, 5000, 10000],
  transfer: [250, 1000, 6000],
};

export function PayScreen({
  kind,
  available,
  onCancel,
  onSubmit,
}: {
  kind: PaymentKind;
  available: number;
  onCancel: () => void;
  /** Resolves to null on success, or the error the API returned. */
  onSubmit: (input: PaymentInput) => Promise<ApiError | null>;
}) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const [amount, setAmount] = React.useState<string>(
    String(PRESETS[kind][kind === "deposit" ? 2 : 0]),
  );
  const [counterparty, setCounterparty] = React.useState("");
  const [errors, setErrors] = React.useState<PaymentField[]>([]);
  const [failure, setFailure] = React.useState<ApiError | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const parsed = parsePayment({ kind, amount, counterparty });
  const value = Number(amount);
  const reviewed = parsed.ok && triggersReview(parsed.value as PaymentInput);
  const transfer = kind === "transfer";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);

    if (!parsed.ok) {
      setErrors(parsed.errors);

      return;
    }

    setSubmitting(true);
    const error = await onSubmit(parsed.value);

    setSubmitting(false);
    if (!error) return;
    if (error.fields?.length) setErrors(error.fields as PaymentField[]);
    else setFailure(error);
  };

  return (
    <form noValidate className="flex h-full flex-col" onSubmit={submit}>
      <button
        className="mb-5 inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-muted hover:text-ink"
        type="button"
        onClick={onCancel}
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("common.back")}
      </button>
      <ScreenTitle
        body={t(transfer ? "pay.transferBody" : "pay.depositBody")}
        title={t(transfer ? "pay.transferTitle" : "pay.depositTitle")}
      />

      <div className="flex flex-col gap-5">
        {transfer ? (
          <Field
            error={
              errors.includes("counterparty")
                ? t("pay.errors.counterparty")
                : null
            }
            id="fx-recipient"
            label={t("pay.recipient")}
          >
            <input
              autoComplete="off"
              className={inputClass}
              placeholder={t("pay.recipientPlaceholder")}
              value={counterparty}
              onChange={(event) => {
                setCounterparty(event.target.value);
                setErrors((e) => e.filter((f) => f !== "counterparty"));
              }}
            />
          </Field>
        ) : null}

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[13px] font-medium text-ink">
            {t("pay.amount")}
          </legend>
          <div
            aria-label={t("amount.presets")}
            className="grid grid-cols-3 gap-2"
            role="group"
          >
            {PRESETS[kind].map((preset) => (
              <button
                key={preset}
                aria-pressed={value === preset}
                className={cn(
                  "tnum h-10 rounded-pill border text-[13px] font-medium transition-colors duration-fast",
                  value === preset
                    ? "border-ink bg-ink text-canvas"
                    : "border-line bg-canvas text-ink hover:bg-surface",
                )}
                type="button"
                onClick={() => {
                  setAmount(String(preset));
                  setErrors((e) => e.filter((f) => f !== "amount"));
                }}
              >
                {money(preset)}
              </button>
            ))}
          </div>
          <Field
            error={
              errors.includes("amount")
                ? t("pay.errors.amount", {
                    min: money(MIN_AMOUNT),
                    max: money(MAX_AMOUNT),
                  })
                : null
            }
            id="fx-amount"
            label={t("pay.otherAmount")}
          >
            <input
              className={cn(inputClass, "tnum")}
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.replace(",", "."));
                setErrors((e) => e.filter((f) => f !== "amount"));
              }}
            />
          </Field>
        </fieldset>

        {transfer ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[13px] text-muted">
              {t("pay.available", { amount: money(available) })}
            </p>
            {reviewed ? (
              <Notice tone="review">{t("pay.willReview")}</Notice>
            ) : (
              <p className="m-0 flex items-start gap-1.5 text-xs leading-[16px] text-muted">
                <ShieldCheck aria-hidden className="mt-px size-3.5 flex-none" />
                {t("pay.reviewHint", { threshold: money(REVIEW_THRESHOLD) })}
              </p>
            )}
          </div>
        ) : null}

        {failure ? (
          <Notice tone="declined">
            {failure.error === "insufficient_funds" ? (
              t("pay.errors.insufficient", {
                available: money(failure.available ?? available),
              })
            ) : failure.error === "limit" ? (
              t("pay.errors.limit")
            ) : (
              <FailureText error={failure} />
            )}
          </Notice>
        ) : null}
      </div>

      <div className="mt-auto pt-8">
        <button
          className="btn-primary h-12 w-full disabled:opacity-70"
          disabled={submitting}
          type="submit"
        >
          {submitting ? <Spinner /> : null}
          {submitting
            ? t("pay.submitting")
            : t(transfer ? "pay.submitTransfer" : "pay.submitDeposit", {
                amount: money(Number.isFinite(value) ? value : 0),
              })}
        </button>
      </div>
    </form>
  );
}

const RESULT_ICON: Record<PaymentLabel, typeof CircleCheck> = {
  received: CircleCheck,
  sent: CircleCheck,
  held: Timer,
  declined: CircleX,
  action: TriangleAlert,
};

/** What the customer sees right after paying, and when opening a payment. */
export function PaymentResultScreen({
  payment,
  onDone,
}: {
  payment: PaymentWithLink;
  onDone: () => void;
}) {
  const t = useTranslations("Fintech");
  const money = useMoney();
  const when = useWhen();
  const label = paymentLabel(payment);
  const style = toneClasses(LABEL_TONE[label]);
  const Icon = RESULT_ICON[label];

  return (
    <div className="flex h-full flex-col" data-testid="fx-payment-result">
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
        body={t(`result.${label}.body`)}
        title={t(`result.${label}.title`, {
          amount: money(payment.amount),
          name: payment.counterparty ?? "",
        })}
      />

      <dl className="m-0 divide-y divide-line rounded-sm border border-line">
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <dt className="text-[13px] text-muted">{t("pay.amount")}</dt>
          <dd className="tnum m-0 text-[14px] font-medium text-ink">
            {money(payment.amount)}
          </dd>
        </div>
        {payment.direction === "out" ? (
          <div className="flex items-center justify-between gap-3 px-3.5 py-3">
            <dt className="text-[13px] text-muted">{t("pay.recipient")}</dt>
            <dd className="m-0 truncate text-[14px] font-medium text-ink">
              {payment.counterparty}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <dt className="text-[13px] text-muted">{when(payment.createdAt)}</dt>
          <dd className="m-0">
            <Chip tone={LABEL_TONE[label]}>{t(`payment.status.${label}`)}</Chip>
          </dd>
        </div>
      </dl>

      {label === "held" ? (
        <p className="m-0 mt-4 flex items-center gap-2 text-[13px] text-muted">
          <span className="size-2 animate-pulse-dot rounded-pill bg-warning" />
          {t("outcome.review.live")}
        </p>
      ) : null}

      <div className="mt-auto pt-8">
        <button
          className="btn-muted h-12 w-full"
          type="button"
          onClick={onDone}
        >
          {t("result.done")}
        </button>
      </div>
    </div>
  );
}

/**
 * Ongoing AML monitoring, explained in the app and previewed live: the button
 * asks Didit what switching it on for this customer would do and cost
 * (`estimate_only`), which writes nothing.
 */
export function MonitoringCard({ onActivate }: { onActivate: () => void }) {
  const t = useTranslations("Fintech");
  const [state, setState] = React.useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "done"; estimate: MonitoringEstimate }
    | { kind: "error"; error: ApiError }
  >({ kind: "idle" });

  const preview = async () => {
    onActivate();
    setState({ kind: "loading" });
    const result = await api.monitoring();

    setState(
      result.ok
        ? { kind: "done", estimate: result.data.estimate }
        : { kind: "error", error: result.error },
    );
  };

  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <section
      aria-labelledby="fx-monitoring"
      className="rounded-md border border-line p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 flex-none items-center justify-center rounded-pill bg-blue-soft text-blue-deep">
          <ShieldCheck aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="m-0 text-[15px] font-semibold tracking-tight text-ink"
            id="fx-monitoring"
          >
            {t("monitoring.title")}
          </h3>
          <p className="m-0 mt-1.5 text-[13px] leading-[18px] text-muted">
            {t("monitoring.body")}
          </p>
        </div>
      </div>

      {state.kind === "done" ? (
        <div className="mt-4" data-testid="fx-monitoring-estimate">
          <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-[13px]">
            {(
              [
                ["profiles", state.estimate.profiles],
                ["alreadyMonitored", state.estimate.alreadyMonitored],
                ["withScreening", state.estimate.withScreening],
                ["needsScreening", state.estimate.needsScreening],
                ["missingIdentity", state.estimate.missingIdentity],
                ["annualCost", usd.format(state.estimate.annualCostUsd)],
              ] as const
            ).map(([key, value]) => (
              <React.Fragment key={key}>
                <dt className="text-muted">{t(`monitoring.rows.${key}`)}</dt>
                <dd className="tnum m-0 text-right font-medium text-ink">
                  {value}
                </dd>
              </React.Fragment>
            ))}
          </dl>
          <p className="m-0 mt-3 text-xs text-muted">{t("monitoring.note")}</p>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="mt-4">
          <Notice tone="declined">
            <FailureText error={state.error} />
          </Notice>
        </div>
      ) : null}

      {state.kind !== "done" ? (
        <button
          className="btn-outline mt-4 h-10 w-full px-4 text-[13px] disabled:opacity-70"
          disabled={state.kind === "loading"}
          type="button"
          onClick={preview}
        >
          {state.kind === "loading" ? <Spinner /> : null}
          {state.kind === "loading"
            ? t("monitoring.loading")
            : t("monitoring.cta")}
        </button>
      ) : null}
    </section>
  );
}
