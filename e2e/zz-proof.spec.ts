import { expect, test } from "@playwright/test";

import { mockAlder } from "./alder-mocks";

const OUT = "/tmp/botinc-run-33f98e2b-682c-4ad0-9d29-87eda840838a/pr-proof";

test("proof", async ({ page }, info) => {
  const size = info.project.name === "phone" ? "390" : "1440";

  await mockAlder(page, { diditDown: true });
  await page.goto("/fintech");
  const form = page.getByTestId("alder-signup");

  await form.getByLabel("Full name").fill("Lena Fischer");
  await form.getByLabel("Email").fill("lena.fischer@example.com");
  await form.getByLabel("Mobile number").fill("151 2044 7781");
  await form.getByRole("button", { name: "Open my account" }).click();
  await expect(page.getByTestId("alder-app").getByRole("alert")).toBeVisible();
  await page.screenshot({ path: `${OUT}/didit-unreachable-${size}.png` });

  const other = await page.context().newPage();

  await other.evaluate(() => window.localStorage.clear()).catch(() => undefined);
  await page.close();
  await mockAlder(other, {
    pendingOnboarding: { email: "lena.fischer@example.com", startedAt: Date.now() - 120_000, finishedElsewhere: true },
  });
  await other.goto("/fintech");
  await other.evaluate(() => window.localStorage.clear());
  await other.reload();
  await expect(other.getByTestId("alder-balance")).toHaveText("12,480.20 EUR");
  await other.screenshot({ path: `${OUT}/finished-elsewhere-${size}.png` });
});
