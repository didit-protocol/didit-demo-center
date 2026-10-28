/**
 * The transactions the marketplace hands to `DiditSdk.shared.submitTransaction`.
 *
 * The subject is decided by the server (it mints the token for one of this
 * browser's identities; Didit enforces the token's vendor_data over anything
 * sent here), and every payload carries `custom_properties.demo_app` so the
 * demo's rules only ever see the demo's own traffic.
 *
 * https://docs.didit.me/transaction-monitoring/sdk-transaction-submission
 */
import type { DiditTransactionPayload } from "@didit-protocol/sdk-web";
import type { Listing } from "./catalog.ts";
import type { TokenGrant } from "./server.ts";

import { CURRENCY } from "./catalog.ts";
import { ACTIONS, DEMO_APP } from "./setup.ts";

/** Your own unique transaction id: kind plus a random suffix. */
export function transactionId(kind: string, random: string): string {
  return `mkt-${kind}-${random.replace(/-/g, "").slice(0, 20)}`;
}

function subjectOf(grant: TokenGrant) {
  return { type: grant.subject.type, fullName: grant.subject.name };
}

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

/** A seller opening a shop: a zero-amount platform event. */
export function signupTransaction(
  grant: TokenGrant,
  shop: string,
  random: string,
): DiditTransactionPayload {
  return {
    txnId: transactionId("signup", random),
    zoneId: timeZone(),
    category: "user_event",
    details: {
      direction: "in",
      amount: 0,
      currency: CURRENCY,
      actionType: ACTIONS.signup,
      paymentDetails: `Seller sign-up: ${shop}`,
    },
    subject: subjectOf(grant),
    customProperties: { demo_app: DEMO_APP, role: "seller", shop },
  };
}

/** A buyer paying for a listing; the shop is the counterparty. */
export function purchaseTransaction(
  grant: TokenGrant,
  listing: Listing,
  seller: { id: string; shop: string } | null,
  random: string,
): DiditTransactionPayload {
  return {
    txnId: transactionId("order", random),
    zoneId: timeZone(),
    category: "finance",
    details: {
      direction: "in",
      amount: listing.price,
      currency: CURRENCY,
      actionType: ACTIONS.purchase,
      paymentDetails: `Order: ${listing.title}`,
    },
    subject: subjectOf(grant),
    ...(seller
      ? {
          counterparty: {
            type: "company",
            externalUserId: seller.id,
            fullName: seller.shop,
          },
        }
      : {}),
    customProperties: {
      demo_app: DEMO_APP,
      role: "buyer",
      listing: listing.id,
    },
  };
}

/** A shop withdrawing its balance to its bank account. */
export function payoutTransaction(
  grant: TokenGrant,
  amount: number,
  random: string,
): DiditTransactionPayload {
  return {
    txnId: transactionId("payout", random),
    zoneId: timeZone(),
    category: "finance",
    details: {
      direction: "out",
      amount,
      currency: CURRENCY,
      actionType: ACTIONS.payout,
      paymentDetails: "Seller payout to the shop's bank account",
    },
    subject: subjectOf(grant),
    customProperties: { demo_app: DEMO_APP, role: "seller" },
  };
}

/** Payout amounts the form accepts, in whole euros. */
export const PAYOUT_LIMITS = { min: 10, max: 20000 } as const;

export function parsePayoutAmount(value: string): number | null {
  const amount = Number(value.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(amount)) return null;
  if (amount < PAYOUT_LIMITS.min || amount > PAYOUT_LIMITS.max) return null;

  return Math.round(amount * 100) / 100;
}
