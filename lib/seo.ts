/**
 * What search engines and AI crawlers may index on demos.didit.me
 * (CLAUDE.md, "URLs are permanent"). No `@/` imports: `npm test` loads it
 * straight from Node.
 */
import { PRODUCT_DEMOS } from "./product-demos/demos";

/** Flow plumbing, not pages: hosted-flow returns, Didit Authentication and the API. */
export const PRIVATE_PATHS = [
  "/api/",
  "/auth/",
  "/verification/callback",
  "/ibeta/callback",
  "/accs/callback",
  "/didit-captcha/callback",
];

/** The hub and the four industry demos. */
const HUB_AND_INDUSTRY_DEMOS = [
  "/",
  "/fintech",
  "/igaming",
  "/marketplace",
  "/crypto-exchange",
];

/** Every indexable page. Moved paths (/modules, /product-demos) redirect and stay out. */
export function indexablePaths(): string[] {
  return [
    ...HUB_AND_INDUSTRY_DEMOS,
    ...PRODUCT_DEMOS.map((demo) => `/product-demos/${demo.id}`),
  ];
}
