import { expect, test, type Page } from "@playwright/test";

import { completeHostedFlow, mockAurora } from "/tmp/botinc-run-6d9fb631-d62d-4628-847e-92e2a4011597/didit-protocol__didit-demo-center/e2e/aurora-mocks";

const OUT = "/tmp/botinc-run-6d9fb631-d62d-4628-847e-92e2a4011597/pr-proof";
const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png` });
const app = (page: Page) => page.getByTestId("aurora-app");

async function signUp(page: Page, name: string, email: string) {
  const dialog = page.getByRole("dialog", { name: "Create your account" });
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Date of birth").fill("1999-03-14");
  await dialog.getByRole("button", { name: "Create account" }).click();
}

test.use({ viewport: { width: 1440, height: 900 } });

test("desktop boards", async ({ page }) => {
  await mockAurora(page);
  await page.goto("/");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/hub-1440.png`, fullPage: true });
  await page.goto("/igaming");
  await app(page).getByRole("button", { name: "Sign up" }).click();
  await signUp(page, "Sofia Marin", "sofia.marin@example.com");
  await expect(page.frameLocator('iframe[src*="/session/"]').getByRole("button", { name: "Complete" })).toBeVisible();
  await page.waitForTimeout(600);
  await shot(page, "aurora-verify-1440");
  await completeHostedFlow(page);
  await expect(app(page).getByTestId("aurora-balance")).toBeVisible();
  await app(page).getByRole("button", { name: "Claim now" }).click();
  await page.waitForTimeout(400);
  await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
  const cashier = page.getByRole("dialog", { name: "Cashier" });
  await cashier.getByLabel("Amount").fill("500");
  await cashier.getByRole("button", { name: /^Deposit \d/ }).click();
  await expect(page.getByTestId("aurora-cashier-result")).toBeVisible();
  await cashier.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(1200);
  await shot(page, "aurora-home-1440");
  await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
  await cashier.getByRole("button", { name: "1,500" }).click();
  await cashier.getByRole("button", { name: /^Deposit \d/ }).click();
  await expect(page.getByTestId("aurora-hold")).toBeVisible();
  await page.waitForTimeout(1200);
  await shot(page, "aurora-transaction-1440");
  await page.getByTestId("aurora-hold").getByRole("button", { name: "Verify my ID" }).click();
  await completeHostedFlow(page);
  await expect(page.getByTestId("aurora-cashier-result")).toContainText("Approved");
  await cashier.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Console view", exact: true }).click();
  await page.waitForTimeout(500);
  await shot(page, "aurora-console-person-1440");
  await page.getByTestId("console-view").getByRole("tab", { name: "Transaction" }).click();
  await shot(page, "aurora-console-transaction-1440");
  await page.getByTestId("console-view").getByRole("button", { name: "Close the console view" }).click();
  await page.getByRole("navigation", { name: "Demo steps" }).getByRole("button", { name: /Stop fraud/ }).click();
  await signUp(page, "Lucas Brandt", "lucas.b@example.com");
  await completeHostedFlow(page);
  await expect(app(page).getByTestId("aurora-balance")).toBeVisible();
  await app(page).getByRole("button", { name: "Claim now" }).click();
  await expect(page.getByTestId("aurora-offer")).toBeVisible();
  await page.waitForTimeout(1200);
  await shot(page, "aurora-fraud-1440");
});

test("phone", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await mockAurora(page);
  await page.goto("/igaming");
  await page.getByRole("button", { name: "Sign up", exact: true }).last().click();
  await signUp(page, "Sofia Marin", "sofia.marin@example.com");
  await completeHostedFlow(page);
  await expect(app(page).getByTestId("aurora-balance")).toBeVisible();
  await app(page).getByRole("button", { name: "Deposit" }).click();
  const cashier = page.getByRole("dialog", { name: "Cashier" });
  await cashier.getByLabel("Amount").fill("500");
  await cashier.getByRole("button", { name: /^Deposit \d/ }).click();
  await expect(page.getByTestId("aurora-cashier-result")).toBeVisible();
  await cashier.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/aurora-phone-390.png` });
  await page.getByRole("button", { name: "Fold the feed" }).click();
  await page.screenshot({ path: `${OUT}/aurora-phone-pill-390.png` });
  await page.goto("/");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/hub-390.png` });
  await context.close();
});
