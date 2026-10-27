import { expect, test, type Page } from "@playwright/test";

import { completeHostedFlow, mockAlder } from "./alder-mocks";

const OUT = "/tmp/botinc-run-fe3e52c6-2685-46a5-8c5e-938db284cc77/pr-proof";
const SHA = process.env.SHA ?? "local";
const phone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;
const suffix = (page: Page) => (phone(page) ? "390" : "1440");

async function shot(page: Page, name: string) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-${suffix(page)}.png` });
}

async function step(page: Page, label: string) {
  if (phone(page)) {
    const fold = page.getByRole("button", { name: "Fold the feed" });
    if (await fold.isVisible()) await fold.click();
    await page.getByRole("button", { name: /^Step \d of 5/ }).click();
    await page.getByRole("menu", { name: "Demo steps" }).getByRole("menuitem", { name: label }).click();
  } else {
    await page.getByRole("navigation", { name: "Demo steps" }).getByRole("button", { name: new RegExp(label) }).click();
  }
}

test.use(process.env.PHONE ? {} : { viewport: { width: 1440, height: 900 } });

test("shots", async ({ page }) => {
  void SHA;
  await mockAlder(page);
  await page.goto("/fintech");
  const form = page.getByTestId("alder-signup");

  await form.getByLabel("Full name").fill("Lena Fischer");
  await form.getByLabel("Email").fill("lena.fischer@example.com");
  await form.getByLabel("Mobile number").fill("151 2044 7781");
  await shot(page, "1-signup");
  await form.getByRole("button", { name: "Open my account" }).click();
  await page.locator("iframe").first().waitFor();
  await shot(page, "2-verify");
  await completeHostedFlow(page);
  await expect(page.getByTestId("alder-balance")).toHaveText("12,480.20 EUR");
  await expect(page.getByTestId("didit-live").getByText("Salary received").or(page.getByRole("button", { name: /Didit live/ }))).toBeVisible();
  await shot(page, "3-home");
  await step(page, "Transact");
  await page.getByTestId("alder-send").getByRole("button", { name: /^Send/ }).click();
  await expect(page.getByRole("dialog", { name: "Confirm it is you" })).toBeVisible();
  await shot(page, "4-transaction");
  await page.getByRole("button", { name: "Confirm with a selfie" }).click();
  await completeHostedFlow(page);
  await page.getByRole("button", { name: "Done" }).click();
  await step(page, "Stop fraud");
  await page.getByRole("button", { name: "Try to sign in without the passkey" }).click();
  await expect(page.getByTestId("alder-blocked")).toBeVisible();
  await shot(page, "5-fraud");
  await step(page, "Console");
  await expect(page.getByTestId("console-view")).toBeVisible();
  await shot(page, "6-console");
});
