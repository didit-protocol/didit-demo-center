import { expect, test, type Page } from "@playwright/test";

import { completeHostedFlow, mockAlder } from "./alder-mocks";

/**
 * Alder (/fintech) end to end, on desktop and on a phone: the five steps of
 * the Demo Center on Didit's recorded staging answers (see
 * e2e/alder-mocks.ts). Authentication is off here, the production path
 * until it ships there, so the bank's own sign-up opens the account.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

const app = (page: Page) => page.getByTestId("alder-app");
const live = (page: Page) => page.getByTestId("didit-live");

async function openFeed(page: Page) {
  if (isPhone(page) && !(await live(page).isVisible())) {
    await page.getByRole("button", { name: /Didit live, \d+ checks?/ }).click();
  }
}

async function goToStep(page: Page, step: string) {
  if (isPhone(page)) {
    await page.getByRole("button", { name: /^Step \d of 5/ }).click();
    await page
      .getByRole("menu", { name: "Demo steps" })
      .getByRole("menuitem", { name: step })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Demo steps" })
      .getByRole("button", { name: new RegExp(step) })
      .click();
  }
}

/** Sign up, KYC and AML in the SDK modal, then the account's first week. */
async function openAccount(page: Page) {
  const form = page.getByTestId("alder-signup");

  await form.getByLabel("Full name").fill("Lena Fischer");
  await form.getByLabel("Email").fill("lena.fischer@example.com");
  await form.getByLabel("Mobile number").fill("151 2044 7781");
  await form.getByRole("button", { name: "Open my account" }).click();
  await completeHostedFlow(page);
  await expect(app(page).getByTestId("alder-balance")).toHaveText(
    "12,480.20 EUR",
  );
}

test("the public site, the Demo Center bar and signals from the first load", async ({
  page,
}) => {
  await mockAlder(page);
  await page.goto("/fintech");

  await expect(
    page.getByRole("heading", { name: "Open your Alder account" }),
  ).toBeVisible();
  await expect(
    isPhone(page)
      ? page.getByRole("button", { name: /^Step 1 of 5: Sign up/ })
      : page.getByRole("navigation", { name: "Demo steps" }),
  ).toBeVisible();
  await openFeed(page);
  await expect(
    live(page).getByText(/New device fingerprinted|Known device/),
  ).toBeVisible();
  // Without a publishable key there is no Didit sign-up on the card.
  await expect(
    page.getByRole("button", { name: "Create a passkey" }),
  ).toHaveCount(0);
});

test("KYC and AML before the IBAN, monitored payments and the step-up on a 5,000 EUR transfer to a new payee", async ({
  page,
}) => {
  const mock = await mockAlder(page);

  await page.goto("/fintech");
  await openAccount(page);
  await openFeed(page);
  // The first week: six real transactions from the browser, with device data.
  await expect(live(page).getByText("Salary received")).toBeVisible();
  expect(mock.submitted).toHaveLength(6);
  expect(mock.headers[0]["x-transaction-token"]).toBe("e2e-token");
  expect(mock.headers[0]["x-didit-pid"]).toBeTruthy();
  await expect(app(page).getByTestId("alder-activity")).toContainText(
    "Nordwerk GmbH",
  );

  // Transact: 5,000 EUR to a payee Lena has never paid is held.
  await goToStep(page, "Transact");
  const send = page.getByTestId("alder-send");

  await expect(send.getByLabel("Amount")).toHaveValue("5000.00");
  await send.getByRole("button", { name: "Send 5,000.00 EUR" }).click();
  const stepUp = page.getByRole("dialog", { name: "Confirm it is you" });

  await expect(stepUp).toContainText("This is your first payment to Jonas Koch");
  expect(mock.submitted.at(-1)).toBe("transfer-held");
  expect(mock.bodies.at(-1)?.props).toMatchObject({
    demo_app: "fintech",
    new_payee: true,
  });
  if (!isPhone(page)) {
    await expect(page.getByTestId("callout-rule")).toContainText(
      "Rule hit: 5,000 EUR or more to a new payee",
    );
  }
  await stepUp.getByRole("button", { name: "Confirm with a selfie" }).click();
  await completeHostedFlow(page);
  const sent = page.getByRole("dialog", { name: "Transfer sent" });

  await expect(sent.getByTestId("alder-stepup-status")).toHaveText("Sent");
  await sent.getByRole("button", { name: "Done" }).click();
  await expect(app(page).getByTestId("alder-balance")).toHaveText(
    "7,480.20 EUR",
  );

  // The console view: this visitor's own transfer, never a canned one.
  await goToStep(page, "Console");
  const consoleView = page.getByTestId("console-view");

  await expect(consoleView).toContainText("5,000.00 EUR");
  await expect(consoleView).toContainText("5,000 EUR or more to a new payee");
  await expect(consoleView).toContainText("released automatically");
  await consoleView.getByRole("tab", { name: "Verification" }).click();
  await expect(consoleView).toContainText("Identity Card · Germany");
  await expect(consoleView).toContainText("No matches");
});

test("a sign-in without the passkey is blocked and nothing moves", async ({
  page,
}) => {
  const mock = await mockAlder(page);

  await page.goto("/fintech");
  await openAccount(page);
  const before = mock.submitted.length;

  await goToStep(page, "Stop fraud");
  const attack = page.getByRole("dialog", { name: "Sign in to Alder" });

  await attack
    .getByRole("button", { name: "Try to sign in without the passkey" })
    .click();
  const blocked = page.getByTestId("alder-blocked");

  await expect(blocked).toContainText("We blocked a sign-in to your account");
  await expect(blocked).toContainText("Declined · score 90");
  expect(mock.events.at(-1)).toMatchObject({
    event_category: "security",
    action_type: "login_failed",
    custom_values: { demo_app: "fintech", passkey: "failed" },
  });
  // The attacker never reached Payments.
  expect(mock.submitted.length).toBe(before);
  await openFeed(page);
  await expect(live(page).getByText("Sign-in blocked")).toBeVisible();
});
