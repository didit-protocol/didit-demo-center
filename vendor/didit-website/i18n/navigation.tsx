"use client";

/**
 * SHIM (demo-centre-owned, not synced - see scripts/website-chrome/manifest.mjs).
 *
 * The vendored didit.me chrome imports `@website/i18n/navigation` for its
 * locale-aware navigation primitives. On didit.me those come from next-intl's
 * createNavigation and route WITHIN the marketing site. The demo centre is a
 * single-route app whose content is English only, so:
 *
 * - <Link href="/pricing"> renders a plain absolute anchor to
 *   `https://didit.me/<locale>/pricing/` (locale prefix `as-needed`, trailing
 *   slash matching the website's canonical URLs - no 308 bounce). Links that
 *   already point INSIDE the demo centre (`/`, `/accs`, `/ibeta`) stay local.
 * - `useRouter().replace(pathname, { locale })` - the locale switcher's one
 *   call - writes the NEXT_LOCALE cookie and reloads, so the chrome renders in
 *   the picked language in place. The demos themselves stay English; there is
 *   nothing else on the page to translate.
 * - External / mailto / hash hrefs pass through untouched, exactly like
 *   next-intl's isLocalizableHref behaviour.
 */

import * as React from "react";
import { useLocale } from "next-intl";
import { usePathname as useNextPathname } from "next/navigation";
import { DEFAULT_LOCALE } from "@website/lib/site";

/** The marketing site origin every vendored chrome link resolves against. */
export const WEBSITE_ORIGIN =
  process.env.NEXT_PUBLIC_WEBSITE_URL || "https://didit.me";

/**
 * Routes this app owns. A chrome link to one of these must NOT be rewritten to
 * didit.me - "Demo center" in the Developers menu has to stay right here.
 */
const LOCAL_ROUTES = ["/", "/accs", "/ibeta", "/verification/callback"];

function isLocalizable(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function isLocalRoute(href: string): boolean {
  const path = href.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";

  return LOCAL_ROUTES.includes(path);
}

export function localizeHref(href: string, locale: string): string {
  if (typeof href !== "string" || !isLocalizable(href)) return href;
  if (isLocalRoute(href)) return href;

  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  // Split off ?query / #hash, then mirror the website's `trailingSlash: true`.
  const cut = href.split(/(?=[?#])/, 2);
  let pathPart = cut[0];
  const suffix = cut.length > 1 ? href.slice(pathPart.length) : "";

  if (!pathPart.endsWith("/")) pathPart += "/";

  return `${WEBSITE_ORIGIN}${prefix}${pathPart}${suffix}`;
}

type LinkProps = Omit<React.ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  locale?: string;
  prefetch?: boolean;
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function Link({ href, locale, prefetch: _prefetch, children, ...rest }, ref) {
    const activeLocale = useLocale();

    return (
      <a ref={ref} href={localizeHref(href, locale ?? activeLocale)} {...rest}>
        {children}
      </a>
    );
  },
);

/**
 * The demo centre's own pathname. It never matches a marketing route, so the
 * navbar renders with no active item - same as any didit.me page outside the
 * nav.
 */
export function usePathname(): string {
  return useNextPathname() ?? "/";
}

/** Persist the chrome language for a year, then let the server re-render it. */
function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
}

export function useRouter() {
  const activeLocale = useLocale();

  return React.useMemo(
    () => ({
      // A `{ locale }` option means the chrome's language switcher is talking:
      // record the choice and reload so the vendored header and footer come
      // back in that language. Anything else is an ordinary chrome link.
      push: (href: string, opts?: { locale?: string }) => {
        if (opts?.locale && opts.locale !== activeLocale) {
          setLocaleCookie(opts.locale);
          window.location.reload();

          return;
        }
        window.location.assign(localizeHref(href, opts?.locale ?? activeLocale));
      },
      replace: (href: string, opts?: { locale?: string }) => {
        if (opts?.locale && opts.locale !== activeLocale) {
          setLocaleCookie(opts.locale);
          window.location.reload();

          return;
        }
        window.location.replace(
          localizeHref(href, opts?.locale ?? activeLocale),
        );
      },
      refresh: () => window.location.reload(),
      back: () => window.history.back(),
      forward: () => window.history.forward(),
      prefetch: () => {},
    }),
    [activeLocale],
  );
}

export function getPathname({ href }: { href: string; locale?: string }): string {
  return typeof href === "string" ? href : "/";
}

export function redirect(href: string): never {
  throw new Error(
    `redirect() is not supported in the demo-centre chrome shim (href: ${href})`,
  );
}
