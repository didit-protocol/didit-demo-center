/**
 * The marketplace's server side, as plain functions.
 *
 * Every route in app/api/marketplace is a thin wrapper around one handler
 * here. A handler takes the environment (API key, base URL, fetch, clock), the
 * visitor's signed state and the request input, and returns a status, a body
 * and the next state - so the whole server can be exercised in `npm test`
 * against recorded API responses, with no Next.js runtime.
 *
 * Two rules hold everywhere:
 *  - the API key never leaves the server; the browser only ever receives a
 *    short-lived transaction token minted for one of its own identities;
 *  - a session or transaction is read only when its id is in the visitor's
 *    signed state, and only a trimmed summary is returned (lib/marketplace/
 *    summaries.ts).
 */
import type { ConsoleTarget } from "./console-links.ts";
import type { MarketWorkflows } from "./config.ts";
import type { MarketState, SellerRecord } from "./state.ts";
import type { KybSummary, TransactionSummary } from "./summaries.ts";

import { callDidit } from "../didit/server.ts";

import { BRAND, isSellerCountry } from "./catalog.ts";
import { consoleLink, type ConsoleLink } from "./console-links.ts";
import { STAGING_DEMO_URL } from "./config.ts";
import { DEMO_APP } from "./setup.ts";
import {
  MAX_SELLERS,
  emptyState,
  ownedVendors,
  vendorId,
  withSeller,
  withTransaction,
} from "./state.ts";
import { kybRestartable, payoutsUnlocked } from "./status.ts";
import {
  isMarketplaceTransaction,
  subjectVendor,
  summarizeKyb,
  summarizeTransaction,
} from "./summaries.ts";

export interface MarketEnv {
  apiKey: string;
  /** `https://verification.staging.didit.me` on staging. */
  apiBase: string;
  isStaging: boolean;
  workflows: MarketWorkflows;
  /**
   * With Didit Authentication on: the signed-in visitor's `vendor_data`
   * (`northmarket-<user id>`), or null when nobody is signed in. Their shop
   * and their buyer take it instead of a random cookie id. Undefined when
   * Authentication is off.
   */
  visitor?: string | null;
  console: ConsoleTarget;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  now: () => number;
  newId: () => string;
}

export interface Reply {
  status: number;
  body: unknown;
  /** Omitted: keep the cookie. `null`: clear it. A state: write it. */
  state?: MarketState | null;
}

/** Transaction tokens live five minutes and cover the submit plus a re-read. */
export const TOKEN_TTL_SECONDS = 300;
export const TOKEN_MAX_USES = 3;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (status: number, error: string, code?: string): Reply => ({
  status,
  body: code ? { error, code } : { error },
});

/* ── Availability ────────────────────────────────────────────────── */

export interface Availability {
  /** Orders, payouts and sign-ups: an API key. */
  transactions: boolean;
  /**
   * Seller KYB: additionally a KYB workflow id. The page reads this before
   * anyone clicks, so "Verify my business" is off where the KYB cannot start.
   */
  kyb: boolean;
}

export function availability(env: MarketEnv): Availability {
  const transactions = Boolean(env.apiKey);

  return { transactions, kyb: transactions && UUID.test(env.workflows.kyb) };
}

function notLive(env: MarketEnv): Reply | null {
  if (availability(env).transactions) return null;

  return {
    status: 503,
    body: {
      error: `The marketplace demo has no Didit API key on this server. Try it on ${STAGING_DEMO_URL}`,
      code: "not_configured",
    },
  };
}

/** Authentication is on and nobody is signed in. */
function signedOut(env: MarketEnv): Reply | null {
  if (env.visitor !== null) return null;

  return fail(401, "Sign in to Northmarket first.", "signed_out");
}

/** The buyer `vendor_data` for the signed-in visitor. */
export function buyerOf(visitor: string): string {
  return `${visitor}-buyer`;
}

function kybNotLive(env: MarketEnv): Reply | null {
  if (availability(env).kyb) return null;

  return fail(
    503,
    "The seller KYB workflow is not published on this environment yet, so business verification cannot start. Everything else in the demo runs.",
    "kyb_workflow_missing",
  );
}

/* ── Didit API ───────────────────────────────────────────────────── */

interface ApiResult {
  ok: boolean;
  status: number;
  data: unknown;
}

async function didit(
  env: MarketEnv,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<ApiResult> {
  const result = await callDidit(method, path, body, {
    apiBase: env.apiBase,
    apiKey: env.apiKey,
    fetch: env.fetch,
    timeoutMs: 20000,
  });

  return { ok: result.ok, status: result.status, data: result.data };
}

/** The API's own message when it gives one, so the page can say why. */
function apiMessage(result: ApiResult, fallback: string): string {
  if (isRecord(result.data)) {
    for (const key of ["detail", "error", "message", "non_field_errors"]) {
      const value = result.data[key];

      if (typeof value === "string" && value) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }

  return result.status === 0 ? "The Didit API could not be reached." : fallback;
}

function upstream(result: ApiResult, fallback: string): Reply {
  const status =
    result.status === 400 || result.status === 404 || result.status === 409
      ? result.status
      : 502;

  return fail(status, apiMessage(result, fallback));
}

/* ── Views ───────────────────────────────────────────────────────── */

export interface SellerView {
  id: string;
  shop: string;
  company: string;
  country: string;
  signup: string | null;
  kyb: KybSummary | null;
  /** Set when the decision could not be read right now. */
  kybError: string | null;
  /** The KYB in Console v2, once there is one. */
  kybLink: ConsoleLink | null;
}

export interface StateView {
  availability: Availability;
  stagingUrl: string;
  buyer: string | null;
  sellers: SellerView[];
  transactions: TransactionSummary[];
}

async function readDecision(
  env: MarketEnv,
  sessionId: string,
): Promise<{ kyb: KybSummary | null; error: string | null; raw: Json | null }> {
  const result = await didit(env, "GET", `/v3/session/${sessionId}/decision/`);

  if (!result.ok || !isRecord(result.data)) {
    return {
      kyb: null,
      error: apiMessage(result, "The business verification could not be read."),
      raw: null,
    };
  }

  return { kyb: summarizeKyb(result.data), error: null, raw: result.data };
}

async function sellerView(
  env: MarketEnv,
  seller: SellerRecord,
  target: ConsoleTarget | null,
): Promise<SellerView> {
  const decision = seller.sid
    ? await readDecision(env, seller.sid)
    : { kyb: null, error: null };

  return {
    id: seller.id,
    shop: seller.shop,
    company: seller.company,
    country: seller.country,
    signup: seller.signup,
    kyb: decision.kyb,
    kybError: decision.error,
    kybLink:
      seller.sid && target
        ? consoleLink(target, { kind: "kyb", id: seller.sid })
        : null,
  };
}

function consoleTarget(
  env: MarketEnv,
  ids: { orgId: string; appId: string } | null,
): ConsoleTarget {
  return {
    origin: env.console.origin,
    orgId: ids?.orgId ?? null,
    appId: ids?.appId ?? null,
  };
}

async function readTransaction(
  env: MarketEnv,
  uuid: string,
): Promise<{ raw: Json | null; result: ApiResult }> {
  const result = await didit(env, "GET", `/v3/transactions/${uuid}/`);

  return {
    raw: result.ok && isRecord(result.data) ? result.data : null,
    result,
  };
}

/* ── Handlers ────────────────────────────────────────────────────── */

/** GET /api/marketplace - everything the page shows for this browser. */
export async function handleState(
  env: MarketEnv,
  state: MarketState | null,
): Promise<Reply> {
  const live = availability(env);
  const current = state ?? emptyState(env.now());
  const target =
    live.transactions && current.sellers.some((seller) => seller.sid)
      ? consoleTarget(env, await resolveConsoleIds(env))
      : null;
  const [sellers, transactions] = await Promise.all([
    live.transactions
      ? Promise.all(
          current.sellers.map((seller) => sellerView(env, seller, target)),
        )
      : Promise.resolve([]),
    live.transactions
      ? Promise.all(current.tx.map((uuid) => readTransaction(env, uuid)))
      : Promise.resolve([]),
  ]);

  const view: StateView = {
    availability: live,
    stagingUrl: STAGING_DEMO_URL,
    buyer: current.buyer,
    sellers,
    transactions: transactions
      .map(({ raw }) => (raw ? summarizeTransaction(raw) : null))
      .filter((summary): summary is TransactionSummary => Boolean(summary))
      .reverse(),
  };

  return { status: 200, body: view };
}

/** DELETE /api/marketplace - start over with a clean browser identity. */
export function handleReset(): Reply {
  return { status: 200, body: { ok: true }, state: null };
}

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.replace(/\s+/g, " ").trim();

  return trimmed.length >= 2 && trimmed.length <= max ? trimmed : null;
};

/** POST /api/marketplace/sellers - open a shop. */
export async function handleOpenShop(
  env: MarketEnv,
  state: MarketState | null,
  input: unknown,
): Promise<Reply> {
  const blocked = notLive(env) ?? signedOut(env);

  if (blocked) return blocked;

  const body = isRecord(input) ? input : {};
  const shop = clean(body.shop, 40);
  // The legal name and registry country help the registry search; the
  // seller can also find the company inside the KYB itself.
  const company =
    body.company === undefined || body.company === ""
      ? shop
      : clean(body.company, 80);
  const country = typeof body.country === "string" ? body.country : "";

  if (!shop) return fail(400, "Give the shop a name of 2 to 40 characters.");
  if (!company)
    return fail(400, "Enter the company's legal name (2 to 80 characters).");
  if (country && !isSellerCountry(country))
    return fail(400, "Pick one of the registry countries in the list.");

  const current = state ?? emptyState(env.now());

  if (env.visitor && current.sellers.some((s) => s.id === env.visitor)) {
    return fail(
      409,
      "This account already runs a shop. Sign up again to open another one.",
      "shop_exists",
    );
  }

  if (current.sellers.length >= MAX_SELLERS) {
    return fail(
      409,
      `This browser already opened ${MAX_SELLERS} shops. Start over to open more.`,
      "too_many_shops",
    );
  }

  const seller: SellerRecord = {
    id: env.visitor ?? vendorId("seller", env.newId()),
    shop,
    company,
    country,
    sid: null,
    signup: null,
  };
  const next = { ...current, sellers: [...current.sellers, seller] };

  return {
    status: 201,
    body: { seller: await sellerView(env, seller, null) },
    state: next,
  };
}

export type TokenPurpose = "signup" | "purchase" | "payout";

export interface TokenGrant {
  token: string;
  expiresAt: string | null;
  baseUrl: string;
  subject: { vendorData: string; name: string; type: "individual" | "company" };
}

/**
 * POST /api/marketplace/token - a transaction token for one of this browser's
 * identities. The server decides who the subject is; the browser can never
 * submit on behalf of anyone else, and a payout token is refused until the
 * shop's KYB is approved.
 */
export async function handleToken(
  env: MarketEnv,
  state: MarketState | null,
  input: unknown,
): Promise<Reply> {
  const blocked = notLive(env) ?? signedOut(env);

  if (blocked) return blocked;

  const body = isRecord(input) ? input : {};
  const purpose = body.purpose as TokenPurpose;
  let current = state ?? emptyState(env.now());
  let subject: TokenGrant["subject"];

  if (purpose === "purchase") {
    const buyer = env.visitor
      ? buyerOf(env.visitor)
      : (current.buyer ?? vendorId("buyer", env.newId()));

    if (current.buyer !== buyer) current = { ...current, buyer };
    subject = {
      vendorData: current.buyer as string,
      name: `${BRAND.name} buyer`,
      type: "individual",
    };
  } else if (purpose === "signup" || purpose === "payout") {
    const seller = current.sellers.find((s) => s.id === body.seller);

    if (!seller) return fail(404, "That shop was not opened in this browser.");

    if (purpose === "signup" && seller.signup) {
      return fail(409, "This shop's sign-up was already reported.");
    }
    if (purpose === "payout") {
      if (!seller.sid) {
        return fail(
          409,
          "Payouts unlock once the business is verified. Verify the business first.",
          "payouts_locked",
        );
      }

      const decision = await readDecision(env, seller.sid);

      if (!decision.kyb) return fail(502, decision.error ?? "KYB unavailable.");
      if (!payoutsUnlocked(decision.kyb.status)) {
        return fail(
          409,
          `Payouts unlock once the business verification is approved. It is ${decision.kyb.status || "not finished"}.`,
          "payouts_locked",
        );
      }
    }
    subject = { vendorData: seller.id, name: seller.company, type: "company" };
  } else {
    return fail(400, "Unknown token purpose.");
  }

  const minted = await didit(env, "POST", "/v3/transactions/sdk-token/", {
    vendor_data: subject.vendorData,
    ttl_seconds: TOKEN_TTL_SECONDS,
    max_uses: TOKEN_MAX_USES,
  });

  if (!minted.ok || !isRecord(minted.data) || !minted.data.sdk_token) {
    return upstream(minted, "The transaction token could not be minted.");
  }

  const grant: TokenGrant = {
    token: String(minted.data.sdk_token),
    expiresAt:
      typeof minted.data.expires_at === "string"
        ? minted.data.expires_at
        : null,
    baseUrl: env.apiBase,
    subject,
  };

  return {
    status: 200,
    body: grant,
    ...(current !== state ? { state: current } : {}),
  };
}

/**
 * POST /api/marketplace/transactions - remember a transaction the web SDK
 * just submitted. It is accepted only when Didit says its subject is one of
 * this browser's identities and it carries this demo's `demo_app`, so a
 * visitor cannot claim someone else's transaction by its uuid.
 */
export async function handleClaim(
  env: MarketEnv,
  state: MarketState | null,
  input: unknown,
): Promise<Reply> {
  const blocked = notLive(env);

  if (blocked) return blocked;

  const uuid = isRecord(input) ? input.uuid : null;

  if (typeof uuid !== "string" || !UUID.test(uuid)) {
    return fail(400, "A transaction uuid is required.");
  }

  const current = state ?? emptyState(env.now());
  const { raw, result } = await readTransaction(env, uuid);

  if (!raw) return upstream(result, "The transaction could not be read.");

  const subject = subjectVendor(raw);

  if (
    !isMarketplaceTransaction(raw) ||
    !subject ||
    !ownedVendors(current).includes(subject)
  ) {
    return fail(404, "That transaction does not belong to this browser.");
  }

  const summary = summarizeTransaction(raw);
  let next = withTransaction(current, uuid);

  if (summary.kind === "signup") {
    const seller = next.sellers.find((s) => s.id === subject);

    if (seller && !seller.signup) {
      next = withSeller(next, seller.id, { signup: uuid });
    }
  }

  return { status: 200, body: summary, state: next };
}

function ownsTransaction(state: MarketState | null, uuid: string): boolean {
  return Boolean(state && UUID.test(uuid) && state.tx.includes(uuid));
}

/** GET /api/marketplace/transactions/{uuid} - one of this browser's transactions. */
export async function handleTransaction(
  env: MarketEnv,
  state: MarketState | null,
  uuid: string,
): Promise<Reply> {
  const blocked = notLive(env);

  if (blocked) return blocked;
  if (!ownsTransaction(state, uuid)) {
    return fail(404, "That transaction does not belong to this browser.");
  }

  const { raw, result } = await readTransaction(env, uuid);

  if (!raw) return upstream(result, "The transaction could not be read.");

  return { status: 200, body: summarizeTransaction(raw) };
}

/**
 * The hosted flow's redirect target. Only this site's own hosts (and a local
 * dev server) are trusted from the Origin header; anything else gets the
 * configured site URL.
 */
export function safeOrigin(origin: string | null, fallback: string): string {
  try {
    const url = new URL(origin ?? "");
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const didit =
      url.protocol === "https:" &&
      (url.hostname === "didit.me" || url.hostname.endsWith(".didit.me"));

    return local || didit ? url.origin : new URL(fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

/**
 * POST /api/marketplace/sellers/{id}/kyb - start (or resume) the shop's
 * business verification and return the hosted-flow URL for the web SDK.
 */
export async function handleStartKyb(
  env: MarketEnv,
  state: MarketState | null,
  sellerId: string,
  options: { origin: string | null; fallbackOrigin: string; language: string },
): Promise<Reply> {
  const blocked = notLive(env) ?? signedOut(env) ?? kybNotLive(env);

  if (blocked) return blocked;

  const seller = state?.sellers.find((s) => s.id === sellerId);

  if (!state || !seller) {
    return fail(404, "That shop was not opened in this browser.");
  }

  if (seller.sid) {
    const decision = await readDecision(env, seller.sid);

    if (decision.kyb?.url) {
      return {
        status: 200,
        body: { sessionId: seller.sid, url: decision.kyb.url, resumed: true },
      };
    }
    if (!decision.kyb) {
      // Unknown is not "finished": never open a second session on a guess.
      return fail(502, decision.error ?? "KYB unavailable.");
    }
    if (!kybRestartable(decision.kyb.status)) {
      return fail(
        409,
        "This business verification is already submitted. Follow it in the status card.",
      );
    }
  }

  const origin = safeOrigin(options.origin, options.fallbackOrigin);
  const created = await didit(env, "POST", "/v3/session/", {
    workflow_id: env.workflows.kyb,
    vendor_data: seller.id,
    callback: `${origin}/marketplace`,
    callback_method: "both",
    language: options.language,
    metadata: { demo_app: DEMO_APP, shop: seller.shop },
    expected_details: {
      company_name: seller.company,
      ...(seller.country ? { registry_country: seller.country } : {}),
    },
  });

  if (
    !created.ok ||
    !isRecord(created.data) ||
    typeof created.data.session_id !== "string" ||
    typeof created.data.url !== "string"
  ) {
    return upstream(created, "The business verification could not start.");
  }

  return {
    status: 201,
    body: {
      sessionId: created.data.session_id,
      url: created.data.url,
      resumed: false,
    },
    state: withSeller(state, seller.id, { sid: created.data.session_id }),
  };
}

/** GET /api/marketplace/sellers/{id}/kyb - the shop's KYB, trimmed. */
export async function handleKyb(
  env: MarketEnv,
  state: MarketState | null,
  sellerId: string,
): Promise<Reply> {
  const blocked = notLive(env);

  if (blocked) return blocked;

  const seller = state?.sellers.find((s) => s.id === sellerId);

  if (!seller) return fail(404, "That shop was not opened in this browser.");
  if (!seller.sid) return { status: 200, body: { kyb: null } };

  const decision = await readDecision(env, seller.sid);

  if (!decision.kyb) return fail(502, decision.error ?? "KYB unavailable.");

  return { status: 200, body: { kyb: decision.kyb } };
}

/* ── Console links ───────────────────────────────────────────────── */

const consoleIdCache = new Map<string, { orgId: string; appId: string }>();

/**
 * The console organization and application behind API_KEY. Configured ids win;
 * otherwise they are read once from the attribution fields of the newest
 * transaction row, which every v3 transaction list carries.
 */
export async function resolveConsoleIds(
  env: MarketEnv,
): Promise<{ orgId: string; appId: string } | null> {
  if (env.console.orgId && env.console.appId) {
    return { orgId: env.console.orgId, appId: env.console.appId };
  }

  const cached = consoleIdCache.get(env.apiBase);

  if (cached) return cached;

  const result = await didit(env, "GET", "/v3/transactions/?limit=1");
  const row =
    isRecord(result.data) && Array.isArray(result.data.results)
      ? result.data.results[0]
      : null;

  if (
    isRecord(row) &&
    typeof row.organization_id === "string" &&
    typeof row.application_id === "string"
  ) {
    const ids = { orgId: row.organization_id, appId: row.application_id };

    consoleIdCache.set(env.apiBase, ids);

    return ids;
  }

  return null;
}

/** For tests: forget the ids read from the API. */
export function clearConsoleIdCache() {
  consoleIdCache.clear();
}
