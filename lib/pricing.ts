import { docs } from "./docs";

/**
 * Published Didit prices, in one place.
 *
 * Every price string in the catalogue is composed from this table so a demo
 * card can never drift from the price list. The numbers are the PUBLISHED
 * list prices from docs.didit.me/getting-started/pricing - not what any one
 * application's workflow happens to total, which varies per configuration.
 *
 * Last checked against the docs: 2026-09-06. AML Screening ($0.35 -> $0.20)
 * and Proof of Address ($0.50 -> $0.20) were both reduced at the v3 launch;
 * the catalogue previously quoted the old figures.
 */

export const PRICING_URL = docs("getting-started/pricing");

/** Features with 500 free checks per organisation per month. */
export const FREE_TIER_FEATURES = [
  "ID Verification",
  "Passive Liveness",
  "Face Match 1:1",
  "Device & IP Analysis",
] as const;

export const FREE_TIER_MONTHLY = 500;

/**
 * Per-feature price inside a workflow, after the free tier where one applies.
 * `freeTier` marks the four features covered by the 500/month allowance.
 */
export const MODULE_PRICE = {
  "ID Verification": { usd: 0.15, freeTier: true },
  "Passive Liveness": { usd: 0.1, freeTier: true },
  "Active Liveness": { usd: 0.15, freeTier: false },
  "Face Match 1:1": { usd: 0.05, freeTier: true },
  "Device & IP Analysis": { usd: 0.03, freeTier: true },
  "NFC Verification": { usd: 0.15, freeTier: false },
  "Biometric Authentication": { usd: 0.1, freeTier: false },
  "Email Verification": { usd: 0.03, freeTier: false },
  "Age Estimation": { usd: 0.1, freeTier: false },
  "AML Screening": { usd: 0.2, freeTier: false },
  "Proof of Address": { usd: 0.2, freeTier: false },
  "Document AI": { usd: 0.2, freeTier: false },
  Questionnaire: { usd: 0.1, freeTier: false },
  "White Label": { usd: 0.2, freeTier: false },
  "Reusable KYC": { usd: 0, freeTier: false },
} as const;

/** Prices that are not a flat per-check number. */
export const VARIABLE_PRICE = {
  /** Dynamic carrier rates on top of the platform fee. */
  phoneVerification: "$0.04 + carrier fee",
  /** Per successful query, per service; $0.05-$7.00 and never free-tier. */
  databaseValidation: "varies by country",
  amlMonitoring: "$0.07 / year",
} as const;

/** Headline product-line prices. */
export const PRODUCT_PRICE = {
  /** ID + passive liveness + face match + device & IP analysis. */
  fullKycBundle: 0.33,
  /** KYB registry, by tier. */
  kybRegistryLite: 2.0,
  kybRegistryShareholders: "$4.00 - $5.00",
  kybRegistryUbos: "$5.00 - $9.00",
  /** Per screened transaction. */
  transactionScreening: 0.02,
  /** Per wallet screen; $0.02 when you bring your own provider key. */
  walletScreening: 0.15,
  walletScreeningByok: 0.02,
} as const;

/** Standalone (server-to-server) API prices, where they differ in-workflow. */
export const STANDALONE_PRICE = {
  "Face Match": 0.05,
  "Face Search": 0.05,
  "Age Estimation": 0.1,
  "ID Verification": 0.2,
  "Proof of Address": 0.2,
  "Document AI": 0.2,
  "AML Screening": 0.2,
  "Passive Liveness": 0.05,
  "Email Verification": 0.03,
} as const;

export function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * The one line a demo card shows. Free-tier flows lead with the allowance,
 * because that is the honest headline for a flow a visitor can run for free.
 */
export function freeTierPrice(afterFreeTier: number): string {
  return `Free · ${FREE_TIER_MONTHLY} checks / month, then ${usd(afterFreeTier)}`;
}

/**
 * Backend-only features run automatically once their dependencies are met -
 * the user never sees a step for them, so a demo that includes one spends
 * money on every completed session with nothing on screen to warn you.
 * See docs.didit.me/console/workflows#feature-node-categories.
 */
export const BACKEND_ONLY_FEATURES = [
  "AML Screening",
  "Database Validation",
  "Device & IP Analysis",
] as const;

/** Backend-only AND paid from the first check - never put these in a demo. */
export const BACKEND_ONLY_PAID = [
  "AML Screening",
  "Database Validation",
] as const;
