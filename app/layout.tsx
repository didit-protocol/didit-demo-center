import { Metadata } from "next";
import clsx from "clsx";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

// Order matters: the vendored didit.me token sheet first, then the chrome's
// behavioural sheet, then this app's own Tailwind build.
import "@website/styles/tokens.css";
import "@/styles/website-chrome.css";
import "@/styles/globals.css";

import { WebsiteHeader, WebsiteFooter } from "@/components/chrome";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    site: "@Diditprotocol",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The chrome's labels only. The demo catalogue is English; the globe in the
  // header switches the chrome language in place (see i18n/request.ts).
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html suppressHydrationWarning lang={locale}>
      <body
        className={clsx("min-h-screen bg-canvas font-sans", fontSans.variable)}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WebsiteHeader />
          <main className="min-h-[60vh]">
            <Suspense
              fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="size-8 animate-spin rounded-pill border-2 border-line border-t-blue" />
                    <p className="text-sm text-muted">Loading…</p>
                  </div>
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
          <WebsiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
