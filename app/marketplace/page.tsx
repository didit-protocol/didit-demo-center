import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import "@/styles/demos/live.css";
import "@/styles/demos/northmarket.css";

import { fontDmSans, fontFraunces } from "./fonts";

import { NorthmarketDemo } from "@/components/northmarket/northmarket-demo";

export const metadata: Metadata = {
  title: "Marketplace demo: Northmarket",
  description:
    "A fictional resale marketplace running Didit end to end: a passkey seller sign-up, KYB with each owner's ID before the first payout, a 1,497 EUR order waiting for a buyer age check and a second shop on the same device paused.",
  alternates: { canonical: "/marketplace" },
};

/** The old page's chapters, as the step each one became. */
const CHAPTER_STEP: Record<string, string> = {
  seller: "verify",
  buyer: "transact",
  payouts: "verify",
  fraud: "fraud",
  operator: "console",
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { chapter } = await searchParams;

  if (typeof chapter === "string")
    redirect(
      CHAPTER_STEP[chapter]
        ? `/marketplace?step=${CHAPTER_STEP[chapter]}`
        : "/marketplace",
    );

  return (
    <div className={`${fontFraunces.variable} ${fontDmSans.variable}`}>
      <Suspense>
        <NorthmarketDemo />
      </Suspense>
    </div>
  );
}
