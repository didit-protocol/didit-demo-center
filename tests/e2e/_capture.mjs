// Proof capture for the fintech demo (kept outside the repo).
import fs from "node:fs";
import { chromium } from "playwright";
import { installFintechApi, recordedDidit, stubHostedFlow, fixture } from "./fintech-harness.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = process.env.OUT || "/tmp/fx/cap";
const SIZES = { desktop: { width: 1440, height: 1000 }, tablet: { width: 834, height: 1112 }, phone: { width: 390, height: 844 } };
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
const themes = (process.env.THEMES || "light,dark").split(",");
const sizes = (process.env.SIZES || "desktop,tablet,phone").split(",");
const NS = fixture("decision-not-started").response;
const acct = (tx = []) => ({ v: 1, id: NS.vendor_data, name: "Lena Fischer", email: "lena.fischer@example.com", country: "DEU", sid: NS.session_id, tx, at: Date.now() });

async function signUp(page) {
  await page.getByRole("button", { name: "Open an account" }).click();
  await page.getByLabel("Full name").fill("Lena Fischer");
  await page.getByLabel("Email", { exact: true }).fill("lena.fischer@example.com");
  await page.getByLabel("Country of residence").selectOption("DEU");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Verify your identity" }).waitFor();
}
async function payment(page, kind, amount, who) {
  await page.getByRole("button", { name: kind === "deposit" ? "Add money" : "Send money" }).click();
  if (who) await page.getByLabel("Recipient").fill(who);
  await page.getByLabel("Other amount").fill(String(amount));
  await page.locator('form button[type="submit"]').click();
  await page.getByTestId("fx-payment-result").waitFor();
}
async function filled(page, didit) {
  await page.getByText("No payments yet").waitFor();
  await payment(page, "deposit", 10000); await page.getByRole("button", { name: "Done" }).click();
  await payment(page, "transfer", 250, "Marta Ruiz"); await page.getByRole("button", { name: "Done" }).click();
  await payment(page, "transfer", 6000, "Jonas Weber");
}

const STATES = {
  welcome: { status: "Not Started", run: async (p) => { await p.getByRole("button", { name: "Open an account" }).waitFor(); } },
  "signup-errors": { run: async (p) => { await p.getByRole("button", { name: "Open an account" }).click(); await p.getByRole("button", { name: "Continue" }).click(); await p.getByText("Enter your full name.").waitFor(); } },
  verify: { run: async (p) => { await signUp(p); } },
  "verify-cancelled": { flow: "cancelled", run: async (p) => { await signUp(p); await p.getByRole("button", { name: "Verify my identity" }).click(); await p.getByText("You closed the verification").waitFor(); } },
  checking: { status: "In Progress", flow: "completed", run: async (p) => { await signUp(p); await p.getByRole("button", { name: "Verify my identity" }).click(); await p.getByRole("heading", { name: "Checking your details" }).waitFor(); await p.waitForTimeout(3500); } },
  "outcome-approved": { status: "In Progress", flow: "completed", run: async (p, d) => { await signUp(p); await p.getByRole("button", { name: "Verify my identity" }).click(); await p.getByRole("heading", { name: "Checking your details" }).waitFor(); d.decision.status = "Approved"; await p.getByRole("heading", { name: "Your account is open" }).waitFor(); } },
  "outcome-review": { status: "In Review", account: acct(), run: async (p) => { await p.getByRole("heading", { name: "We are reviewing your application" }).waitFor(); } },
  "outcome-declined": { status: "Declined", account: acct(), run: async (p) => { await p.getByRole("heading", { name: "We could not open your account" }).waitFor(); } },
  "outcome-expired": { status: "Expired", account: acct(), run: async (p) => { await p.getByRole("heading", { name: "Your verification expired" }).waitFor(); } },
  "home-empty": { status: "Approved", account: acct(), run: async (p) => { await p.getByText("No payments yet").waitFor(); } },
  "pay-deposit": { status: "Approved", account: acct(), run: async (p) => { await p.getByText("No payments yet").waitFor(); await p.getByRole("button", { name: "Add money" }).click(); } },
  "pay-transfer-review": { status: "Approved", account: acct(), run: async (p, d) => { await p.getByText("No payments yet").waitFor(); await payment(p, "deposit", 10000); await p.getByRole("button", { name: "Done" }).click(); await p.getByRole("button", { name: "Send money" }).click(); await p.getByLabel("Recipient").fill("Jonas Weber"); await p.getByLabel("Other amount").fill("6000"); } },
  "pay-insufficient": { status: "Approved", account: acct(), run: async (p, d) => { await p.getByText("No payments yet").waitFor(); await payment(p, "deposit", 1000); await p.getByRole("button", { name: "Done" }).click(); await p.getByRole("button", { name: "Send money" }).click(); await p.getByLabel("Recipient").fill("Marta Ruiz"); await p.getByLabel("Other amount").fill("2500"); await p.locator('form button[type="submit"]').click(); await p.getByText("You only have").waitFor(); } },
  "result-received": { status: "Approved", account: acct(), run: async (p) => { await p.getByText("No payments yet").waitFor(); await payment(p, "deposit", 10000); } },
  "result-held": { status: "Approved", account: acct(), run: async (p, d) => { await filled(p, d); } },
  "home-activity": { status: "Approved", account: acct(), run: async (p, d) => { await filled(p, d); await p.getByRole("button", { name: "Done" }).click(); await p.getByText("on hold").first().waitFor(); } },
  "home-released": { status: "Approved", account: acct(), run: async (p, d) => { await filled(p, d); await p.getByRole("button", { name: "Done" }).click(); d.decide("APPROVED"); await p.getByRole("button", { name: "Refresh" }).click(); await p.waitForTimeout(800); } },
  monitoring: { status: "Approved", account: acct(), run: async (p) => { await p.getByText("No payments yet").waitFor(); await p.getByRole("button", { name: "Preview monitoring for this account" }).click(); await p.getByTestId("fx-monitoring-estimate").waitFor(); await p.getByTestId("fx-monitoring-estimate").scrollIntoViewIfNeeded(); } },
  "phone-sheet": { phoneOnly: true, status: "Approved", account: acct(), run: async (p, d) => { await filled(p, d); await p.getByRole("button", { name: "How this uses Didit" }).click(); await p.getByRole("dialog").waitFor(); await p.waitForTimeout(400); } },
};

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
for (const [name, st] of Object.entries(STATES)) {
  if (only && !only.includes(name)) continue;
  for (const theme of themes) for (const size of sizes) {
    if (st.phoneOnly && size !== "phone") continue;
    const ctx = await browser.newContext({ viewport: SIZES[size], colorScheme: theme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const didit = recordedDidit({ status: st.status || "Not Started" });
    const jar = await installFintechApi(page, didit);
    if (st.account) jar.account = { ...st.account };
    if (st.flow) await stubHostedFlow(page, { outcome: st.flow });
    await page.goto(`${BASE}/fintech`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important} .animate-spin{animation:none!important}" });
    await st.run(page, didit);
    await page.waitForTimeout(300);
    const file = `${OUT}/${name}--${size}--${theme}.png`;
    if (name === "phone-sheet") {
      await page.screenshot({ path: file });
    } else {
      await page.getByTestId("fx-demo").screenshot({ path: file });
    }
    console.log(file);
    await ctx.close();
  }
}
await browser.close();
