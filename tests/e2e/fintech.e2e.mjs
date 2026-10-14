// End-to-end flows of the fintech demo (/fintech) in a real browser.
//
//   npm run build && npm run start &         # a staging build (.env)
//   npm run test:e2e                         # BASE_URL=http://localhost:3000
//   E2E_LIVE=1 npm run test:e2e              # adds the runs against staging
//
// The offline tests answer /api/fintech/* with the real handlers over
// responses recorded from Didit staging (see fintech-harness.mjs). The live
// tests call Didit staging for real; only the identity decision is set by the
// test, because nobody can pass KYC from a sandbox with no ID and no camera.
//
// CHROMIUM_PATH points Playwright at a system Chromium when its own browser
// is not installed.
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

import {
  fixture,
  installFintechApi,
  recordedDidit,
  stagingDidit,
  stubHostedFlow,
} from "./fintech-harness.mjs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const LIVE = process.env.E2E_LIVE === "1";
const DESKTOP = { width: 1440, height: 1000 };
const PHONE = { width: 390, height: 844 };

let browser;

test.before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
});

test.after(async () => {
  await browser?.close();
});

async function open({ viewport = DESKTOP, colorScheme = "light" } = {}) {
  const context = await browser.newContext({ viewport, colorScheme });
  const page = await context.newPage();

  return { context, page };
}

const NOT_STARTED = fixture("decision-not-started").response;
const SESSION = fixture("session-create").response;

/** An approved customer, as the account cookie holds them. */
const approvedAccount = (tx = []) => ({
  v: 1,
  id: NOT_STARTED.vendor_data,
  name: "Lena Fischer",
  email: "lena.fischer@example.com",
  country: "DEU",
  sid: NOT_STARTED.session_id,
  tx,
  at: Date.now(),
});

async function signUp(page) {
  await page.getByRole("button", { name: "Open an account" }).click();
  await page.getByLabel("Full name").fill("Lena Fischer");
  await page.getByLabel("Email", { exact: true }).fill("lena.fischer@example.com");
  await page.getByLabel("Country of residence").selectOption("DEU");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Verify your identity" }).waitFor();
}

const currentStep = (page) =>
  page.locator("li[data-current]").first().getAttribute("data-step");

async function pay(page, kind, amount, recipient) {
  await page
    .getByRole("button", { name: kind === "deposit" ? "Add money" : "Send money" })
    .click();
  if (recipient) await page.getByLabel("Recipient").fill(recipient);
  await page.getByLabel("Other amount").fill(String(amount));
  await page.locator('form button[type="submit"]').click();
}

test("sign-up validates every field, then opens the account", async () => {
  const { context, page } = await open();
  const jar = await installFintechApi(page, recordedDidit());

  await page.goto(`${BASE_URL}/fintech`);
  await page.getByRole("button", { name: "Open an account" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  for (const message of [
    "Enter your full name.",
    "Enter a valid email address.",
    "Choose the country you live in.",
  ]) {
    await page.getByText(message).waitFor();
  }
  assert.equal(jar.account, null, "nothing is created from an invalid form");

  await page.getByLabel("Full name").fill("Lena Fischer");
  await page.getByLabel("Email", { exact: true }).fill("lena.fischer@example.com");
  await page.getByLabel("Country of residence").selectOption("DEU");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Verify your identity" }).waitFor();

  assert.match(jar.account.id, /^fintech-demo-/);
  assert.equal(jar.account.country, "DEU");
  assert.equal(await currentStep(page), "verify");
  await context.close();
});

test("finishing the hosted flow checks the decision and opens the account", async () => {
  const { context, page } = await open();
  const didit = recordedDidit({ status: "In Progress" });
  const jar = await installFintechApi(page, didit);

  await stubHostedFlow(page, { outcome: "completed" });
  await page.goto(`${BASE_URL}/fintech`);
  await signUp(page);
  await page.getByRole("button", { name: "Verify my identity" }).click();

  // The SDK modal opens the session's hosted flow, then reports completion.
  await page.getByRole("heading", { name: "Checking your details" }).waitFor();
  assert.equal(jar.account.sid, SESSION.session_id);
  assert.equal(await currentStep(page), "decision");

  didit.decision.status = "Approved";
  await page.getByRole("heading", { name: "Your account is open" }).waitFor();
  await page.getByText("Welcome to Alder, Lena.").waitFor();

  // The operator panel shows the session as the console does.
  const operator = page.getByTestId("fx-operator");

  await operator.getByText(`Session #${SESSION.session_number}`).waitFor();
  await operator.getByText("Approved").first().waitFor();

  await page.getByRole("button", { name: "Go to my account" }).click();
  await page.getByRole("heading", { name: "Hi, Lena" }).waitFor();
  await context.close();
});

test("closing the hosted flow keeps the session and offers to continue", async () => {
  const { context, page } = await open();

  await installFintechApi(page, recordedDidit());
  await stubHostedFlow(page, { outcome: "cancelled" });
  await page.goto(`${BASE_URL}/fintech`);
  await signUp(page);
  await page.getByRole("button", { name: "Verify my identity" }).click();
  await page.getByText("You closed the verification before finishing.").waitFor();
  await page.getByRole("button", { name: "Continue verification" }).waitFor();
  await context.close();
});

test("a review never tells the customer why, and ends on its own", async () => {
  const { context, page } = await open();
  const didit = recordedDidit({ status: "In Review" });
  const jar = await installFintechApi(page, didit);

  jar.account = { ...approvedAccount() };
  await page.goto(`${BASE_URL}/fintech`);
  await page.getByRole("heading", { name: "We are reviewing your application" }).waitFor();

  const app = page.getByRole("region", { name: "Alder" });

  assert.doesNotMatch(await app.innerText(), /AML|sanction|PEP|match/i);
  // The operator side does show which check is under review.
  await page
    .getByTestId("fx-operator")
    .locator('[title="Under review"]')
    .waitFor();

  // An analyst approves in the console; the next read opens the account.
  didit.decision.status = "Approved";
  await page
    .getByRole("heading", { name: "Your account is open" })
    .waitFor({ timeout: 30000 });
  await context.close();
});

test("a declined application can only start over", async () => {
  const { context, page } = await open();
  const jar = await installFintechApi(
    page,
    recordedDidit({ status: "Declined" }),
  );

  jar.account = approvedAccount();
  await page.goto(`${BASE_URL}/fintech`);
  await page.getByRole("heading", { name: "We could not open your account" }).waitFor();
  await page.getByRole("button", { name: "Start over" }).last().click();
  await page.getByRole("button", { name: "Open an account" }).waitFor();
  assert.equal(jar.account, null);
  await context.close();
});

test("money moves through transaction monitoring; a big transfer is held", async () => {
  const { context, page } = await open();
  const didit = recordedDidit({ status: "Approved" });
  const jar = await installFintechApi(page, didit);

  jar.account = approvedAccount();
  await page.goto(`${BASE_URL}/fintech`);
  await page.getByText("No payments yet").waitFor();

  await pay(page, "deposit", 10000);
  await page.getByRole("heading", { name: "€10,000.00 added" }).waitFor();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByTestId("fx-balance").getByText("€10,000.00").waitFor();

  await pay(page, "transfer", 250, "Marta Ruiz");
  await page.getByRole("heading", { name: "€250.00 sent to Marta Ruiz" }).waitFor();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Send money" }).click();
  await page.getByLabel("Recipient").fill("Jonas Weber");
  await page.getByLabel("Other amount").fill("6000");
  await page.getByText("This transfer will be checked before it leaves.").waitFor();
  await page.locator('form button[type="submit"]').click();
  await page.getByRole("heading", { name: "Your payment is on hold" }).waitFor();
  assert.equal(await currentStep(page), "review");

  const held = page.getByTestId("fx-operator-transaction").first();

  await held.getByText("IN_REVIEW", { exact: true }).waitFor();
  await held.getByText("High-value outbound transfer (fintech demo)").waitFor();
  await held.getByText("score +40; change_status:IN_REVIEW").waitFor();

  await page.getByRole("button", { name: "Done" }).click();
  await page.getByTestId("fx-balance").getByText("€3,750.00").waitFor();
  await page.getByText("€6,000.00 on hold").waitFor();

  // More than is available is refused before anything reaches Didit.
  await pay(page, "transfer", 5000, "Marta Ruiz");
  await page.getByText("You only have €3,750.00 available.").waitFor();
  await page.getByRole("button", { name: "Back" }).click();
  assert.equal(jar.account.tx.length, 3);

  // An analyst releases the payment in the console; the app follows.
  didit.decide("APPROVED");
  await page.getByText("€6,000.00 on hold").waitFor({ state: "detached", timeout: 30000 });
  await context.close();
});

test("ongoing monitoring: explained to the customer, estimated for the operator", async () => {
  const { context, page } = await open();
  const jar = await installFintechApi(
    page,
    recordedDidit({ status: "Approved" }),
  );

  jar.account = approvedAccount();
  await page.goto(`${BASE_URL}/fintech`);

  // The bank app explains it; what it costs is not the customer's business.
  const app = page.getByRole("region", { name: "Alder" });

  await app.getByRole("heading", { name: "Ongoing AML monitoring" }).waitFor();
  assert.doesNotMatch(await app.innerText(), /\$|USD|Preview/);

  await page
    .getByTestId("fx-operator")
    .getByRole("button", { name: "Preview monitoring for this account" })
    .click();

  const estimate = page.getByTestId("fx-monitoring-estimate");

  await estimate.getByText("Profiles matched").waitFor();
  await estimate
    .getByText("Estimate only: nothing was switched on, screened or billed.")
    .waitFor();
  assert.equal(await currentStep(page), "monitoring");
  await context.close();
});

test("dark theme follows the system and remembers a choice", async () => {
  const { context, page } = await open({ colorScheme: "dark" });

  await installFintechApi(page, recordedDidit());
  await page.goto(`${BASE_URL}/fintech`);

  const demo = page.getByTestId("fx-demo");

  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="fx-demo"]')?.dataset.theme === "dark",
  );
  await page.getByRole("radio", { name: "Light" }).click();
  assert.equal(await demo.getAttribute("data-theme"), "light");
  await page.reload();
  await page.getByRole("button", { name: "Open an account" }).waitFor();
  assert.equal(await demo.getAttribute("data-theme"), "light");
  await context.close();
});

test("on a phone the panel opens as a bottom sheet", async () => {
  const { context, page } = await open({ viewport: PHONE });

  await installFintechApi(page, recordedDidit());
  await page.goto(`${BASE_URL}/fintech`);
  await page.getByRole("button", { name: "Open an account" }).waitFor();

  const sheet = page.getByRole("dialog", { name: "How this uses Didit" });
  const trigger = page.getByRole("button", { name: "How this uses Didit" });

  assert.equal(await sheet.count(), 0);
  // One panel in the page at a time, so its ids stay unique.
  assert.equal(await page.getByTestId("fx-operator").count(), 0);
  await trigger.click();
  await sheet.getByText("Sign up").first().waitFor();
  assert.equal(await page.getByTestId("fx-operator").count(), 1);

  // Tab stays inside the sheet; Escape closes it and focus goes back.
  for (let i = 0; i < 12; i += 1) await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    ),
  );
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "detached" });
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "How this uses Didit",
  );
  await context.close();
});

/** The focused element's box-shadow, which is where the focus ring is drawn. */
const focusShadow = (page) =>
  page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);

test("option groups take one Tab stop and move with the arrow keys", async () => {
  for (const colorScheme of ["light", "dark"]) {
    const { context, page } = await open({ colorScheme });

    await installFintechApi(page, recordedDidit());
    await page.goto(`${BASE_URL}/fintech`);

    // The theme switch: the chosen option is the only one in the Tab order.
    const theme = page.getByRole("radiogroup", { name: "Colour theme" });
    const chosen = theme.getByRole("radio", { checked: true });

    await page.waitForFunction(
      (scheme) =>
        document.querySelector('[data-testid="fx-demo"]')?.dataset.theme ===
        scheme,
      colorScheme,
    );
    assert.deepEqual(
      await theme
        .getByRole("radio")
        .evaluateAll((radios) => radios.map((r) => r.tabIndex)),
      colorScheme === "light" ? [0, -1] : [-1, 0],
    );
    await chosen.focus();
    // Keyboard focus shows a ring on the selected pill in both themes.
    await page.keyboard.press(colorScheme === "light" ? "ArrowRight" : "ArrowLeft");
    const next = colorScheme === "light" ? "Dark" : "Light";

    await theme.getByRole("radio", { name: next, checked: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.activeElement?.textContent?.trim()),
      next,
    );
    assert.notEqual(await focusShadow(page), "none");
    await context.close();
  }
});

test("amount presets are a radio group with arrow keys and a focus ring", async () => {
  const { context, page } = await open();
  const jar = await installFintechApi(page, recordedDidit({ status: "Approved" }));

  jar.account = approvedAccount();
  await page.goto(`${BASE_URL}/fintech`);
  await page.getByRole("button", { name: "Add money" }).click();

  const presets = page.getByRole("radiogroup", { name: "Choose an amount" });

  await presets.getByRole("radio", { name: "€10,000.00", checked: true }).waitFor();
  await presets.getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("Home");
  await presets.getByRole("radio", { name: "€1,000.00", checked: true }).waitFor();
  assert.notEqual(await focusShadow(page), "none");
  assert.equal(await page.getByLabel("Other amount").inputValue(), "1000");
  await page.keyboard.press("ArrowLeft");
  await presets.getByRole("radio", { name: "€10,000.00", checked: true }).waitFor();

  // A typed amount that is no preset leaves the first one as the Tab stop.
  await page.getByLabel("Other amount").fill("1234");
  assert.deepEqual(
    await presets.getByRole("radio").evaluateAll((r) => r.map((b) => b.tabIndex)),
    [0, -1, -1],
  );
  await context.close();
});

test("in Arabic the demo reads right to left", async () => {
  const { context, page } = await open();

  await context.addCookies([
    { name: "NEXT_LOCALE", value: "ar", url: BASE_URL },
  ]);
  await installFintechApi(page, recordedDidit());
  await page.goto(`${BASE_URL}/fintech`);

  const demo = page.getByTestId("fx-demo");

  assert.equal(await demo.getAttribute("dir"), "rtl");
  await page.getByRole("button", { name: "افتح حسابًا" }).waitFor();
  await context.close();
});

// ── Against Didit staging ─────────────────────────────────────────────

test(
  "live: the real route creates a real session and opens its hosted flow",
  { skip: !LIVE && "set E2E_LIVE=1 to run against staging" },
  async () => {
    const { context, page } = await open();

    await page.goto(`${BASE_URL}/fintech`);
    await signUp(page);
    await page.getByRole("button", { name: "Verify my identity" }).click();

    const frame = page.locator('iframe[src*="verify.staging.didit.me"]');

    await frame.waitFor({ timeout: 30000 });

    // The real decision for the real session, through the real route.
    const reply = await page.request.get(`${BASE_URL}/api/fintech/verification`);
    const { verification } = await reply.json();

    assert.equal(reply.status(), 200);
    assert.match(verification.sessionId, /^[0-9a-f-]{36}$/);
    assert.equal(verification.status, "not_started");

    // Reloading resumes from the signed cookie.
    await page.reload();
    await page.getByRole("button", { name: "Continue verification" }).waitFor();
    await context.close();
  },
);

test(
  "live: payments post to staging and the review rule holds a big transfer",
  { skip: !LIVE && "set E2E_LIVE=1 to run against staging" },
  async () => {
    const didit = stagingDidit({ status: "In Progress" });

    assert.ok(didit.hasKey, "API_KEY is needed in .env");

    const { context, page } = await open();
    const jar = await installFintechApi(page, didit);

    await stubHostedFlow(page, { outcome: "completed" });
    await page.goto(`${BASE_URL}/fintech`);
    await signUp(page);
    await page.getByRole("button", { name: "Verify my identity" }).click();
    await page.getByRole("heading", { name: "Checking your details" }).waitFor();
    didit.decision.status = "Approved";
    await page.getByRole("button", { name: "Go to my account" }).click();

    await pay(page, "deposit", 10000);
    await page.getByRole("heading", { name: "€10,000.00 added" }).waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Done" }).click();

    await pay(page, "transfer", 6000, "Jonas Weber");
    await page
      .getByRole("heading", { name: "Your payment is on hold" })
      .waitFor({ timeout: 20000 });

    const held = page.getByTestId("fx-operator-transaction").first();

    await held.getByText("IN_REVIEW", { exact: true }).waitFor();
    await held.getByText("High-value outbound transfer (fintech demo)").waitFor();
    assert.equal(jar.account.tx.length, 2);

    await page.getByRole("button", { name: "Done" }).click();
    await page
      .getByRole("button", { name: "Preview monitoring for this account" })
      .click();
    await page
      .getByTestId("fx-monitoring-estimate")
      .getByText("Profiles matched")
      .waitFor({ timeout: 20000 });
    await context.close();
  },
);
