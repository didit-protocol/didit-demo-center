// End-to-end flows of the marketplace demo, driven in a real browser against a
// running app that talks to Didit staging. Nothing is mocked: every status in
// these assertions is the decision the live rules and API returned.
//
//   npm run build && npm run start -- -p 3111 &     # NEXT_PUBLIC_IS_STAGING=true
//   MARKETPLACE_E2E_URL=http://localhost:3111 npm run test:e2e:marketplace
//
// Optional: CHROMIUM_PATH=/usr/bin/chromium to use a system browser.
//
// Each run uses a fresh browser profile, so it is a fresh device: the first
// shop's sign-up is approved and the second one, opened from the same profile,
// is held by the shared-device rule.
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.MARKETPLACE_E2E_URL;
const skip = BASE_URL
  ? false
  : "set MARKETPLACE_E2E_URL to a running instance on staging";

const LIVE_TIMEOUT = 45000;

test("marketplace: sellers, buyers, fraud and the operator view, live", { skip, timeout: 240000 }, async (t) => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  t.after(() => browser.close());

  await page.goto(`${BASE_URL}/marketplace`);

  await t.test("opening a shop reports an approved sign-up from this device", async () => {
    await page.getByLabel("Shop name").fill("E2E Atelier");
    await page.getByLabel("Company legal name").fill("Industria de Diseno Textil SA");
    await page.getByRole("button", { name: "Open shop" }).click();
    await page.getByText("Sign-up reported to monitoring").waitFor({ timeout: LIVE_TIMEOUT });

    const step = page.locator("li", { hasText: "Sign-up reported to monitoring" });

    await step.getByText("Approved").waitFor({ timeout: LIVE_TIMEOUT });
    assert.match(await step.innerText(), /score 0/);
  });

  await t.test("payouts stay locked while the business is not verified", async () => {
    await page.getByRole("button", { name: /Payouts/ }).first().click();
    await page.getByText("Payouts are locked", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Pay out/ }).count(), 0);
  });

  await t.test("a small order goes through; a big one waits for an age check", async () => {
    await page.getByRole("button", { name: /Buyer checkout/ }).click();

    const card = (title) => page.locator("li", { hasText: title });

    await card("Rangefinder film camera").getByRole("button", { name: "Buy" }).click();
    const camera = page.locator(".mkt-inset", { hasText: "Rangefinder film camera" }).filter({ hasText: "No rule held it" });

    await camera.waitFor({ timeout: LIVE_TIMEOUT });

    await card("Automatic dive watch").getByRole("button", { name: "Buy" }).click();
    const watch = page.locator(".mkt-inset", { hasText: "Waiting on the customer" });

    await watch.waitFor({ timeout: LIVE_TIMEOUT });
    assert.match(await watch.innerText(), /high-value order needs an age check/);
    assert.match(await watch.innerText(), /HIGH VALUE ORDER/);

    // The rule's own verification session opens in the web SDK modal.
    await watch.getByRole("button", { name: "Verify age to complete" }).click();
    const frame = page.locator("iframe[src*='verify.staging.didit.me/session/']");

    await frame.waitFor({ timeout: LIVE_TIMEOUT });
    await page.keyboard.press("Escape");
  });

  await t.test("a second shop on the same device is held for review", async () => {
    await page.goto(`${BASE_URL}/marketplace?chapter=fraud`);
    await page.getByRole("button", { name: "Open a second shop on this device" }).click();

    const held = page.locator(".mkt-inset", { hasText: "Seller sign-up: Kestrel Goods" });

    await held
      .getByText("Held for review", { exact: true })
      .waitFor({ timeout: LIVE_TIMEOUT });
    assert.match(await held.innerText(), /second shop on one device/);
    assert.match(await held.innerText(), /SHARED DEVICE/);
  });

  await t.test("the operator view names the linked shop and links Console v2", async () => {
    await page.getByRole("button", { name: "Investigate in the operator view" }).click();
    await page.getByText("Linked shops on this device").waitFor({ timeout: LIVE_TIMEOUT });

    const linked = page.locator(".mkt-inset", { hasText: "Linked shops on this device" });

    assert.match(await linked.innerText(), /E2E Atelier/);

    const href = await page.getByRole("link", { name: "Open in Console v2" }).getAttribute("href");

    assert.match(href, /\/console\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/transactions\/detail\/[0-9a-f-]{36}$/);
    await page.getByText("Another shop signed up from this device").waitFor();
  });

  await t.test("the theme toggle switches the marketplace to dark and back", async () => {
    const shell = page.locator(".mkt-theme");
    const before = await shell.getAttribute("data-theme");

    await page.getByRole("button", { name: /Switch to (dark|light)/ }).click();
    assert.notEqual(await shell.getAttribute("data-theme"), before);
    await page.getByRole("button", { name: /Switch to (dark|light)/ }).click();
    assert.equal(await shell.getAttribute("data-theme"), before);
  });

  await t.test("on a phone the guide opens as a bottom sheet", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("button.mkt-btn-ink.w-full", { hasText: "How this uses Didit" }).click();

    const sheet = page.getByRole("dialog");

    await sheet.waitFor();
    assert.match(await sheet.innerText(), /Operator view/);
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "detached" });
  });

  await t.test("start over forgets this browser's shops", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Open shop" }).waitFor({ timeout: LIVE_TIMEOUT });
  });
});
