import { test, type Page } from "@playwright/test";

import { completeHostedFlow, mockNorthmarket } from "./northmarket-mocks";

const OUT = process.env.SHOTS ?? "/tmp/shots";
const phone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const tag = (page: Page) => (phone(page) ? "390" : "1440");
const live = (page: Page) => page.getByTestId("didit-live");

async function fold(page: Page) {
  if (phone(page) && (await live(page).isVisible()))
    await live(page).getByRole("button", { name: "Fold the feed" }).click();
}
async function step(page: Page, name: string) {
  if (phone(page)) {
    await page.getByRole("button", { name: /^Step \d of 5/ }).click();
    await page.getByRole("menu", { name: "Demo steps" }).getByRole("menuitem", { name }).click();
  } else {
    await page.getByRole("navigation", { name: "Demo steps" }).getByRole("button", { name: new RegExp(name) }).click();
  }
}
const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-${tag(page)}.png` });
};

test("capture", async ({ page }) => {
  test.setTimeout(120_000);
  if (phone(page)) await page.setViewportSize({ width: 390, height: 844 });
  else await page.setViewportSize({ width: 1440, height: 900 });
  await mockNorthmarket(page);
  await page.goto("/marketplace");
  await page.getByRole("form", { name: "Open your shop" }).waitFor();
  if (process.env.ONLY_SIGNUP) {
    await page.getByRole("button", { name: "Create a passkey" }).waitFor();
    await page.getByLabel("Email").fill("marta@ruizvintage.example");
    await page.getByLabel("Email").blur();
    await shot(page, "1-signup-auth");

    return;
  }
  await shot(page, "1-signup");
  await fold(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  await page.getByTestId("nm-payouts").waitFor();
  await fold(page);
  await page.getByRole("button", { name: "Verify my business" }).click();
  await page.frameLocator("iframe").getByRole("button", { name: "Complete" }).waitFor();
  await shot(page, "2-verify");
  await completeHostedFlow(page);
  await page.getByText("Payouts are on").waitFor();
  await shot(page, "3-home");
  await fold(page);
  await step(page, "Transact");
  await fold(page);
  await page.getByRole("button", { name: "Place order · 1,497 EUR" }).click();
  await page.getByText("Confirm your age to finish this order").waitFor();
  if (phone(page)) await page.locator(".nm-body").evaluate((el) => el.scrollTo(0, 0));
  await shot(page, "4-transaction");
  await fold(page);
  await step(page, "Stop fraud");
  await fold(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  await page.getByTestId("nm-paused").waitFor();
  await shot(page, "5-fraud");
  await fold(page);
  await step(page, "Console");
  await page.getByTestId("console-view").waitFor();
  await shot(page, "6-console");
});
