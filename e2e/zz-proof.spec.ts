import { expect, test } from "@playwright/test";
import { completeHostedFlow, mockAlder } from "./alder-mocks";

const OUT = "/tmp/botinc-run-f132e536-57f0-45e2-b1cc-5375133780d9/pr-proof";
const tag = process.env.PROOF_TAG ?? "selfie";

test("proof", async ({ page }, info) => {
  const size = info.project.name === "phone" ? "390" : "1440";
  if (size === "1440") await page.setViewportSize({ width: 1440, height: 900 });
  await mockAlder(page);
  await page.goto("/fintech");
  const form = page.getByTestId("alder-signup");
  await form.getByLabel("Full name").fill("Lena Fischer");
  await form.getByLabel("Email").fill("lena.fischer@example.com");
  await form.getByLabel("Mobile number").fill("151 2044 7781");
  await form.getByRole("button", { name: "Open my account" }).click();
  await completeHostedFlow(page);
  await expect(page.getByTestId("alder-balance")).toHaveText("12,480.20 EUR");
  if (size === "390") {
    await page.getByRole("button", { name: /^Step \d of 5/ }).click();
    await page.getByRole("menu", { name: "Demo steps" }).getByRole("menuitem", { name: "Transact" }).click();
  } else {
    await page.getByRole("navigation", { name: "Demo steps" }).getByRole("button", { name: /Transact/ }).click();
  }
  await page.getByTestId("alder-send").getByRole("button", { name: "Send 5,000.00 EUR" }).click();
  await expect(page.getByRole("dialog", { name: "Confirm it is you" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/stepup-${tag}-${size}.png` });
});
