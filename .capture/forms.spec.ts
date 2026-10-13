import { expect, test, type Locator, type Page } from "@playwright/test";
import * as fs from "node:fs";

import { mockKestrel } from "../e2e/kestrel-mocks";

const OUT = "/tmp/kcap";
const app = (page: Page) => page.getByTestId("kestrel-app");
const DETAIL = '[role="radio"] > span:nth-child(2) > span:last-child';

const clippedCount = (group: Locator) =>
  group.evaluate((element) =>
    Array.from(element.querySelectorAll("span")).filter(
      (span) => span.clientWidth > 0 && span.scrollWidth > span.clientWidth,
    ).length,
  );

async function shot(page: Page, group: Locator, file: string) {
  const box = (await group.boundingBox())!;
  await page.screenshot({
    path: `${OUT}/${file}`,
    clip: { x: 0, y: box.y - 12, width: 390, height: box.height + 24 },
  });
}

/** Before: the removed `truncate` class put back on the descriptions. */
async function beforeAndAfter(page: Page, group: Locator, name: string, theme: string, log: string[]) {
  await group.scrollIntoViewIfNeeded();
  const after = await clippedCount(group);
  await shot(page, group, `${name}-${theme}-after.png`);
  await group.evaluate((el, sel) => el.querySelectorAll(sel).forEach((s) => s.classList.add("truncate")), DETAIL);
  const before = await clippedCount(group);
  await shot(page, group, `${name}-${theme}-before.png`);
  await group.evaluate((el, sel) => el.querySelectorAll(sel).forEach((s) => s.classList.remove("truncate")), DETAIL);
  log.push(`${name} ${theme}: clipped before=${before} after=${after}`);
}

for (const theme of ["light", "dark"]) {
  test(`forms ${theme}`, async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const log: string[] = [];
    await page.addInitScript((t) => localStorage.setItem("kestrel-demo:theme", t), theme);
    await mockKestrel(page);
    await page.goto("/crypto-exchange");
    await expect(page.locator(".kestrel")).toHaveAttribute("data-theme", theme);

    await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
    const sources = page.getByRole("radiogroup", { name: "Deposit source" });
    await beforeAndAfter(page, sources, "deposit", theme, log);

    if (theme === "light") {
      // Keyboard: Tab onto the group (one stop), then ArrowDown.
      await page.getByRole("button", { name: "Wallet" }).focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowDown");
      await expect(sources.getByRole("radio", { name: /unknown sender/ })).toBeFocused();
      await shot(page, sources, `keyboard-${theme}.png`);
      await page.keyboard.press("ArrowUp");
    }

    await page.getByRole("button", { name: "Receive deposit" }).click();
    await expect(page.getByTestId("kestrel-stage")).toContainText("Deposit credited");
    await app(page).getByRole("button", { name: "Wallet" }).click();
    await app(page).getByRole("button", { name: "Withdraw", exact: true }).click();
    const destinations = page.getByRole("radiogroup", { name: "Withdrawal destination" });
    await beforeAndAfter(page, destinations, "withdraw", theme, log);
    fs.writeFileSync(`${OUT}/log-${theme}.txt`, log.join("\n") + "\n");
  });
}
