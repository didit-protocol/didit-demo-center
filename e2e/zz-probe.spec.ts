import { test } from "@playwright/test";
import { mockAurora } from "./aurora-mocks";
test("probe", async ({ page }) => {
  await mockAurora(page);
  await page.goto("/igaming");
  for (let i = 0; i < 10; i++) {
    const r = await page.evaluate(() => [...document.querySelectorAll(".dx-app")].map(e => { const w=e.parentElement?.parentElement as HTMLElement; return w.tagName+" hidden="+w.hidden+" id="+w.id+" vis="+(e as HTMLElement).checkVisibility(); }));
    if (r.length > 1) console.log("PROBE", JSON.stringify(r));
    await page.waitForTimeout(50);
  }
});
