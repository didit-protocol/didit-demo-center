// Walkthrough recording (kept outside the repo). Real Didit staging calls,
// except the identity decision, which this harness sets after a simulated
// completion of the hosted flow (no ID document or camera in a recording).
import fs from "node:fs";
import { chromium } from "playwright";
import { installFintechApi, stagingDidit } from "./fintech-harness.mjs";

const BASE = "http://localhost:3100";
const PROOF = "/tmp/fx/real";
fs.mkdirSync(PROOF, { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const ctx = await b.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: "/tmp/fx/video", size: { width: 1920, height: 1080 } },
});
await ctx.addInitScript(() => {
  window.__caption = (text, tag) => {
    let el = document.getElementById("__cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "__cap";
      el.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;max-width:1100px;padding:14px 22px;border-radius:999px;background:rgba(10,10,10,.88);color:#fff;font:500 20px/1.35 Inter,system-ui,sans-serif;display:flex;gap:12px;align-items:center;box-shadow:0 12px 40px rgba(0,0,0,.35);pointer-events:none";
      document.body.appendChild(el);
    }
    const color = tag === "sim" ? "#F0C45C" : "#60D38A";
    const label = tag === "sim" ? "SIMULATED" : tag === "live" ? "LIVE ON STAGING" : "";
    el.innerHTML = (label ? `<span style="flex:none;font:600 12px/1 Inter,system-ui;letter-spacing:.12em;padding:7px 10px;border-radius:999px;background:${color};color:#0a0a0a">${label}</span>` : "") + `<span>${text}</span>`;
    el.style.display = "flex";
  };
  window.__hideCaption = () => { const el = document.getElementById("__cap"); if (el) el.style.display = "none"; };
});
const page = await ctx.newPage();
const didit = stagingDidit({ status: "In Progress" });
const jar = await installFintechApi(page, didit);
const cap = (t, tag) => page.evaluate(([t, tag]) => window.__caption(t, tag), [t, tag]);
const pause = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { await page.evaluate(() => window.__hideCaption()); await page.screenshot({ path: `${PROOF}/${name}.png` }); };
const t0 = Date.now();

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await cap("demos.didit.me: next to the module catalogue, complete industry apps", "");
await pause(2500);
await page.getByRole("heading", { name: "See it inside a product." }).scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 200);
await pause(2500);
await page.getByRole("link", { name: /Fintech/ }).first().click();
await page.getByRole("button", { name: "Open an account" }).waitFor();
await cap("Kestrel, a fictional neobank: every step below calls Didit staging", "live");
await pause(4000);

await page.getByRole("button", { name: "Open an account" }).click();
await cap("Sign-up is the bank's own form. Its customer id becomes Didit's vendor_data", "");
await page.getByLabel("Full name").pressSequentially("Lena Fischer", { delay: 70 });
await page.getByLabel("Email", { exact: true }).pressSequentially("lena.fischer@example.com", { delay: 35 });
await page.getByLabel("Country of residence").selectOption("DEU");
await pause(1200);
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Verify my identity" }).waitFor();
await cap("POST /v3/session/ with the KYC + AML workflow: ID, active liveness, face match, AML", "live");
await pause(3500);

await page.getByRole("button", { name: "Verify my identity" }).click();
await cap("The real hosted verification flow opens in the Didit web SDK", "live");
let frame;
for (let i = 0; i < 40 && !frame; i++) { await pause(250); frame = page.frames().find((f) => f.url().includes("verify.staging.didit.me")); }
await frame.waitForLoadState("domcontentloaded");
await pause(2500);
// The QR code carries the session token: blur it everywhere it is recorded.
await frame.addStyleTag({ content: "svg, canvas, img[src^='data:'] { filter: blur(9px) !important; }" }).catch(() => {});
await pause(3500);
await shot("live-hosted-flow-desktop-light");
await cap("The visitor finishes ID + liveness on their phone. This recording has no ID or camera", "sim");
await pause(2500);
await frame.evaluate(() => parent.postMessage(JSON.stringify({ type: "didit:completed", data: { status: "Pending" } }), "*"));
await page.getByRole("heading", { name: "Checking your details" }).waitFor();
await cap("GET /v3/session/{id}/decision/, reduced to statuses on the server", "live");
await pause(3500);
didit.decision.status = "Approved";
await cap("Decision set to Approved for this recording (an analyst can also approve In Review)", "sim");
await page.getByRole("heading", { name: "Your account is open" }).waitFor();
await pause(3500);

await page.getByRole("button", { name: "Go to my account" }).click();
await page.getByText("No payments yet").waitFor();
await cap("Money now moves through transaction monitoring, tied to the same vendor_data", "live");
await pause(3000);
await page.getByRole("button", { name: "Add money" }).click();
await pause(1500);
await page.locator('form button[type="submit"]').click();
await page.getByRole("heading", { name: /added/ }).waitFor({ timeout: 20000 });
await cap("POST /v3/transactions/: a €10,000 deposit clears", "live");
await pause(3000);
await page.getByRole("button", { name: "Done" }).click();

await page.getByRole("button", { name: "Send money" }).click();
await page.getByLabel("Recipient").pressSequentially("Marta Ruiz", { delay: 60 });
await pause(600);
await page.locator('form button[type="submit"]').click();
await page.getByRole("heading", { name: /sent to Marta Ruiz/ }).waitFor({ timeout: 20000 });
await cap("A €250 transfer clears: no rule matched", "live");
await pause(2500);
await page.getByRole("button", { name: "Done" }).click();

await page.getByRole("button", { name: "Send money" }).click();
await page.getByLabel("Recipient").pressSequentially("Jonas Weber", { delay: 60 });
await page.getByRole("button", { name: "€6,000.00" }).click();
await cap("€6,000 is over the bank's review threshold", "");
await pause(2500);
await page.locator('form button[type="submit"]').click();
await page.getByRole("heading", { name: "Your payment is on hold" }).waitFor({ timeout: 20000 });
await cap("Staging's verdict: IN_REVIEW, held by the rule \"High-value outbound transfer\"", "live");
await pause(3500);
await page.getByTestId("fx-operator").scrollIntoViewIfNeeded();
await cap("Operator view: what compliance sees in the console, with links to each record", "live");
await pause(4500);
await shot("live-held-transfer-desktop-light");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await pause(1200);
await page.getByRole("button", { name: "Done" }).click();
await page.getByText("on hold").first().waitFor();
await cap("Balance: €3,750 available, €6,000 on hold until an analyst decides", "live");
await pause(3500);

await page.getByRole("button", { name: "Preview monitoring for this account" }).scrollIntoViewIfNeeded();
await page.getByRole("button", { name: "Preview monitoring for this account" }).click();
await page.getByTestId("fx-monitoring-estimate").waitFor({ timeout: 20000 });
await cap("Ongoing AML monitoring: POST /v3/users/aml-monitoring/ with estimate_only writes nothing", "live");
await pause(4500);
await shot("live-monitoring-desktop-light");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await pause(800);
await page.getByRole("radio", { name: "Dark" }).click();
await cap("Light and dark, desktop and mobile", "");
await pause(3500);
await shot("live-home-desktop-dark");
await cap("Kestrel on demos.didit.me: real KYC, AML and transaction monitoring on Didit staging", "");
await pause(3000);

console.log("duration_s", ((Date.now() - t0) / 1000).toFixed(1));
console.log("transactions", jar.account.tx.length, "session", Boolean(jar.account.sid));
const video = page.video();
await ctx.close();
console.log("video", await video.path());
await b.close();
