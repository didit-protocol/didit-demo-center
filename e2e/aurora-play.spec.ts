import { expect, test, type Page } from "@playwright/test";

import { completeHostedFlow, mockAurora } from "./aurora-mocks";
import { collectOwnErrors, expectNoHorizontalScroll } from "./page-health";

/**
 * Aurora Play (/igaming) end to end, on desktop and on a phone: the five
 * steps of the Demo Center on Didit's recorded staging answers (see
 * e2e/aurora-mocks.ts). Authentication is off here, the production path
 * until it ships there, so the casino's own sign-up creates the player.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

const app = (page: Page) => page.getByTestId("aurora-app");
const live = (page: Page) => page.getByTestId("didit-live");

async function openFeed(page: Page) {
  if (isPhone(page) && !(await live(page).isVisible())) {
    await page.getByRole("button", { name: /Didit live, \d+ checks?/ }).click();
  }
}

async function signUp(page: Page, name: string, email: string) {
  const dialog = page.getByRole("dialog", { name: "Create your account" });

  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Date of birth").fill("1999-03-14");
  await dialog.getByRole("button", { name: "Create account" }).click();
  // The age check opens in the web SDK modal, then reports back.
  await completeHostedFlow(page);
  await expect(app(page).getByTestId("aurora-balance")).toBeVisible();
}

/** The five steps: in the bar on a computer, behind the step pill on a phone. */
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

async function deposit(page: Page, amount: string) {
  const cashier = page.getByRole("dialog", { name: "Cashier" });

  await cashier.getByLabel("Amount").fill(amount);
  await cashier.getByRole("button", { name: /^Deposit \d/ }).click();
}

test("the lobby, the Demo Center bar and signals from the first load", async ({
  page,
}) => {
  await mockAurora(page);
  await page.goto("/igaming");

  await expect(
    page.getByRole("button", { name: /Sign up$/ }).first(),
  ).toBeVisible();
  await expect(
    isPhone(page)
      ? page.getByRole("button", { name: /^Step 1 of 5: Sign up/ })
      : page.getByRole("navigation", { name: "Demo steps" }),
  ).toBeVisible();
  // Signals reads this device as soon as the page loads, before any sign-up.
  await openFeed(page);
  await expect(
    live(page).getByText(/New device fingerprinted|Known device/),
  ).toBeVisible();
  // Without a publishable key there is no Didit sign-up in the modal.
  await app(page).getByRole("button", { name: "Sign up" }).click();
  await expect(
    page.getByRole("button", { name: "Create a passkey" }),
  ).toHaveCount(0);
});

test("sign up, age check, monitored deposits and the ID step-up at 2,000 EUR", async ({
  page,
}) => {
  const mock = await mockAurora(page);

  await page.goto("/igaming");
  await app(page).getByRole("button", { name: "Sign up" }).click();
  await signUp(page, "Sofia Marin", "sofia.marin@example.com");
  await openFeed(page);
  await expect(live(page).getByText("Age check approved")).toBeVisible();

  // Transact: a deposit Didit approves, from the browser with device data.
  await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
  await deposit(page, "500");
  await expect(page.getByTestId("aurora-cashier-result")).toContainText(
    "Approved",
  );
  expect(mock.submitted).toEqual(["deposit-approved"]);
  expect(mock.headers[0]["x-transaction-token"]).toBe("e2e-token-0");
  expect(mock.headers[0]["x-didit-pid"]).toBeTruthy();

  // The next one crosses 2,000 EUR in 30 days: held for an ID check.
  await deposit(page, "1650");
  const hold = page.getByTestId("aurora-hold");

  await expect(hold).toContainText("Confirm your ID to finish this deposit");
  await expect(hold).toContainText("1,650 EUR goes through");
  if (!isPhone(page)) {
    await expect(page.getByTestId("callout-rule")).toContainText(
      "Rule hit: ID verification at 2,000 EUR deposited",
    );
  }
  await hold.getByRole("button", { name: "Verify my ID" }).click();
  await completeHostedFlow(page);
  await expect(page.getByTestId("aurora-cashier-result")).toContainText(
    "Approved",
  );
  await expect(page.getByTestId("aurora-cashier-result")).toContainText(
    "1,650.00 EUR",
  );
  await page
    .getByRole("dialog", { name: "Cashier" })
    .getByRole("button", { name: "Close" })
    .click();
  await expect(app(page).getByTestId("aurora-balance")).toHaveText(
    "2,150.00 EUR",
  );

  // The console view: this visitor's own records, never canned ones.
  if (isPhone(page)) {
    await openFeed(page);
    await live(page)
      .getByRole("button", { name: "Open the console view" })
      .click();
  } else {
    await page
      .getByRole("button", { name: "Console view", exact: true })
      .click();
  }
  const consoleView = page.getByTestId("console-view");

  await expect(
    consoleView.getByRole("heading", { name: "Sofia Marin" }),
  ).toBeVisible();
  await expect(consoleView).toContainText("Passport · Malta");
  await consoleView.getByRole("tab", { name: "Transaction" }).click();
  await expect(consoleView).toContainText("1,650.00 EUR");
  await expect(consoleView).toContainText(
    "ID verification at 2,000 EUR deposited",
  );
});

test("a second account on the same device cannot take the welcome offer again", async ({
  page,
}) => {
  const mock = await mockAurora(page);

  await page.goto("/igaming");
  await app(page).getByRole("button", { name: "Sign up" }).click();
  await signUp(page, "Sofia Marin", "sofia.marin@example.com");
  await app(page).getByRole("button", { name: "Claim now" }).click();
  await expect(page.getByRole("status")).toContainText("Welcome offer added");

  // Stop fraud: a new account in the same browser claims it again.
  await goToStep(page, "Stop fraud");
  await expect(
    page.getByText(
      "This is a second account on the same device as Sofia Marin",
    ),
  ).toBeVisible();
  await signUp(page, "Lucas Brandt", "lucas.b@example.com");
  await app(page).getByRole("button", { name: "Claim now" }).click();

  const offer = page.getByTestId("aurora-offer");

  await expect(offer).toContainText("The welcome offer is one per player");
  await expect(offer).toContainText("lucas.b@example.com");
  await expect(offer).toContainText("Bonus on hold");
  expect(mock.submitted).toEqual(["bonus-approved", "bonus-shared-device"]);
  // Both claims carried the same device id.
  expect(mock.headers[0]["x-didit-pid"]).toBe(mock.headers[1]["x-didit-pid"]);
  // On a phone the feed stays folded while the offer sheet is open.
  await offer.getByRole("button", { name: "Back to the lobby" }).click();
  await openFeed(page);
  await expect(live(page).getByText("Bonus held for review")).toBeVisible();
});

test("after sign-up the header shows the player and Sign out, never Log in or Sign up", async ({
  page,
}) => {
  await mockAurora(page);
  await page.goto("/igaming");
  const top = app(page);
  const account = top.getByRole("button", { name: "Account: Sofia Marin" });

  await top.getByRole("button", { name: "Sign up", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create your account" });

  await dialog.getByLabel("Full name").fill("Sofia Marin");
  await dialog.getByLabel("Email").fill("sofia.marin@example.com");
  await dialog.getByLabel("Date of birth").fill("1999-03-14");
  await dialog.getByRole("button", { name: "Create account" }).click();

  // Signed in, the age check still open: the player, no balance yet.
  await expect(account).toBeVisible();
  await expect(
    top.getByRole("button", { name: "Sign up", exact: true }),
  ).toHaveCount(0);
  await expect(
    top.getByRole("button", { name: "Log in", exact: true }),
  ).toHaveCount(0);
  await expect(top.getByTestId("aurora-balance")).toHaveCount(0);

  await completeHostedFlow(page);
  await expect(top.getByTestId("aurora-balance")).toBeVisible();
  await expect(
    top.getByRole("button", { name: "Sign up", exact: true }),
  ).toHaveCount(0);
  await expect(
    top.getByRole("button", { name: "Log in", exact: true }),
  ).toHaveCount(0);

  // On a phone the top bar keeps the balance; the menu is on a computer.
  if (isPhone(page)) return;
  await account.click();
  const menu = top.getByRole("menu", { name: "Account" });

  await expect(menu).toContainText("Sofia Marin");
  await expect(menu).toContainText("sofia.marin@example.com");
  await menu.getByRole("menuitem", { name: "Sign out" }).click();

  // Signed out: the casino clears its player cookie and shows the lobby.
  await expect(
    top.getByRole("button", { name: "Sign up", exact: true }),
  ).toBeVisible();
  await expect(account).toHaveCount(0);
  await page.reload();
  await expect(
    top.getByRole("button", { name: "Sign up", exact: true }),
  ).toBeVisible();
  await expect(top.getByTestId("aurora-balance")).toHaveCount(0);
});

test("the signed-in lobby loads with no errors and no horizontal scroll", async ({
  page,
}) => {
  await mockAurora(page);
  await page.goto("/igaming");
  await app(page).getByRole("button", { name: "Sign up", exact: true }).click();
  await signUp(page, "Sofia Marin", "sofia.marin@example.com");

  // The signed-in home, loaded fresh.
  const errors = collectOwnErrors(page);

  await page.reload();
  await expect(app(page).getByTestId("aurora-balance")).toBeVisible();
  await expect(
    app(page).getByRole("button", { name: "Account: Sofia Marin" }),
  ).toBeAttached();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("a double click on the welcome offer submits one bonus claim", async ({
  page,
}) => {
  const mock = await mockAurora(page);

  await page.goto("/igaming");
  await app(page).getByRole("button", { name: "Sign up" }).click();
  await signUp(page, "Sofia Marin", "sofia.marin@example.com");
  await app(page).getByRole("button", { name: "Claim now" }).dblclick();
  await expect(page.getByRole("status")).toContainText("Welcome offer added");
  expect(mock.submitted).toEqual(["bonus-approved"]);
});

test("when the transaction token cannot be minted the cashier says so and nothing is submitted", async ({
  page,
}) => {
  const mock = await mockAurora(page);

  await page.goto("/igaming");
  await app(page).getByRole("button", { name: "Sign up" }).click();
  await signUp(page, "Sofia Marin", "sofia.marin@example.com");
  // Registered last, so it answers before the mock's token route.
  await page.route("**/api/igaming/token", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error: "The Didit API could not be reached.",
        didit: [
          { method: "POST", path: "/v3/transactions/sdk-token/", status: 0 },
        ],
      }),
    }),
  );
  await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
  await deposit(page, "500");
  await expect(page.getByTestId("aurora-cashier-result")).toContainText(
    "The Didit API could not be reached.",
  );
  expect(mock.submitted).toEqual([]);
});

test("a hosted flow that fails to load leaves a readable error, not a stuck page", async ({
  page,
}) => {
  await mockAurora(page);
  // The web SDK's chunk never arrives (offline, a blocked script).
  await page.route(/\/_next\/static\/chunks\/.*sdk-web.*\.js$/, (route) =>
    route.abort(),
  );
  await page.goto("/igaming");
  await app(page).getByRole("button", { name: "Sign up" }).click();
  const dialog = page.getByRole("dialog", { name: "Create your account" });

  await dialog.getByLabel("Full name").fill("Sofia Marin");
  await dialog.getByLabel("Email").fill("sofia.marin@example.com");
  await dialog.getByLabel("Date of birth").fill("1999-03-14");
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText(
    "The verification could not open",
  );
});
