import { chromium } from "playwright";
import { installFintechApi, stagingDidit } from "./fintech-harness.mjs";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["camera"] });
const page = await ctx.newPage();
const didit = stagingDidit({ status: "Not Started" });
await installFintechApi(page, didit);
await page.goto("http://localhost:3100/fintech");
await page.getByRole("button", { name: "Open an account" }).click();
await page.getByLabel("Full name").fill("Lena Fischer");
await page.getByLabel("Email", { exact: true }).fill("lena.fischer@example.com");
await page.getByLabel("Country of residence").selectOption("DEU");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Verify my identity" }).click();
for (const t of [5000, 10000]) { await page.waitForTimeout(t); await page.screenshot({ path: `/tmp/fx/shots/hosted-${t}.png` }); }
const f = page.frames().find((fr) => fr.url().includes("verify.staging.didit.me"));
console.log("frame host:", f ? new URL(f.url()).host : "none");
await b.close();
