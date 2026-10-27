import type { Metadata } from "next";

import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import "@/styles/fintech.css";

import { FintechDemo } from "@/components/fintech/fintech-demo";
import { loadFintechMessages } from "@/lib/fintech/messages";

/** Where the demo runs when this build is not staging (see lib/fintech/route.ts). */
const STAGING_URL = "https://demos.staging.didit.me/fintech";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadFintechMessages(await getLocale());

  return {
    title: messages.page.title,
    description: messages.page.lede,
    alternates: { canonical: "/fintech" },
  };
}

export default async function FintechPage() {
  const locale = await getLocale();
  const messages = await loadFintechMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={{ Fintech: messages }}>
      <FintechDemo
        live={process.env.NEXT_PUBLIC_IS_STAGING === "true"}
        stagingUrl={STAGING_URL}
      />
    </NextIntlClientProvider>
  );
}
