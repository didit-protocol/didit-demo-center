import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { alder } from "../didit/demos.ts";

/**
 * The Alder customer's identity when Didit Authentication is off: a random
 * `vendor_data` in a signed, httpOnly cookie. With Authentication on the
 * customer is the signed-in Didit user instead (lib/didit/auth.ts).
 *
 * The routes scope every Didit call (sessions, tokens) to it, and signing
 * means knowing someone else's id, which the console view prints, is not
 * enough to read their records.
 */

export const CUSTOMER_COOKIE = "alder_customer";
export const CUSTOMER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const ID = new RegExp(`^${alder.vendorPrefix}[a-f0-9]{24}$`);

export function newCustomerId(): string {
  return `${alder.vendorPrefix}${randomBytes(12).toString("hex")}`;
}

function signature(customerId: string, secret: string): string {
  return createHmac("sha256", `alder-customer-v1:${secret}`)
    .update(customerId)
    .digest("base64url");
}

export function signCustomer(customerId: string, secret: string): string {
  return `${customerId}.${signature(customerId, secret)}`;
}

/** The customer id inside a cookie value, or null when missing or forged. */
export function verifyCustomer(
  cookie: string | null | undefined,
  secret: string,
): string | null {
  if (!cookie || !secret) return null;
  const dot = cookie.lastIndexOf(".");

  if (dot <= 0) return null;
  const customerId = cookie.slice(0, dot);

  if (!ID.test(customerId)) return null;

  const given = Buffer.from(cookie.slice(dot + 1));
  const expected = Buffer.from(signature(customerId, secret));

  return given.length === expected.length && timingSafeEqual(given, expected)
    ? customerId
    : null;
}
