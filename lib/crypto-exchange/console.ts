import { siteConfig } from "@/config/site";

/**
 * Links into the Didit Console (v2) for the records the demo creates.
 *
 * Console record pages live under /console/{organization}/{application}/.
 * Neither id is in a decision or a transaction detail, so the server reads
 * them from a transaction summary (`consoleContext` in ./server) and hands
 * them to the page with the account. Without them the links open the Console
 * and the screen shows the id to search for.
 */
export interface ConsoleContext {
  organizationId: string;
  applicationId: string;
}

export function consoleLinks(context: ConsoleContext | null) {
  const consoleUrl = (path: string) =>
    context
      ? `${siteConfig.links.console}/console/${encodeURIComponent(context.organizationId)}/${encodeURIComponent(context.applicationId)}/${path}`
      : `${siteConfig.links.console}/console`;

  return {
    transaction: (id: string) =>
      consoleUrl(`transactions/detail/${encodeURIComponent(id)}`),
    session: (id: string) =>
      consoleUrl(`kyc/verifications/${encodeURIComponent(id)}`),
    travelRule: () => consoleUrl("transactions/travel-rule"),
    cryptoMonitoring: () => consoleUrl("transactions/crypto"),
  };
}
