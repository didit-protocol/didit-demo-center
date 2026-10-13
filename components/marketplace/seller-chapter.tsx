"use client";

import type { SellerView } from "@/lib/marketplace/server";
import type { KybSummary } from "@/lib/marketplace/summaries";

import * as React from "react";
import {
  ArrowRight,
  Building2,
  FileText,
  Lock,
  LockOpen,
  RotateCcw,
  ScanEye,
  Store,
  UserRoundCheck,
} from "lucide-react";

import { useMarket } from "./market-context";
import { ShopForm } from "./shop-form";
import {
  ActionButton,
  Card,
  CardHeader,
  ConsoleLink,
  Empty,
  Notice,
  Rows,
  StatusPill,
} from "./ui";

import { cn } from "@/lib/utils";
import { SELLER_COUNTRIES } from "@/lib/marketplace/catalog";
import {
  kybStatus,
  payoutsUnlocked,
  personStatus,
  transactionStatus,
} from "@/lib/marketplace/status";

const STEP_LABEL: Record<KybSummary["steps"][number]["key"], string> = {
  registry: "Company registry",
  people: "Key people and UBOs",
  documents: "Company documents",
  aml: "Company AML",
};

export const countryName = (code: string) =>
  SELLER_COUNTRIES.find((country) => country.code === code)?.name ?? code;

const humanize = (value: string) =>
  value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Step({
  icon: Icon,
  title,
  children,
  aside,
  last,
}: {
  icon: typeof Store;
  title: string;
  children?: React.ReactNode;
  aside?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-3.5 pb-5">
      {last ? null : (
        <span className="absolute left-[17px] top-10 h-[calc(100%-36px)] w-px bg-line" />
      )}
      <span className="flex size-9 flex-none items-center justify-center rounded-pill bg-surface text-ink">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pt-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 flex-1 text-sm font-medium text-ink">{title}</p>
          {aside}
        </div>
        {children ? (
          <div className="mt-1.5 text-sm leading-relaxed text-muted">
            {children}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function KybDetails({ kyb }: { kyb: KybSummary }) {
  const company = kyb.company;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="mkt-inset p-4">
        <p className="eyebrow eyebrow-muted mb-2">From the registry</p>
        {company ? (
          <Rows
            rows={[
              { label: "Legal name", value: company.name ?? "Not stated" },
              {
                label: "Registration no.",
                value: company.number ?? "Not stated",
              },
              {
                label: "Registry status",
                value: company.registryStatus
                  ? humanize(company.registryStatus)
                  : "Not stated",
              },
              { label: "Type", value: company.type ?? "Not stated" },
              {
                label: "Incorporated",
                value: company.incorporated ?? "Not stated",
              },
              {
                label: "Source",
                value:
                  company.fromRegistry === false
                    ? "Entered manually"
                    : "Official registry",
              },
            ]}
          />
        ) : (
          <p className="m-0 text-sm text-muted">
            The company is picked in the hosted flow. Its registry record shows
            here once it is selected.
          </p>
        )}
      </div>

      <div className="mkt-inset p-4">
        <p className="eyebrow eyebrow-muted mb-2">Checks</p>
        {kyb.steps.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {kyb.steps.map((step) => (
              <li
                key={step.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-ink">{STEP_LABEL[step.key]}</span>
                <StatusPill meta={kybStatus(step.status || null)} />
              </li>
            ))}
            {kyb.amlHits !== null ? (
              <li className="text-xs text-muted">
                Company AML: {kyb.amlHits} possible{" "}
                {kyb.amlHits === 1 ? "match" : "matches"}.
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">
            Each check reports its own status as the flow reaches it.
          </p>
        )}
      </div>

      {kyb.officers.length || kyb.owners.length ? (
        <div className="mkt-inset p-4 lg:col-span-2">
          <p className="eyebrow eyebrow-muted mb-2">
            Officers and beneficial owners on record
          </p>
          <ul className="m-0 grid list-none gap-x-6 gap-y-1.5 p-0 text-sm sm:grid-cols-2">
            {kyb.officers.map((officer) => (
              <li
                key={`o-${officer.name}-${officer.role}`}
                className="flex justify-between gap-3"
              >
                <span className="text-ink">{officer.name}</span>
                <span className="text-muted">{officer.role ?? "Officer"}</span>
              </li>
            ))}
            {kyb.owners.map((owner) => (
              <li
                key={`u-${owner.name}`}
                className="flex justify-between gap-3"
              >
                <span className="text-ink">{owner.name}</span>
                <span className="text-muted">
                  UBO
                  {owner.ownership !== null ? ` · ${owner.ownership}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {kyb.documents.length ? (
        <div className="mkt-inset p-4 lg:col-span-2">
          <p className="eyebrow eyebrow-muted mb-2">Documents</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {kyb.documents.map((document, index) => (
              <li
                key={`${document.type}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="inline-flex items-center gap-2 text-ink">
                  <FileText className="size-4 text-muted" />
                  {humanize(document.type)}
                </span>
                <StatusPill meta={kybStatus(document.status || null)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SellerCard({ seller }: { seller: SellerView }) {
  const market = useMarket();
  const kyb = seller.kyb;
  const kybMeta = kybStatus(kyb?.status ?? null);
  const signup = market.view?.transactions.find(
    (tx) => tx.uuid === seller.signup,
  );
  const unlocked = payoutsUnlocked(kyb?.status ?? null);
  const kybBusy = market.busy === `kyb:${seller.id}`;
  const kybLive = market.view?.availability.kyb ?? false;
  const error =
    market.error?.scope === `kyb:${seller.id}` ? market.error.message : null;

  return (
    <Card>
      <CardHeader
        aside={<StatusPill meta={kybMeta} />}
        description={`${seller.company} · ${countryName(seller.country)}`}
        eyebrow="Your shop"
        title={seller.shop}
      />

      <ol className="m-0 list-none p-0">
        <Step
          aside={
            signup ? (
              <StatusPill meta={transactionStatus(signup.status)} />
            ) : (
              <ActionButton
                busy={market.busy === `signup:${seller.id}`}
                className="h-9 px-3.5 text-[13px]"
                variant="muted"
                onClick={() => market.retrySignup(seller)}
              >
                Report sign-up
              </ActionButton>
            )
          }
          icon={Store}
          title="Sign-up reported to monitoring"
        >
          {signup ? (
            <>
              The web SDK sent a <code className="mkt-code">seller_signup</code>{" "}
              event from this device (score {signup.score}).
            </>
          ) : (
            "The sign-up has not reached monitoring yet."
          )}
          {market.error?.scope === `signup:${seller.id}` ? (
            <span className="mt-1 block text-danger">
              {market.error.message}
            </span>
          ) : null}
        </Step>

        <Step
          aside={
            kybLive ? (
              kyb?.url || !kyb ? (
                <ActionButton
                  busy={kybBusy}
                  className="h-9 px-3.5 text-[13px]"
                  variant={kyb ? "muted" : "primary"}
                  onClick={() => market.startKyb(seller)}
                >
                  {kyb ? "Continue verification" : "Verify the business"}
                  <ArrowRight className="size-4" />
                </ActionButton>
              ) : (
                <ActionButton
                  className="h-9 px-3 text-[13px]"
                  variant="ghost"
                  onClick={() => market.refreshKyb(seller)}
                >
                  <RotateCcw className="size-3.5" />
                  Refresh
                </ActionButton>
              )
            ) : null
          }
          icon={Building2}
          title="Business verification (KYB)"
        >
          {kybLive ? (
            kybMeta.description
          ) : (
            <span>
              The seller KYB workflow is not published on this environment yet,
              so the hosted flow cannot open here.
            </span>
          )}
          {seller.kybError ? (
            <span className="mt-1 block text-danger">{seller.kybError}</span>
          ) : null}
        </Step>

        <Step
          icon={UserRoundCheck}
          title="Representatives and owners: their own ID check"
        >
          {kyb?.people.length ? (
            <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
              {kyb.people.map((person) => {
                const meta = personStatus(person.kycStatus, person.skipped);

                return (
                  <li
                    key={`${person.name}-${person.roles.join()}`}
                    className="mkt-inset flex flex-wrap items-center gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm text-ink">{person.name}</p>
                      <p className="m-0 text-xs text-muted">
                        {person.roles.map(humanize).join(", ") || "Key person"}
                        {person.ownership !== null
                          ? ` · ${person.ownership}%`
                          : ""}
                      </p>
                    </div>
                    <StatusPill meta={meta} />
                    {person.kycUrl ? (
                      <ActionButton
                        className="h-8 px-3 text-xs"
                        variant="muted"
                        onClick={() =>
                          market.continuePersonCheck(
                            seller,
                            person.kycUrl as string,
                          )
                        }
                      >
                        <ScanEye className="size-3.5" />
                        Start ID check
                      </ActionButton>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            "Every representative and beneficial owner the seller submits in the hosted flow gets a linked ID check: document, selfie and face match."
          )}
        </Step>

        <Step
          last
          aside={
            <StatusPill
              meta={
                unlocked
                  ? { tone: "approved", label: "Unlocked" }
                  : { tone: "neutral", label: "Locked" }
              }
            />
          }
          icon={unlocked ? LockOpen : Lock}
          title="Payouts"
        >
          {unlocked
            ? "The business is approved, so this shop can withdraw its sales."
            : "Payouts stay locked until the business verification is approved."}
        </Step>
      </ol>

      {error ? (
        <div className="mb-4">
          <Notice tone="declined">{error}</Notice>
        </div>
      ) : null}

      {kyb ? <KybDetails kyb={kyb} /> : null}

      {seller.kybLink ? (
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
          <span className="text-xs text-muted">The operator side:</span>
          <ConsoleLink
            label="Open this KYB in Console v2"
            link={seller.kybLink}
            recordId={kyb?.sessionId}
          />
        </div>
      ) : null}
    </Card>
  );
}

export function SellerChapter() {
  const market = useMarket();
  const seller = market.view?.sellers[0] ?? null;
  const shopError =
    market.error?.scope === "shop" ? market.error.message : null;

  return (
    <div className="flex flex-col gap-5">
      {seller ? (
        <SellerCard seller={seller} />
      ) : (
        <Card>
          <CardHeader
            description="Opening a shop reports a seller sign-up to transaction monitoring from this device. Then the business verification - registry, key people and documents - unlocks payouts."
            eyebrow="Sell on Northmarket"
            title="Open your shop"
          />
          <ShopForm
            busy={Boolean(market.busy?.startsWith("shop:"))}
            disabled={!market.view?.availability.transactions}
            idPrefix="first-shop"
            initial={{ shop: "Atelier Nord", company: "", country: "ES" }}
            submitLabel="Open shop"
            onSubmit={(form) => market.openShop(form)}
          />
          {shopError ? (
            <div className="mt-4">
              <Notice tone="declined">{shopError}</Notice>
            </div>
          ) : null}
        </Card>
      )}

      {seller && market.view && market.view.sellers.length > 1 ? (
        <Notice
          action={
            <button
              className="mkt-btn-ghost h-8 px-3 text-xs"
              type="button"
              onClick={() => market.setChapter("fraud")}
            >
              See it
            </button>
          }
          tone="review"
        >
          This browser also opened{" "}
          {market.view.sellers
            .slice(1)
            .map((s) => s.shop)
            .join(", ")}
          . Monitoring linked them through the device.
        </Notice>
      ) : null}

      {!seller && market.view && !market.view.availability.transactions ? (
        <Empty>
          The marketplace runs on staging, against the demo organization.
        </Empty>
      ) : null}

      <div className={cn(seller ? "" : "hidden")}>
        <ActionButton variant="ink" onClick={() => market.setChapter("buyer")}>
          Next: a buyer checks out
          <ArrowRight className="size-4" />
        </ActionButton>
      </div>
    </div>
  );
}
