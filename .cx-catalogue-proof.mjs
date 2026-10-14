import { chromium } from "playwright";
const BASE = process.env.BASE_URL;
const OUT = process.env.OUT;
const browser = await chromium.launch();
for (const [name, viewport, dpr] of [["desktop", { width: 1440, height: 900 }, 1], ["phone", { width: 390, height: 844 }, 2]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const section = page.locator("section", { has: page.getByText("Industry demo apps", { exact: true }) });
  await section.scrollIntoViewIfNeeded();
  const cards = await section.locator("li a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await section.screenshot({ path: `${OUT}/catalogue-four-apps-${name}.png` });
  console.log(name, JSON.stringify(cards), "sideways:", sideways, "errors:", errors.length);
  for (const href of cards) {
    const r = await page.request.get(`${BASE}${href}`);
    console.log("  ", href, r.status());
  }
  await page.close();
}
await browser.close();
