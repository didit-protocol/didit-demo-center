/**
 * Where the marketplace runs, and against which Didit objects.
 *
 * The demo runs on STAGING (`NEXT_PUBLIC_IS_STAGING=true`), against the demo
 * organization's application: that is where its KYB workflow and its three
 * rules live (see lib/marketplace/setup.ts and scripts/marketplace-setup.mjs).
 * A KYB registry search with UBOs is billed per company on production, so on
 * any other environment the routes answer 503 and the page says where the
 * demo runs instead of failing half-way through onboarding.
 */
export interface MarketWorkflows {
  /** The seller KYB workflow created by `npm run marketplace:setup`. */
  kyb: string;
  /** The adaptive age check the high-value rule opens for buyers. */
  age: string;
  /** VerificationSettings uuid of the KYC each key person runs. */
  person: string;
}

/** Staging ids. Production has none: the demo does not run there. */
export const STAGING_WORKFLOWS: MarketWorkflows = {
  kyb: "",
  // "6. ADAPTIVE AGE ESTIMATION", the catalogue's own age demo on staging.
  age: "8482aee5-38b8-46fd-914b-e1bc6edcadca",
  // "1. FREE KYC", the catalogue's Core KYC demo on staging.
  person: "2db28cd2-7713-405f-89ad-144613b7086e",
};

export const STAGING_DEMO_URL = "https://demos.staging.didit.me/marketplace";

export function isMarketplaceLive(isStaging: boolean): boolean {
  return isStaging && Boolean(STAGING_WORKFLOWS.kyb);
}
