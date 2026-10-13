import { siteConfig } from "@/config/site";

/**
 * Links into the Didit Console (v2) for the records the demo creates.
 *
 * Console record pages live under /console/{organization}/{application}/, and
 * an API key cannot tell the app which organization and application it belongs
 * to. Set both ids (they are not secrets) to deep-link each record; without
 * them the links open the Console and the screen shows the id to search for.
 */
const ORGANIZATION =
  process.env.NEXT_PUBLIC_DIDIT_CONSOLE_ORGANIZATION_ID || "";
const APPLICATION = process.env.NEXT_PUBLIC_DIDIT_CONSOLE_APPLICATION_ID || "";

export const CONSOLE_DEEP_LINKS = Boolean(ORGANIZATION && APPLICATION);

function consoleUrl(path: string): string {
  if (!CONSOLE_DEEP_LINKS) return `${siteConfig.links.console}/console`;

  return `${siteConfig.links.console}/console/${encodeURIComponent(ORGANIZATION)}/${encodeURIComponent(APPLICATION)}/${path}`;
}

export const consoleLinks = {
  transaction: (id: string) =>
    consoleUrl(`transactions/detail/${encodeURIComponent(id)}`),
  session: (id: string) =>
    consoleUrl(`kyc/verifications/${encodeURIComponent(id)}`),
  travelRule: () => consoleUrl("transactions/travel-rule"),
  cryptoMonitoring: () => consoleUrl("transactions/crypto"),
};
