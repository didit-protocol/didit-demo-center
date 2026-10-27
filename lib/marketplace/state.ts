import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The marketplace's "database": one signed, httpOnly cookie per browser.
 *
 * It holds the shops this browser opened, the buyer id it shops as, and the
 * uuids of the transactions it submitted - nothing else. Every server route
 * only ever reads a session or a transaction whose id is in THIS cookie, so a
 * visitor sees their own records and never anyone else's, and because the
 * cookie is signed they cannot swap another id in.
 */
export const STATE_COOKIE = "marketplace_demo";

/** A week, the same as a hosted session's default expiry. */
export const STATE_MAX_AGE = 7 * 24 * 60 * 60;

/** Two shops tell the fraud story; a third leaves room for a retry. */
export const MAX_SELLERS = 3;

/** Oldest transactions fall off first so the cookie stays far below 4 KB. */
export const MAX_TRANSACTIONS = 20;

export interface SellerRecord {
  /** `vendor_data` of the business everywhere: KYB session, transactions. */
  id: string;
  /** Storefront name shown to buyers. */
  shop: string;
  /** Legal name the KYB registry search starts from. */
  company: string;
  /** ISO 3166-1 alpha-2 registry country. */
  country: string;
  /** The KYB session, once started. */
  sid: string | null;
  /** The seller sign-up transaction, once submitted. */
  signup: string | null;
}

export interface MarketState {
  v: 1;
  /** Buyer `vendor_data`, created on the first purchase. */
  buyer: string | null;
  /** Oldest first. */
  sellers: SellerRecord[];
  /** Transaction uuids this browser submitted, oldest first. */
  tx: string[];
  /** Created at, epoch ms. */
  at: number;
}

export function emptyState(now: number): MarketState {
  return { v: 1, buyer: null, sellers: [], tx: [], at: now };
}

/**
 * The signing key is derived from the server-side API key, so the demo needs
 * no extra secret and the key itself is never used directly.
 */
export function stateKey(apiKey: string): Buffer {
  return createHash("sha256")
    .update(`didit-demo-center/marketplace-state/${apiKey}`)
    .digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function sealState(state: MarketState, key: Buffer): string {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString(
    "base64url",
  );

  return `${payload}.${sign(payload, key)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A cookie identity, or the signed-in Didit user's (lib/didit/config.ts).
const VENDOR =
  /^(mkt-(seller|buyer)-[a-z0-9]{12}|northmarket-[A-Za-z0-9_-]{6,80}(-buyer)?)$/;

const isUuidOrNull = (value: unknown) =>
  value === null || (typeof value === "string" && UUID.test(value));

function isSeller(value: unknown): value is SellerRecord {
  const s = value as SellerRecord;

  return (
    !!s &&
    typeof s.id === "string" &&
    VENDOR.test(s.id) &&
    typeof s.shop === "string" &&
    typeof s.company === "string" &&
    typeof s.country === "string" &&
    isUuidOrNull(s.sid) &&
    isUuidOrNull(s.signup)
  );
}

function isState(value: unknown): value is MarketState {
  const s = value as MarketState;

  return (
    !!s &&
    s.v === 1 &&
    (s.buyer === null ||
      (typeof s.buyer === "string" && VENDOR.test(s.buyer))) &&
    Array.isArray(s.sellers) &&
    s.sellers.length <= MAX_SELLERS &&
    s.sellers.every(isSeller) &&
    Array.isArray(s.tx) &&
    s.tx.length <= MAX_TRANSACTIONS &&
    s.tx.every((id) => typeof id === "string" && UUID.test(id)) &&
    typeof s.at === "number"
  );
}

/** Returns the state, or null for a missing, tampered, expired or malformed cookie. */
export function openState(
  token: string | undefined,
  key: Buffer,
  now: number = Date.now(),
): MarketState | null {
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");

  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, key));
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return null;

  try {
    const state = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    if (!isState(state)) return null;
    if (now - state.at > STATE_MAX_AGE * 1000) return null;

    return state;
  } catch {
    return null;
  }
}

/** Every `vendor_data` this browser owns: the buyer and each shop. */
export function ownedVendors(state: MarketState): string[] {
  return [
    ...(state.buyer ? [state.buyer] : []),
    ...state.sellers.map((seller) => seller.id),
  ];
}

export function withTransaction(state: MarketState, uuid: string): MarketState {
  if (state.tx.includes(uuid)) return state;

  return { ...state, tx: [...state.tx, uuid].slice(-MAX_TRANSACTIONS) };
}

export function withSeller(
  state: MarketState,
  id: string,
  patch: Partial<Omit<SellerRecord, "id">>,
): MarketState {
  return {
    ...state,
    sellers: state.sellers.map((seller) =>
      seller.id === id ? { ...seller, ...patch } : seller,
    ),
  };
}

/** `mkt-seller-` / `mkt-buyer-` plus 12 lowercase hex characters of a uuid. */
export function vendorId(kind: "seller" | "buyer", uuid: string): string {
  return `mkt-${kind}-${uuid.replace(/-/g, "").slice(0, 12).toLowerCase()}`;
}
