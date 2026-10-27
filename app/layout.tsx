import { Metadata } from "next";
import clsx from "clsx";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { DiditAuth } from "@didit-protocol/auth-nextjs";

// Order matters: the vendored didit.me token sheet first, then the chrome's
// behavioural sheet, then this app's own Tailwind build.
import "@website/styles/tokens.css";
import "@/styles/website-chrome.css";
import "@/styles/globals.css";

import { siteConfig } from "@/config/site";
import {
  fontDidit,
  fontDiditMono,
  fontInter,
  fontSans,
  fontSora,
} from "@/config/fonts";
import { authEnabled, authEnv } from "@/lib/didit/auth";
import { DiditClientProvider } from "@/lib/didit/provider";

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

/**
 * Every page: the chrome's labels (next-intl), Didit Authentication when a
 * publishable key is configured, and signals from the first load. The
 * website header and footer live in app/(site)/layout.tsx; the hub and the
 * Demo Center shell bring their own.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The chrome's labels only. The demo catalogue is English; the globe in the
  // header switches the chrome language in place (see i18n/request.ts).
  const locale = await getLocale();
  const messages = await getMessages();
  const withAuth = authEnabled();

  if (withAuth) authEnv();

  const content = (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DiditClientProvider authEnabled={withAuth}>
        {children}
      </DiditClientProvider>
    </NextIntlClientProvider>
  );

  return (
    <html suppressHydrationWarning lang={locale}>
      <body
        className={clsx(
          "min-h-screen bg-canvas font-sans",
          fontSans.variable,
          fontDidit.variable,
          fontDiditMono.variable,
          fontInter.variable,
          fontSora.variable,
        )}
      >
        {withAuth ? (
          <DiditAuth appearance={{ theme: "light" }} locale="en">
            {content}
          </DiditAuth>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
