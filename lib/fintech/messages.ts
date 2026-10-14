import en from "@/messages/fintech/en.json";

export type FintechMessages = typeof en;

/**
 * The fintech demo's copy, in the language the site chrome is in.
 *
 * The rest of the demo centre is English and only the vendored chrome reads
 * next-intl messages (see i18n/request.ts). The demo loads its own catalogue
 * per locale and hands it to a nested NextIntlClientProvider, so its strings
 * ship on /fintech only and never weigh on the catalogue's pages.
 */
export async function loadFintechMessages(
  locale: string,
): Promise<FintechMessages> {
  try {
    return (await import(`@/messages/fintech/${locale}.json`))
      .default as FintechMessages;
  } catch {
    return en;
  }
}
