import type { Page, Route } from "@playwright/test";

import fs from "node:fs";
import path from "node:path";

import { toAccountView } from "../lib/crypto-exchange/onboarding";
import { toTransactionView } from "../lib/crypto-exchange/transactions";

/**
 * The Didit side of /crypto-exchange (Kestrel) for the E2E suite.
 *
 * Transactions come from tests/fixtures/crypto-exchange: real responses
 * recorded on the staging application for a synthetic user. The withdrawal
 * recordings are ETH transfers; a submission answers with its recording
 * carrying the submitted asset, amount and wallet, the same way Didit
 * echoes them. Session decisions use the fields docs.didit.me documents for
 * a finished session, because the sandbox cannot pass KYC. Didit's hosted
 * pages (the verification flow, the wallet-ownership widget, the selfie)
 * are replaced by a stand-in page on the same host that reports completion
 * the way they do, with a `didit:completed` postMessage.
 *
 * Authentication is off in this suite (no publishable key), the production
 * path until it ships there: Kestrel's own sign-up opens the account.
 */

const FIXTURES = path.join(
  __dirname,
  "..",
  "tests",
  "fixtures",
  "crypto-exchange",
);
// The app builds for staging from .env; set NEXT_PUBLIC_IS_STAGING=false for a production build.
const STAGING = process.env.NEXT_PUBLIC_IS_STAGING !== "false";
const API = STAGING
  ? "https://verification.staging.didit.me"
  : "https://verification.didit.me";
const VERIFY = STAGING
  ? "https://verify.staging.didit.me"
  : "https://verify.didit.me";

export function raw(name: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES, `${name}.json`), "utf8"),
  );
}

export const USER_ID = String(raw("withdrawal-own-wallet").vendor_data);

/**
 * Account views. "processing" is the real decision of a session nobody has
 * started; the others use the field names docs.didit.me documents for a
 * finished session.
 */
const decided = (status: string, checks: string, amlHits: number) => ({
  session_id: raw("decision-not-started").session_id,
  status,
  id_verifications: [
    {
      status: checks,
      first_name: "Avery",
      last_name: "Quinn",
      document_type: "PASSPORT",
      issuing_state_name: "Portugal",
    },
  ],
  liveness_checks: [{ status: checks }],
  face_matches: [{ status: checks }],
  aml_screenings: [
    {
      status: status === "In Review" ? "In Review" : checks,
      total_hits: amlHits,
    },
  ],
});

export const ACCOUNTS = {
  processing: toAccountView(raw("decision-not-started")),
  approved: toAccountView(decided("Approved", "Approved", 0)),
  review: toAccountView(decided("In Review", "Approved", 2)),
  declined: toAccountView(decided("Declined", "Declined", 0)),
};

export type AccountKey = keyof typeof ACCOUNTS;

/** After a hosted action completes, the record Didit returns next. */
const AFTER_ACTION: Record<string, string> = {
  "withdrawal-own-wallet": "withdrawal-own-wallet-owned",
  "withdrawal-own-wallet-owned": "withdrawal-own-wallet-approved.derived",
};

function standInPage(title: string, sessionId: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fff;color:#0a0a0a">
<div style="text-align:center;max-width:280px">
<p style="font-size:18px;font-weight:600;margin:0 0 6px">${title}</p>
<p style="font-size:13px;color:#5d5d5d;margin:0 0 20px">Test stand-in for Didit's hosted page</p>
<button id="complete" style="height:44px;padding:0 22px;border:0;border-radius:999px;background:#2567ff;color:#fff;font-size:14px;cursor:pointer">Complete</button>
</div>
<script>
document.getElementById("complete").onclick = function () {
  parent.postMessage({ type: "didit:completed", data: { sessionId: "${sessionId}", status: "Approved" } }, "*");
};
</script></body></html>`;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });

interface Submitted {
  id: string;
  fixture: string;
  amount: string;
  currency: string;
  wallet: string;
  txnId: string;
}

/** A recording, carrying what this submission sent. */
function answer(submitted: Submitted): Record<string, unknown> {
  const record = raw(submitted.fixture);
  const methods = (record.payment_methods as Record<string, unknown>[]).map(
    (method) => ({ ...method, account_id: submitted.wallet }),
  );

  return {
    ...record,
    uuid: submitted.id,
    amount: submitted.amount,
    currency: submitted.currency,
    txn_id: submitted.txnId,
    payment_methods: methods,
  };
}

export interface KestrelMock {
  /** Didit transactions created so far, by id. */
  transactions: Map<string, Submitted>;
  requests: { method: string; url: string; body: unknown }[];
}

export async function mockKestrel(
  page: Page,
  options: {
    account?: AccountKey | null;
    afterOnboarding?: AccountKey;
    /** Kestrel's own sign-up already done in this browser. */
    signedUp?: boolean;
  } = {},
): Promise<KestrelMock> {
  let account = options.account === undefined ? "approved" : options.account;
  const mock: KestrelMock = { transactions: new Map(), requests: [] };
  const record = (route: Route) => {
    const request = route.request();

    mock.requests.push({
      method: request.method(),
      url: request.url(),
      body: request.postDataJSON?.() ?? null,
    });
  };

  if (options.signedUp ?? account !== null) {
    await page.addInitScript(() => {
      const key = "kestrel-demo:v2";

      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          profile: { email: "avery.quinn@example.com", country: "Portugal" },
          wallets: {
            BTC: "bc1q7p76rqpwr55pcg9c9nptkwvdztkywsqk4u6tp0",
            ETH: "0xb69303df0fc354d3202ec3233425c755483d3f28",
          },
          activity: [],
          sessionUrl: null,
        }),
      );
    });
  }

  await page.route("**/api/crypto-exchange/account", async (route) => {
    record(route);
    const method = route.request().method();

    if (method === "POST") {
      account = "processing";

      return json(
        route,
        {
          sessionId: ACCOUNTS.processing.sessionId,
          url: `${VERIFY}/session/e2e-onboarding`,
        },
        201,
      );
    }
    if (method === "DELETE") {
      account = null;

      return json(route, { ok: true });
    }

    return json(route, {
      account: account
        ? { ...ACCOUNTS[account], userId: USER_ID, console: null }
        : null,
    });
  });

  await page.route("**/api/crypto-exchange/token", async (route) => {
    record(route);

    return json(route, {
      token: "e2e-transaction-token",
      expiresAt: null,
      baseUrl: API,
    });
  });

  await page.route("**/api/crypto-exchange/transactions/*", async (route) => {
    record(route);
    const id = route.request().url().split("/").pop() ?? "";
    const submitted = mock.transactions.get(id);

    if (!submitted) return json(route, { error: "Not found." }, 404);

    return json(route, toTransactionView(answer(submitted)));
  });

  await page.route("**/api/didit/events-token", (route) =>
    json(route, { error: "Nobody is signed in." }, 401),
  );

  // What the web SDK's submitTransaction posts to.
  await page.route(`${API}/v1/transactions/`, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    record(route);
    const body = route.request().postDataJSON();
    const props = body?.props ?? {};
    const info = body?.info ?? {};
    const wallet = String(body?.counterparty?.paymentMethod?.accountId ?? "");
    let fixture = "";

    if (props.deposit_source)
      fixture =
        props.deposit_source === "unknown-sender"
          ? "deposit-unknown-sender"
          : info.currency === "BTC"
            ? "deposit-own-wallet-btc"
            : "deposit-own-wallet";
    else if (props.withdrawal_destination === "own-wallet")
      fixture = "withdrawal-own-wallet";
    else if (/^0x098B716B8Aaf21512996dC57EB0615e2383E2f96$/i.test(wallet))
      fixture = "withdrawal-sanctioned";
    if (!fixture)
      return json(route, { detail: "No recording for this transfer." }, 400);
    const submitted: Submitted = {
      id: `00000000-0000-4000-8000-${String(mock.transactions.size + 1).padStart(12, "0")}`,
      fixture,
      amount: String(info.amount),
      currency: String(info.currency),
      wallet,
      txnId: String(body.txnId),
    };
    const response = answer(submitted);

    mock.transactions.set(submitted.id, submitted);

    return json(route, response, 201);
  });

  // Didit's hosted pages: the verification flow, the wallet widget, the selfie.
  await page.route(`${VERIFY}/**`, async (route) => {
    const url = route.request().url();

    if (!url.includes("/wallet-ownership/") && !url.includes("/session/"))
      return route.fulfill({ status: 204, body: "" });
    let title = "Didit verification";

    if (url.includes("e2e-onboarding")) {
      title = "Verify your identity";
      if (options.afterOnboarding) account = options.afterOnboarding;
    }
    // Opening an action moves the recorded transaction on to what Didit
    // returned after that action finished.
    for (const [id, submitted] of Array.from(mock.transactions)) {
      const view = toTransactionView(raw(submitted.fixture));

      if (view.action && url.startsWith(view.action.url.split("?")[0])) {
        const next = AFTER_ACTION[submitted.fixture];

        if (next) mock.transactions.set(id, { ...submitted, fixture: next });
        title =
          view.action.type === "wallet_ownership"
            ? "Verify wallet ownership"
            : "Selfie check";
      }
    }

    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: standInPage(title, "e2e-session"),
    });
  });

  return mock;
}

/** Finishes whatever Didit page the SDK modal is showing. */
export async function completeHostedFlow(page: Page) {
  const frame = page.frameLocator(`iframe[src^="${VERIFY}"]`);

  await frame.getByRole("button", { name: "Complete" }).click();
}
