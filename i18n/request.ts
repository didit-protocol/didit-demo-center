import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@website/lib/site";

/**
 * next-intl exists in this repo for ONE reason: the vendored didit.me chrome
 * (vendor/didit-website) reads its labels through `useTranslations`. The demo
 * catalogue itself is English only - there is no localized demo copy to serve -
 * so there are no locale route segments and no middleware.
 *
 * What the chrome's language switcher does have is the `NEXT_LOCALE` cookie
 * (written by the navigation shim). Reading it here re-renders the navbar and
 * footer in the picked language in place, which is exactly the behaviour a
 * visitor expects from the globe in the header.
 */
function resolveLocale(value: string | undefined): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = resolveLocale(cookies().get("NEXT_LOCALE")?.value);

  return {
    locale,
    messages: (await import(`../vendor/didit-website/messages/${locale}.json`))
      .default,
  };
});
