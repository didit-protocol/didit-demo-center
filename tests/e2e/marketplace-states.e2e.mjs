// Browser checks of the marketplace's seller KYB states. Run against a running
// app:
//
//   npm run build && npm run start &
//   BASE_URL=http://localhost:3000 npm run test:e2e
//
// The live flow (marketplace.e2e.mjs) cannot reach these screens on staging
// until the seller KYB workflow exists there, so this file mocks this app's
// own /api/marketplace routes in the browser. Every answer is built by the
// server's own summarizers from a recorded transaction and the documented KYB
// decision (tests/fixtures/marketplace/), never typed in by hand.
//
// CHROMIUM_PATH points Playwright at a system Chromium when its own browser
// is not installed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

import { summarizeKyb, summarizeTransaction } from "../../lib/marketplace/summaries.ts";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const fixture = (name) =>
  JSON.parse(fs.readFileSync(new URL(`../fixtures/marketplace/${name}.json`, import.meta.url), "utf8"));

const signup = summarizeTransaction(fixture("transaction-signup-approved"));
// The documented decision, without the company AML step this workflow does
// not run.
const decision = { ...fixture("kyb-decision-docs-example"), aml_screenings: [] };

/** The state GET /api/marketplace answers for one shop with this KYB. */
const stateWith = ({ kybWorkflow, kyb }) => ({
  availability: { transactions: true, kyb: kybWorkflow },
  stagingUrl: "https://demos.staging.didit.me/marketplace",
  buyer: null,
  sellers: [
    {
      id: "mkt-seller-0123456789ab",
      shop: "Atelier Nord",
      company: "Acme Corporation Limited",
      country: "GB",
      signup: signup.uuid,
      kyb,
      kybError: null,
      kybLink: null,
    },
  ],
  transactions: [signup],
});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

test.after(() => browser.close());

async function mockedPage(state, { theme = "light", viewport = { width: 1440, height: 900 } } = {}) {
  const context = await browser.newContext({ viewport });

  await context.addInitScript((value) => {
    window.localStorage.setItem("didit-marketplace-theme", value);
  }, theme);

  const page = await context.newPage();
  const unexpected = [];

  await page.route("**/api/marketplace**", (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());

    if (request.method() === "GET" && pathname === "/api/marketplace") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state) });
    }
    unexpected.push(`${request.method()} ${pathname}`);

    return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });

  return { context, page, unexpected };
}

test("without the KYB workflow the seller chapter says so and payouts stay locked", async () => {
  const { context, page, unexpected } = await mockedPage(stateWith({ kybWorkflow: false, kyb: null }));

  await page.goto(`${BASE_URL}/marketplace`);
  await page.getByText("The seller KYB workflow is not published on this environment yet").waitFor();
  assert.equal(await page.getByRole("button", { name: /Verify the business/ }).count(), 0);
  // The sign-up still shows what monitoring decided.
  await page.locator("li", { hasText: "Sign-up reported to monitoring" }).getByText("Approved").waitFor();

  await page.getByRole("button", { name: /Payouts/ }).first().click();
  await page.getByText("Payouts are locked", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: /Pay out/ }).count(), 0);
  assert.deepEqual(unexpected, []);
  await context.close();
});

test("with the workflow a shop without a KYB can start one", async () => {
  const { context, page } = await mockedPage(stateWith({ kybWorkflow: true, kyb: null }));

  await page.goto(`${BASE_URL}/marketplace`);
  await page.getByRole("button", { name: /Verify the business/ }).waitFor();
  assert.equal(await page.getByText("not published on this environment").count(), 0);
  await context.close();
});

test("a KYB waiting on its key people lists them and keeps payouts locked", async () => {
  const { context, page } = await mockedPage(stateWith({ kybWorkflow: true, kyb: summarizeKyb(decision) }));

  await page.goto(`${BASE_URL}/marketplace`);
  await page.getByText("Acme Corporation Limited").first().waitFor();
  // Alice Chen, the UBO the seller submitted, still has an ID check to do.
  const person = page.locator(".mkt-inset", { hasText: "Alice Chen" });

  await person.waitFor();
  assert.match(await person.innerText(), /UBO, CEO/);
  assert.equal(await page.getByText("Company AML").count(), 0);

  await page.getByRole("button", { name: /Payouts/ }).first().click();
  await page.getByText("Payouts are locked", { exact: true }).waitFor();
  await context.close();
});

test("an approved KYB unlocks payouts, in both themes and on a phone", async () => {
  const approved = summarizeKyb({ ...decision, status: "Approved" });

  for (const [theme, viewport] of [
    ["light", { width: 1440, height: 900 }],
    ["dark", { width: 390, height: 844 }],
  ]) {
    const { context, page } = await mockedPage(stateWith({ kybWorkflow: true, kyb: approved }), { theme, viewport });

    await page.goto(`${BASE_URL}/marketplace?chapter=payouts`);
    await page.getByText("Payouts are unlocked.").waitFor();
    await page.getByLabel("Amount (EUR)").waitFor();
    await page.getByRole("button", { name: /Pay out/ }).waitFor();
    assert.equal(await page.locator(".mkt-theme").getAttribute("data-theme"), theme);
    await context.close();
  }
});

test("a payout in flight locks its button, so a second click sends nothing", async () => {
  const approved = summarizeKyb({ ...decision, status: "Approved" });
  const { context, page } = await mockedPage(stateWith({ kybWorkflow: true, kyb: approved }));
  let tokenRequests = 0;
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });

  // Hold the token request open, as a slow network would, then refuse it.
  await page.route("**/api/marketplace/token", async (route) => {
    tokenRequests += 1;
    await held;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Held by the test." }) });
  });

  await page.goto(`${BASE_URL}/marketplace?chapter=payouts`);
  const payout = page.getByRole("button", { name: /Pay out/ });

  await payout.click();
  await page.locator('button[aria-busy="true"]', { hasText: "Pay out" }).waitFor();
  assert.ok(await payout.isDisabled());
  await payout.click({ force: true });
  await page.getByLabel("Amount (EUR)").press("Enter");
  release();
  await page.locator('button[aria-busy="true"]').waitFor({ state: "detached" });
  assert.equal(tokenRequests, 1);
  await context.close();
});

test("on a phone the guide sheet keeps keyboard focus inside and gives it back", async () => {
  const { context, page } = await mockedPage(stateWith({ kybWorkflow: true, kyb: null }), {
    viewport: { width: 390, height: 844 },
  });

  await page.goto(`${BASE_URL}/marketplace`);
  const trigger = page.locator("button.mkt-btn-ink.w-full", { hasText: "How this uses Didit" });

  await trigger.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog");

  await sheet.waitFor();
  // Focus starts on the sheet itself, so Shift+Tab first, then both ways round.
  for (const key of ["Shift+Tab", ...Array(25).fill("Tab"), ...Array(5).fill("Shift+Tab")]) {
    await page.keyboard.press(key);
    assert.ok(
      await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
      `${key} moved focus out of the sheet`,
    );
  }

  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "detached" });
  assert.ok(await trigger.evaluate((el) => el === document.activeElement));
  await context.close();
});
