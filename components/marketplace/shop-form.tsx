"use client";

import type { ShopForm as ShopFormValue } from "./market-context";

import * as React from "react";

import { ActionButton } from "./ui";

import { SELLER_COUNTRIES } from "@/lib/marketplace/catalog";

/** Shop name, legal name and registry country: what opening a shop asks. */
export function ShopForm({
  initial,
  submitLabel,
  busy,
  disabled,
  idPrefix,
  onSubmit,
}: {
  initial: ShopFormValue;
  submitLabel: string;
  busy: boolean;
  disabled?: boolean;
  idPrefix: string;
  onSubmit: (form: ShopFormValue) => void;
}) {
  const [form, setForm] = React.useState<ShopFormValue>(initial);
  const ready =
    form.shop.trim().length >= 2 && form.company.trim().length >= 2;

  const field =
    (key: keyof ShopFormValue) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) onSubmit(form);
      }}
    >
      <div>
        <label className="mkt-label" htmlFor={`${idPrefix}-shop`}>
          Shop name
        </label>
        <input
          autoComplete="off"
          className="mkt-input"
          id={`${idPrefix}-shop`}
          maxLength={40}
          placeholder="Atelier Nord"
          value={form.shop}
          onChange={field("shop")}
        />
      </div>
      <div>
        <label className="mkt-label" htmlFor={`${idPrefix}-country`}>
          Registry country
        </label>
        <select
          className="mkt-input appearance-none"
          id={`${idPrefix}-country`}
          value={form.country}
          onChange={field("country")}
        >
          {SELLER_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mkt-label" htmlFor={`${idPrefix}-company`}>
          Company legal name
        </label>
        <input
          autoComplete="organization"
          className="mkt-input"
          id={`${idPrefix}-company`}
          maxLength={80}
          placeholder="As it appears in the company registry"
          value={form.company}
          onChange={field("company")}
        />
        <p className="mt-1.5 text-xs text-muted">
          The business verification starts its registry search from this name.
          Use a real company: the registry is searched live.
        </p>
      </div>
      <div className="sm:col-span-2">
        <ActionButton
          busy={busy}
          disabled={!ready || disabled}
          type="submit"
          variant="primary"
        >
          {submitLabel}
        </ActionButton>
      </div>
    </form>
  );
}
