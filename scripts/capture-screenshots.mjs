#!/usr/bin/env node
/**
 * Visual proof for the demo centre.
 *
 * Drives a real Chromium against a running instance and captures every surface
 * the redesign touches - catalogue, detail modal on each tab, API playground,
 * results modal - at desktop and at 390px.
 *
 * Usage:
 *   npm run build && npm run start &      # or: npm run dev
 *   npm run shots                         # defaults to http://localhost:3000
 *   BASE_URL=http://localhost:3111 npm run shots
 *   OUT_DIR=../proof npm run shots
 *
 * The site is light-only, exactly like didit.me and help.didit.me: the design
 * system ships no dark token set and nothing here toggles `.dark`. There is no
 * dark variant to capture.
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
/**
 * A real session id to prove the results modal against. Mint one with
 * `POST /v3/session/` on the same environment the app is pointed at; without
 * it the modal correctly reports that no decision exists for the id, which is
 * true but makes a poor screenshot.
 */
const SESSION_ID = process.env.PROOF_SESSION_ID || "";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "proof");

const DESKTOP = { width: 1440, height: 1000 };
const MOBILE = { width: 390, height: 844 };

fs.mkdirSync(OUT_DIR, { recursive: true });

const shot = async (page, name, { fullPage = false } = {}) => {
  const file = path.join(OUT_DIR, `${name}.png`);

  await page.screenshot({ path: file, fullPage });
  console.log(`  ${path.relative(process.cwd(), file)}`);
};

/** Open a demo card by its visible title and wait for the modal to settle. */
const openDemo = async (page, title) => {
  await page.getByRole("button", { name: new RegExp(title, "i") }).first().click();
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.waitForTimeout(400);
};

const closeModal = async (page) => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
};

async function main() {
  const browser = await chromium.launch();

  try {
    // ── Desktop ──────────────────────────────────────────────────────
    const page = await browser.newPage({ viewport: DESKTOP });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    await shot(page, "catalogue-desktop", { fullPage: true });
    await shot(page, "catalogue-desktop-viewport");

    // Hosted demo - overview tab, with the workflow id and Start demo footer.
    await openDemo(page, "Core KYC");
    await shot(page, "detail-hosted-overview");

    await page.getByRole("button", { name: "Integrate" }).click();
    await page.waitForTimeout(300);
    await shot(page, "detail-hosted-integrate");
    await closeModal(page);

    // API demo - lands on the sample decision, with the run trace.
    await openDemo(page, "Business verification");
    await shot(page, "detail-api-sample-decision");

    // Expand a subject row so the drill-down is visible.
    await page.getByRole("button", { name: /Holdco Cyprus Ltd/ }).click();
    await page.waitForTimeout(300);
    await shot(page, "detail-api-sample-expanded");

    // The playground, before and after the fixture runs.
    await page.getByRole("button", { name: "Open API playground" }).click();
    await page.waitForTimeout(400);
    await shot(page, "playground-idle");
    await page.getByRole("button", { name: "Send request" }).click();
    await page.waitForTimeout(1400);
    await shot(page, "playground-response");
    await closeModal(page);
    await closeModal(page);

    // Results modal, reached the way the hosted flow reaches it: a callback
    // redirect carrying a session id.
    await page.goto(
      `${BASE_URL}/verification/callback?verificationSessionId=${SESSION_ID}&status=In%20Review&demo=core-kyc`,
      { waitUntil: "networkidle" },
    );
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.waitForTimeout(1200);
    await shot(page, "results-modal");

    // Category filter, then a free-text search across the whole catalogue,
    // then the empty state - three different results, one bar.
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Monitoring/ }).click();
    await page.waitForTimeout(300);
    await shot(page, "catalogue-filtered");

    await page.getByRole("button", { name: /^All demos/ }).click();
    await page.locator("input[data-demo-search]").fill("ubo");
    await page.waitForTimeout(300);
    await shot(page, "catalogue-search");

    await page.locator("input[data-demo-search]").fill("mainframe");
    await page.waitForTimeout(300);
    await shot(page, "catalogue-empty");

    // The compose section at the foot of the page.
    await page.locator("input[data-demo-search]").fill("");
    await page.waitForTimeout(300);
    await page.getByText("Compose any flow.").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await shot(page, "compose-section");

    // Mid-scroll: the sticky filter bar has to sit flush under the chrome, not
    // behind it - this is the shot that catches a wrong offset.
    await page.evaluate(() => window.scrollTo({ top: 900 }));
    await page.waitForTimeout(500);
    await shot(page, "catalogue-sticky-bar");

    await page.close();

    // ── Mobile ───────────────────────────────────────────────────────
    const mobile = await browser.newPage({
      viewport: MOBILE,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    await mobile.goto(BASE_URL, { waitUntil: "networkidle" });
    await mobile.waitForTimeout(600);
    await shot(mobile, "catalogue-mobile", { fullPage: true });
    await shot(mobile, "catalogue-mobile-viewport");

    await openDemo(mobile, "Core KYC");
    await shot(mobile, "detail-mobile");
    await closeModal(mobile);

    await openDemo(mobile, "Business verification");
    await shot(mobile, "detail-mobile-sample");
    await mobile.close();

    console.log(`\nShots written to ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
