/**
 * The one place the demo center reads Didit's environment from.
 *
 * Every demo, route and browser call takes its base URLs, environment and keys
 * from here, so pointing the demo center at staging or production is one
 * variable (`NEXT_PUBLIC_IS_STAGING`). It has no runtime imports: `npm test`
 * and the setup scripts load it straight from Node.
 */

export type DiditEnvironment = "production" | "staging";

export const environment: DiditEnvironment =
  process.env.NEXT_PUBLIC_IS_STAGING === "true" ? "staging" : "production";

export const isStaging = environment === "staging";

/** One value per environment: `pick(production, staging)`. */
export function pick<T>(production: T, staging: T): T {
  return isStaging ? staging : production;
}

export const diditUrls = {
  /** The verification API: sessions, decisions, users, transactions. */
  api: pick(
    "https://verification.didit.me",
    "https://verification.staging.didit.me",
  ),
  /** Where hosted verification sessions live. */
  verify: pick("https://verify.didit.me", "https://verify.staging.didit.me"),
  console: pick(
    "https://business.didit.me",
    "https://business.staging.didit.me",
  ),
  site: pick("https://demos.didit.me", "https://demos.staging.didit.me"),
  docs: "https://docs.didit.me",
};

/** The server-side API key. Never sent to the browser. */
export function apiKey(): string {
  return process.env.API_KEY || "";
}

/**
 * The Authentication publishable key: a public identifier of the demo
 * application, so it may be rendered into the page. When it is unset (the
 * production application until Authentication ships there) the demos keep
 * their own sign-in and the Authentication steps stay hidden.
 */
export function publishableKey(): string | null {
  const key = (process.env.DIDIT_PUBLISHABLE_KEY || "").trim();

  return /^pk_(live|test)_[A-Za-z0-9_-]+$/.test(key) ? key : null;
}

export const PRODUCTS = [
  "authentication",
  "signals",
  "verification",
  "transactions",
] as const;

export type Product = (typeof PRODUCTS)[number];

/** The five steps every demo walks through, in order. */
export const STEPS = [
  { id: "signup", label: "Sign up" },
  { id: "verify", label: "Verify" },
  { id: "transact", label: "Transact" },
  { id: "fraud", label: "Stop fraud" },
  { id: "console", label: "Console" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export interface DemoBrand {
  name: string;
  /** The first letter shown in the brand square of the demo switcher. */
  initial: string;
  /** Background of that square (a CSS colour or gradient). */
  mark: string;
}

export interface DemoDefinition<W extends Record<string, string>> {
  id: string;
  route: string;
  industry: string;
  brand: DemoBrand;
  /** Every `vendor_data` this demo creates starts with it; its rules match it. */
  vendorPrefix: string;
  /** Workflow ids for the current environment, built with `pick`. */
  workflows: W;
  /** Plain-language rules the demo enforces, shown in the live layer. */
  rules: Record<string, string>;
  copy: { tagline: string; story: string };
}

/** A demo's config: brand, workflows per environment, rules and copy. */
export function defineDemo<W extends Record<string, string>>(
  demo: DemoDefinition<W>,
): DemoDefinition<W> {
  return demo;
}

/**
 * The `vendor_data` Didit sees for a visitor: the demo's prefix plus the
 * Didit Authentication user id, so the same person is one record across
 * Authentication, verification and transactions, and the demo's rules (which
 * match the prefix) apply to them only.
 */
export function vendorDataFor(prefix: string, userId: string): string | null {
  const clean = userId.trim();

  if (!/^[A-Za-z0-9_-]{6,80}$/.test(clean)) return null;

  return `${prefix}${clean}`;
}
