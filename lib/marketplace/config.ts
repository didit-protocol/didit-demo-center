/**
 * The Didit objects the marketplace runs against.
 *
 * The ids live in ONE place, the Northmarket entry of lib/didit/demos.ts, one
 * value per environment with `pick(production, staging)`: the routes
 * (lib/marketplace/route.ts) and the setup script read them from there.
 * Production uses the published seller KYB workflow; staging reads it from
 * NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID, the id `npm run marketplace:setup --
 * --activate` prints. While that is empty only the business verification is
 * off; the rest of the demo runs.
 */
export interface MarketWorkflows {
  /** The seller KYB workflow (registry, key people, documents, AML). */
  kyb: string;
  /** The adaptive age check the high-value rule opens for buyers. */
  age: string;
  /** VerificationSettings uuid of the KYC each key person runs. */
  person: string;
}

/** Where to try the demo when this server has no API key. */
export const STAGING_DEMO_URL = "https://demos.staging.didit.me/marketplace";
