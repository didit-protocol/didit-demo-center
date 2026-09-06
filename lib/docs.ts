/**
 * Documentation deep links.
 *
 * "Docs" on a demo is the next thing a developer clicks, so every path below
 * is a page that actually exists on docs.didit.me - checked against the live
 * docs tree, and re-checked by `npm run check:docs-links`. When a page moves,
 * fix it here once instead of in eighteen places.
 */
export const DOCS_ORIGIN = "https://docs.didit.me";

export function docs(path = ""): string {
  if (!path) return DOCS_ORIGIN;

  return `${DOCS_ORIGIN}/${path.replace(/^\//, "")}`;
}

/** Pages the chrome, the shell and the modals link to directly. */
export const DOC_PATHS = {
  apiReference: "api-reference/overview",
  quickStart: "getting-started/quick-start",
  features: "getting-started/features",
  pricing: "getting-started/pricing",
  createSession: "sessions-api/create-session",
  retrieveSession: "sessions-api/retrieve-session",
  webhooks: "integration/webhooks",
  workflows: "console/workflows",
  incontextIframe: "integration/web-sdks/incontext-iframe",
  webSdk: "integration/web-sdks/javascript-sdk",
  sandbox: "integration/sandbox-testing",
  verificationStatuses: "integration/verification-statuses",
} as const;

export const DOC_LINKS = Object.fromEntries(
  Object.entries(DOC_PATHS).map(([key, path]) => [key, docs(path)]),
) as Record<keyof typeof DOC_PATHS, string>;
