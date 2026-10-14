import type { Page, Route } from "@playwright/test";

import fs from "node:fs";
import path from "node:path";

import { toAccountView } from "../lib/crypto-exchange/onboarding";
import {
  SANCTIONED_WALLET,
  toTransactionView,
} from "../lib/crypto-exchange/transactions";

/**
 * The Didit side of the /crypto-exchange demo, for the E2E suite.
 *
 * Transactions come from tests/fixtures/crypto-exchange: real responses
 * recorded on the staging application for a synthetic user, run through the
 * same `toTransactionView` the server routes use. Didit's hosted pages (the
 * verification flow, the wallet-ownership widget) are replaced by a small
 * stand-in page on the same host that reports completion the way they do, with
 * a `didit:completed` postMessage.
 */

const FIXTURES = path.join(
  __dirname,
  "..",
  "tests",
  "fixtures",
  "crypto-exchange",
);
const VERIFY = "https://verify.staging.didit.me";
const API = "https://verification.staging.didit.me";

export function raw(name: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES, `${name}.json`), "utf8"),
  );
}

const subject = raw("withdrawal-own-wallet");
const destination = (name: string) =>
  (raw(name).payment_methods as { account_id: string }[])[0].account_id;

export const USER_ID = String(subject.vendor_data);

/** The wallets the recordings used, so forms and results show one address. */
export const WALLETS = {
  ownWallet: destination("withdrawal-own-wallet"),
  exchangeDeposit: destination("withdrawal-exchange"),
};

/**
 * Account views. "processing" is the real decision of a session nobody has
 * started; the others use the field names docs.didit.me documents for a
 * finished session, because the sandbox cannot pass KYC.
 */
const decided = (status: string, checks: string, amlHits: number) => ({
  session_id: raw("decision-not-started").session_id,
  status,
  id_verifications: [
    { status: checks, first_name: "Avery", last_name: "Quinn" },
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

/** Which recorded transaction each submission returns. */
const WITHDRAWAL_FIXTURE: Record<string, string> = {
  "own-wallet": "withdrawal-own-wallet",
  exchange: "withdrawal-exchange",
  address: "withdrawal-sanctioned",
};

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

export interface KestrelMock {
  /** Didit transactions created so far, by id, as the fixture they resolve to. */
  transactions: Map<string, string>;
  requests: { method: string; url: string; body: unknown }[];
}

export async function mockKestrel(
  page: Page,
  options: {
    account?: AccountKey | null;
    afterOnboarding?: AccountKey;
    seedWallets?: boolean;
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

  if (options.seedWallets !== false) {
    await page.addInitScript((wallets) => {
      if (!window.localStorage.getItem("kestrel-demo:v1")) {
        window.localStorage.setItem(
          "kestrel-demo:v1",
          JSON.stringify({ wallets, activity: [], sessionUrl: null }),
        );
      }
    }, WALLETS);
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
      account: account ? { ...ACCOUNTS[account], userId: USER_ID } : null,
    });
  });

  await page.route("**/api/crypto-exchange/deposits", async (route) => {
    record(route);
    const body = route.request().postDataJSON();
    const name =
      body.source === "own-wallet"
        ? "deposit-own-wallet"
        : "deposit-unknown-sender";
    const view = toTransactionView(raw(name));

    mock.transactions.set(view.id, name);

    return json(route, view, 201);
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
    const name = mock.transactions.get(id);

    if (!name) return json(route, { error: "Not found." }, 404);

    return json(route, toTransactionView(raw(name)));
  });

  // What the web SDK's submitTransaction posts to.
  await page.route(`${API}/v1/transactions/`, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    record(route);
    const body = route.request().postDataJSON();
    let name = WITHDRAWAL_FIXTURE[body?.props?.withdrawal_destination] ?? "";

    if (body?.props?.withdrawal_destination === "address") {
      name =
        body?.counterparty?.paymentMethod?.accountId === SANCTIONED_WALLET
          ? "withdrawal-sanctioned"
          : "";
    }
    if (!name)
      return json(route, { detail: "No recording for this destination." }, 400);
    const response = raw(name);

    mock.transactions.set(String(response.uuid), name);

    return json(route, response, 201);
  });

  // Didit's hosted pages: the verification flow and the wallet-ownership widget.
  await page.route(`${VERIFY}/**`, async (route) => {
    const url = route.request().url();

    if (url.includes("/wallet-ownership/") || url.includes("/session/")) {
      let title = "Didit verification";

      if (url.includes("/wallet-ownership/")) title = "Verify wallet ownership";
      if (url.includes("e2e-onboarding")) {
        title = "Verify your identity";
        if (options.afterOnboarding) account = options.afterOnboarding;
      }
      // Opening an action moves the recorded transaction on to what Didit
      // returned after that action finished.
      for (const [id, name] of Array.from(mock.transactions)) {
        const view = toTransactionView(raw(name));

        if (view.action && url.startsWith(view.action.url.split("?")[0])) {
          if (AFTER_ACTION[name]) mock.transactions.set(id, AFTER_ACTION[name]);
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
    }

    return route.fulfill({ status: 204, body: "" });
  });

  return mock;
}

/** Finishes whatever Didit page the SDK modal is showing. */
export async function completeHostedFlow(page: Page) {
  const frame = page.frameLocator(`iframe[src^="${VERIFY}"]`);

  await frame.getByRole("button", { name: "Complete" }).click();
}
