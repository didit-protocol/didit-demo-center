import type { Page, Route } from "@playwright/test";

import fs from "node:fs";
import path from "node:path";

import { summarizeKyb, summarizeTransaction } from "../lib/marketplace/summaries";

/**
 * The Didit side of /marketplace (Northmarket) for the E2E suite.
 *
 * Transactions come from tests/fixtures/marketplace: real transaction reads
 * recorded on the staging demo application against the rules
 * `npm run marketplace:setup` installs (a first shop's sign-up, a second
 * shop's sign-up held on the same device, an order held for an age check).
 * The demo's own /api/marketplace routes answer from them, trimmed the way
 * the server trims them. The KYB decision is the documented example with a
 * Spanish company and two owners swapped in, because the sandbox cannot pass
 * a registry search or the owners' liveness checks. Didit's hosted flow is a
 * stand-in page that reports completion the way it does, with a postMessage.
 *
 * Authentication is off in this suite (no publishable key), which is the
 * production path today: Northmarket's own form opens the shop.
 */

const FIXTURES = path.join(__dirname, "..", "tests", "fixtures", "marketplace");
// The app builds for staging from .env; set NEXT_PUBLIC_IS_STAGING=false for a production build.
const STAGING = process.env.NEXT_PUBLIC_IS_STAGING !== "false";
const API = STAGING
  ? "https://verification.staging.didit.me"
  : "https://verification.didit.me";
const VERIFY = STAGING
  ? "https://verify.staging.didit.me"
  : "https://verify.didit.me";

/** The shops the recorded sign-ups belong to. */
export const SHOPS = ["mkt-seller-9e7b751f882f", "mkt-seller-3628d6dddc2a"];
const BUYER = "mkt-buyer-cbaffda12112";
const KYB_SESSION = "6f1c9b8e-2a4d-4f3b-9c1e-7d5a8b0e4c21";

type Json = Record<string, unknown>;

function recording(name: string): Json {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES, `${name}.json`), "utf8"),
  );
}

/** The documented KYB decision, as Ruiz Vintage SL with its two owners. */
function kybDecision(status: string): Json {
  const base = recording("kyb-decision-docs-example");
  const registry = (base.registry_checks as Json[])[0];
  const company = registry.company as Json;
  const people = (base.key_people_checks as Json[])[0];
  const approved = status === "Approved";
  const owner = (first: string, last: string, role: string, share: number) => ({
    first_name: first,
    last_name: last,
    role,
    ownership_percent: share,
    kyc_session_status: approved ? "Approved" : "Not Started",
    kyc_session_url: approved ? null : `${VERIFY}/session/e2e-owner`,
    is_skipped: false,
  });

  return {
    ...base,
    session_id: KYB_SESSION,
    status,
    session_url: status === "Not Started" ? `${VERIFY}/session/e2e-kyb` : null,
    registry_checks: [
      {
        ...registry,
        company: {
          ...company,
          company_name: "Ruiz Vintage SL",
          registration_number: "B-87412095",
          country_code: "ESP",
          company_type: "Sociedad Limitada",
          incorporation_date: "2019-03-12",
          registered_address: "Calle de Toledo 48, Madrid",
        },
      },
    ],
    key_people_checks: [
      {
        ...people,
        status: approved ? "Approved" : "Not Started",
        submitted: {
          parties: [
            owner("Marta", "Ruiz", "Director", 60),
            owner("Pablo", "Ruiz", "", 40),
          ],
        },
      },
    ],
  };
}

function standInPage(title: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fff;color:#0a0a0a">
<div style="text-align:center;max-width:280px">
<p style="font-size:18px;font-weight:600;margin:0 0 6px">${title}</p>
<p style="font-size:13px;color:#5d5d5d;margin:0 0 20px">Test stand-in for Didit's hosted page</p>
<button id="complete" style="height:44px;padding:0 22px;border:0;border-radius:999px;background:#2567ff;color:#fff;font-size:14px;cursor:pointer">Complete</button>
</div>
<script>
document.getElementById("complete").onclick = function () {
  parent.postMessage({ type: "didit:completed", data: { status: "Approved" } }, "*");
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

export interface NorthmarketMock {
  /** Every transaction submitted, by the fixture it answered with. */
  submitted: string[];
  /** Headers of those posts (the token and the device data the SDK attaches). */
  headers: Record<string, string>[];
}

export async function mockNorthmarket(page: Page): Promise<NorthmarketMock> {
  const mock: NorthmarketMock = { submitted: [], headers: [] };
  const sellers: {
    id: string;
    shop: string;
    company: string;
    country: string;
    signup: string | null;
  }[] = [];
  const records = new Map<string, Json>();
  let kyb: string | null = null;
  let ageDone = false;
  let count = 0;

  const read = (uuid: string) => {
    const raw = records.get(uuid);

    if (!raw) return null;
    if (ageDone && raw.status === "AWAITING_USER")
      return { ...raw, status: "APPROVED", action_required: null };

    return raw;
  };
  const kybSummary = () => (kyb ? summarizeKyb(kybDecision(kyb)) : null);
  const stateView = () => ({
    availability: { transactions: true, kyb: true },
    stagingUrl: "https://demos.staging.didit.me/marketplace",
    buyer: records.size ? BUYER : null,
    sellers: sellers.map((seller, index) => ({
      ...seller,
      kyb: index === 0 ? kybSummary() : null,
      kybError: null,
      kybLink: null,
    })),
    transactions: Array.from(records.keys())
      .map((uuid) => summarizeTransaction(read(uuid) as Json))
      .reverse(),
  });

  await page.route("**/api/marketplace**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;

    if (key === "GET /api/marketplace") return json(route, stateView());
    if (key === "DELETE /api/marketplace") {
      sellers.length = 0;
      records.clear();
      kyb = null;
      ageDone = false;

      return json(route, { ok: true });
    }
    if (key === "POST /api/marketplace/sellers") {
      const body = request.postDataJSON() as { shop: string };
      const seller = {
        id: SHOPS[sellers.length],
        shop: body.shop,
        company: body.shop,
        country: "",
        signup: null,
      };

      sellers.push(seller);

      return json(
        route,
        { seller: { ...seller, kyb: null, kybError: null, kybLink: null } },
        201,
      );
    }
    if (key === "POST /api/marketplace/token") {
      const body = request.postDataJSON() as {
        purpose: string;
        seller?: string;
      };

      return json(route, {
        token: `e2e-token-${body.purpose}`,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        baseUrl: API,
        subject: {
          vendorData: body.seller ?? BUYER,
          name: body.purpose === "purchase" ? "Northmarket buyer" : "Shop",
          type: body.purpose === "purchase" ? "individual" : "company",
        },
      });
    }
    if (key === "POST /api/marketplace/transactions") {
      const { uuid } = request.postDataJSON() as { uuid: string };
      const raw = read(uuid);

      if (!raw) return json(route, { error: "Not found." }, 404);
      const summary = summarizeTransaction(raw);
      const seller = sellers.find((item) => item.id === summary.subject);

      if (seller && summary.kind === "signup") seller.signup = uuid;

      return json(route, summary);
    }
    if (key.startsWith("GET /api/marketplace/transactions/")) {
      const raw = read(url.pathname.split("/").pop() ?? "");

      return raw
        ? json(route, summarizeTransaction(raw))
        : json(route, { error: "Not found." }, 404);
    }
    if (/^POST \/api\/marketplace\/sellers\/[^/]+\/kyb$/.test(key)) {
      kyb = "Not Started";

      return json(
        route,
        {
          sessionId: KYB_SESSION,
          url: `${VERIFY}/session/e2e-kyb`,
          resumed: false,
        },
        201,
      );
    }
    if (/^GET \/api\/marketplace\/sellers\/[^/]+\/kyb$/.test(key))
      return json(route, { kyb: kybSummary() });

    return json(route, { error: "unmocked" }, 500);
  });

  // No monitoring token without Didit Authentication on a signed-out page.
  await page.route("**/api/didit/events-token", (route) =>
    json(route, { error: "Nobody is signed in." }, 401),
  );
  await page.route(`${API}/v1/events/**`, (route) =>
    json(route, { results: [] }, 202),
  );

  // What the web SDK's submitTransaction posts to.
  await page.route(`${API}/v1/transactions/**`, async (route) => {
    const request = route.request();
    const body = JSON.stringify(request.postDataJSON());
    const purchase = body.includes('"purchase"');
    const name = purchase
      ? "transaction-order-awaiting-user"
      : sellers.length > 1
        ? "transaction-signup-held"
        : "transaction-signup-approved";
    const fixture = recording(name);

    mock.submitted.push(name);
    mock.headers.push(request.headers());
    count += 1;
    const uuid = `00000000-0000-4000-8000-${String(count).padStart(12, "0")}`;
    const subject = purchase ? BUYER : SHOPS[sellers.length - 1];
    const stored: Json = {
      ...fixture,
      uuid,
      vendor_data: subject,
      parties: [{ role: "APPLICANT", vendor_data: subject }],
      ...(purchase
        ? {
            amount: "1497",
            action_required: {
              ...(fixture.action_required as Json),
              url: `${VERIFY}/session/e2e-age`,
            },
          }
        : {}),
    };

    records.set(uuid, stored);

    return json(route, stored, 201);
  });

  // Didit's hosted flows inside the SDK modal.
  await page.route(`${VERIFY}/**`, (route) => {
    const url = route.request().url();

    if (!url.includes("/session/"))
      return route.fulfill({ status: 204, body: "" });
    if (url.includes("e2e-kyb")) kyb = "Approved";
    if (url.includes("e2e-age")) ageDone = true;

    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: standInPage(
        url.includes("e2e-age") ? "Confirm your age" : "Verify your business",
      ),
    });
  });

  return mock;
}

/** Finishes whatever Didit page the SDK modal is showing. */
export async function completeHostedFlow(page: Page) {
  const frame = page.frameLocator(`iframe[src^="${VERIFY}"]`);

  await frame.getByRole("button", { name: "Complete" }).click();
}
