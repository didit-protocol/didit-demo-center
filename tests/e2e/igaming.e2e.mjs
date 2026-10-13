// Browser flows for /igaming. Run against a running app:
//
//   npm run build && npm run start &
//   BASE_URL=http://localhost:3000 npm run test:e2e
//
// The first two tests mock this app's /api/igaming routes and Didit's device
// lane (`/v1/transactions/`) in the browser, so every screen state is reached
// deterministically. The third runs against the real Didit API behind the
// server's API_KEY and only when E2E_LIVE=1: it creates a real age-check
// session and opens the real hosted flow (a headless browser cannot pass the
// liveness step, so it stops there).
//
// CHROMIUM_PATH points Playwright at a system Chromium when its own browser
// is not installed.
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const PLAYER = "aurora-play-0123456789abcdef01234567";
const AGE_SESSION = "11111111-2222-3333-4444-555555555555";
const KYC_SESSION = "24e57cc4-0794-4c73-9e2f-cc6e57a506c5";
const STATE_KEY = "aurora-play-demo:v1";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

test.after(() => browser.close());

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/** A page with this app's routes mocked; `overrides` replace single handlers. */
async function mockedPage({ viewport = { width: 1440, height: 900 }, seed = null, overrides = {} } = {}) {
  const context = await browser.newContext({ viewport });

  if (seed) {
    await context.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [STATE_KEY, JSON.stringify(seed)],
    );
  }
  const page = await context.newPage();
  const handlers = {
    "GET /api/igaming/player": (route) => json(route, { playerId: seed ? PLAYER : null }),
    "POST /api/igaming/player": (route) => json(route, { playerId: PLAYER }),
    "POST /api/igaming/age-check": (route) =>
      json(route, {
        sessionId: AGE_SESSION,
        url: `${BASE_URL}/__e2e/hosted-flow`,
        didit: [{ method: "POST", path: "/v3/session/", status: 201 }],
      }),
    "POST /api/igaming/token": (route) =>
      json(route, {
        token: "e2e-token",
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        baseUrl: `${BASE_URL}/__e2e/didit`,
        didit: [{ method: "POST", path: "/v3/transactions/sdk-token/", status: 201 }],
      }),
    ...overrides,
  };

  await page.route("**/api/igaming/**", (route) => {
    const url = new URL(route.request().url());
    const handler =
      handlers[`${route.request().method()} ${url.pathname}`] ??
      handlers[`${route.request().method()} ${url.pathname.replace(/[^/]+$/, ":id")}`];

    return handler ? handler(route) : json(route, { error: "unmocked" }, 500);
  });
  // The hosted flow the SDK opens in its iframe.
  await page.route("**/__e2e/hosted-flow**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Hosted flow</p>" }),
  );

  return { context, page };
}

const approvedPlayer = (overrides = {}) => ({
  version: 1,
  playerId: PLAYER,
  name: "Alex Demo",
  email: "alex@example.com",
  createdAt: Date.now(),
  age: {
    sessionId: AGE_SESSION,
    url: `${BASE_URL}/__e2e/hosted-flow`,
    summary: {
      sessionId: AGE_SESSION,
      workflowId: null,
      status: "Approved",
      estimatedAge: 31,
      documentAge: null,
      ip: { country: "Spain", countryCode: "ES", isVpnOrTor: false, isDataCenter: false },
    },
  },
  ageSeen: true,
  kyc: null,
  activity: [],
  depositLimit: null,
  selfExcluded: false,
  secondAccount: false,
  ...overrides,
});

/** Didit's device lane, as the rules on the demo application answer it. */
function deviceLane(page, { blocked = () => false } = {}) {
  const records = new Map();
  let count = 0;

  return page.route("**/__e2e/didit/v1/transactions/**", (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      const id = new URL(request.url()).pathname.split("/").filter(Boolean).pop();

      return json(route, records.get(id));
    }
    const body = request.postDataJSON();

    assert.equal(request.headers()["x-transaction-token"], "e2e-token");
    if (blocked()) {
      return json(
        route,
        { vendor_data: `The individual '${PLAYER}' is in the blocklist and cannot participate in transactions.` },
        400,
      );
    }
    count += 1;
    const kind = body.info.type;
    const amount = Number(body.info.amount);
    const stepUp = kind === "deposit" && amount >= 2000;
    const held = kind === "bonus_claim" || kind === "withdrawal";
    const id = `tx-${count}`;
    const record = {
      uuid: id,
      txn_id: body.txnId,
      transaction_type: body.type,
      action_type: kind,
      direction: body.info.direction === "out" ? "OUTBOUND" : "INBOUND",
      amount: body.info.amount,
      currency: "EUR",
      status: stepUp ? "AWAITING_USER" : held ? "IN_REVIEW" : "APPROVED",
      score: held ? 60 : 0,
      tags: held ? [{ name: "BONUS_ABUSE" }] : [],
      parties: [{ role: "APPLICANT", device: { fingerprint: "e2e-device", network_context: { ip_country: "Spain", ip_country_code: "ES" } } }],
      rule_runs: stepUp
        ? [{ rule_title: "Aurora Play demo: ID verification at 2,000 EUR deposited", matched: true, score_delta: 0, status_target: "AWAITING_USER" }]
        : held
          ? [{ rule_title: "Aurora Play demo: bonus claimed on a shared device", matched: true, score_delta: 60, status_target: "IN_REVIEW" }]
          : [],
      action_required: stepUp
        ? { type: "verification_session", url: `${BASE_URL}/__e2e/hosted-flow`, session_id: KYC_SESSION, status: "Not Started" }
        : null,
    };

    records.set(id, record);

    return json(route, record, 201);
  });
}

test("registration opens the hosted age check and reports an unfinished one", async () => {
  const { context, page } = await mockedPage({
    overrides: {
      "GET /api/igaming/sessions/:id": (route) =>
        json(route, {
          session: {
            sessionId: AGE_SESSION,
            workflowId: null,
            status: "Not Started",
            estimatedAge: null,
            documentAge: null,
            ip: { country: "United States", countryCode: "US", isVpnOrTor: false, isDataCenter: true },
          },
          didit: [{ method: "GET", path: `/v3/session/${AGE_SESSION}/decision/`, status: 200 }],
        }),
    },
  });

  await page.goto(`${BASE_URL}/igaming`);
  await page.getByRole("heading", { name: "Popular right now" }).waitFor();
  await page.locator("header").getByRole("button", { name: "Join now" }).click();
  const submit = page.getByRole("button", { name: "Continue to age check" });

  assert.equal(await submit.isDisabled(), true, "the form needs every field");
  await page.locator("input[name=name]").fill("Alex Demo");
  await page.locator("input[name=email]").fill("alex@example.com");
  await page.getByRole("checkbox").check();
  await submit.click();

  // The web SDK opens the hosted flow at the session URL the route returned.
  const frame = page.locator('[role="dialog"][aria-label="Didit Verification"] iframe');

  await frame.waitFor();
  assert.match(await frame.getAttribute("src"), /__e2e\/hosted-flow/);

  await page.getByRole("button", { name: "Close verification" }).click();
  await page.getByText("Exit", { exact: true }).click();
  await page.getByRole("heading", { name: "Age check: Not finished" }).waitFor();
  await page.getByText("Not licensed", { exact: true }).waitFor();
  await page.getByText("Data-centre IP", { exact: true }).waitFor();
  await page.getByRole("tab", { name: /API log/ }).click();
  await page.getByText(`/v3/session/${AGE_SESSION}/decision/`).waitFor();
  await context.close();
});

test("cashier: step-up, bonus review, operator view and self-exclusion", async () => {
  let excluded = false;
  const { context, page } = await mockedPage({
    seed: approvedPlayer(),
    overrides: {
      "POST /api/igaming/self-exclusion": (route) => {
        excluded = true;

        return json(route, {
          player: { internalId: "user-1", status: "BLOCKED", name: "Alex Demo" },
          didit: [{ method: "PATCH", path: `/v3/users/${PLAYER}/update-status/`, status: 200 }],
        });
      },
      "GET /api/igaming/operator": (route) =>
        json(route, {
          console: { base: "https://business.staging.didit.me", organizationId: "org-1", applicationId: "app-1" },
          player: { internalId: "user-1", status: excluded ? "BLOCKED" : "ACTIVE", name: "Alex Demo" },
          didit: [],
        }),
    },
  });

  await deviceLane(page, { blocked: () => excluded });
  await page.goto(`${BASE_URL}/igaming`);
  await page.getByRole("heading", { name: "Hi, Alex" }).waitFor();

  // A deposit below the threshold is approved and spendable.
  await page.getByRole("button", { name: "Deposit €250" }).click();
  await page.getByText("Deposit approved.").waitFor();
  await page.getByText("€250", { exact: true }).first().waitFor();

  // The one that crosses €2,000 is held and asks for ID.
  await page.getByRole("button", { name: "€2,000", exact: true }).click();
  await page.getByRole("button", { name: "Deposit €2,000" }).click();
  await page.getByRole("dialog", { name: "Verify your identity" }).waitFor();
  await page.getByRole("button", { name: "Later" }).click();
  await page.getByText("€2,000 deposit on hold: verify your ID").waitFor();

  // A held bonus.
  await page.getByRole("button", { name: "Claim free bet" }).click();
  await page.getByText("Bonus held: our team reviews it before it is credited.").first().waitFor();

  // The operator's side, with a Console deep link per record.
  await page.getByRole("tab", { name: "Operator view" }).click();
  await page.getByText("Aurora Play demo: ID verification at 2,000 EUR deposited", { exact: false }).first().waitFor();
  const links = await page.getByRole("link", { name: "Transaction in Console" }).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href")),
  );

  assert.ok(links.includes("https://business.staging.didit.me/console/org-1/app-1/transactions/detail/tx-2"));
  assert.equal(
    await page.getByRole("link", { name: "Player in Console" }).getAttribute("href"),
    "https://business.staging.didit.me/console/org-1/app-1/users/user-1",
  );

  // Self-exclusion: Didit itself refuses the next deposit.
  await page.getByRole("button", { name: "Self-exclude for 6 months" }).click();
  await page.getByRole("dialog", { name: "Self-exclude" }).getByRole("button", { name: "Self-exclude" }).click();
  await page.getByText("Try a deposit anyway").waitFor();
  await page.getByText("Try a deposit anyway").click();
  await page.getByText(/Refused by Didit: The individual/).waitFor();
  await context.close();
});

test("theme and phone layout: dark tokens apply and the panel is a drawer", async () => {
  const { context, page } = await mockedPage({
    viewport: { width: 390, height: 844 },
    seed: approvedPlayer(),
  });

  await page.goto(`${BASE_URL}/igaming`);
  await page.getByRole("heading", { name: "Hi, Alex" }).waitFor();
  await page.getByRole("radio", { name: "Dark" }).click();
  const canvas = await page
    .locator(".igaming-theme")
    .evaluate((node) => getComputedStyle(node).getPropertyValue("--canvas").trim());

  assert.equal(canvas, "21 21 23");
  // The site chrome stays light.
  const chrome = await page
    .locator("body")
    .evaluate((node) => getComputedStyle(node).getPropertyValue("--canvas").trim());

  assert.equal(chrome, "254 254 254");

  await page.getByRole("button", { name: "How this uses Didit" }).click();
  await page.getByRole("dialog", { name: "How this uses Didit" }).getByText("Registration with age estimation").waitFor();
  await context.close();
});

test("live: a real age-check session opens the real hosted flow", { skip: process.env.E2E_LIVE !== "1" }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/igaming`);
  await page.locator("header").getByRole("button", { name: "Join now" }).click();
  await page.locator("input[name=name]").fill("E2E Player");
  await page.locator("input[name=email]").fill("e2e@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to age check" }).click();

  const frame = page.locator('[role="dialog"][aria-label="Didit Verification"] iframe');

  await frame.waitFor({ timeout: 30_000 });
  assert.match(await frame.getAttribute("src"), /^https:\/\/verify(\.staging)?\.didit\.me\//);
  await page.getByRole("button", { name: "Close verification" }).click();
  await page.getByText("Exit", { exact: true }).click();
  // The decision is read back for this player, with the IP analysis it ran.
  await page.getByRole("heading", { name: /Age check:/ }).waitFor({ timeout: 30_000 });
  await page.getByText("Playing from").waitFor();
  await context.close();
});
