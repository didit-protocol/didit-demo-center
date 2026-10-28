import { expect, test, type Page } from "@playwright/test";

import { completeHostedFlow, mockKestrel } from "./kestrel-mocks";
import { collectOwnErrors, expectNoHorizontalScroll } from "./page-health";

/**
 * Kestrel (/crypto-exchange) end to end, on desktop and on a phone: the five
 * steps of the Demo Center on Didit's recorded staging answers (see
 * e2e/kestrel-mocks.ts). Authentication is off here, the production path
 * until it ships there, so Kestrel's own sign-up opens the account.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

const app = (page: Page) => page.getByTestId("kestrel-app");
const live = (page: Page) => page.getByTestId("didit-live");

async function openFeed(page: Page) {
  if (isPhone(page) && !(await live(page).isVisible())) {
    await page.getByRole("button", { name: /Didit live, \d+ checks?/ }).click();
  }
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

/** The visible button of that name: the nav on a computer, the home on a phone. */
const action = (page: Page, name: string) =>
  app(page)
    .getByRole("button", { name, exact: true })
    .filter({ visible: true })
    .first();

/** The console view: the Demo Center bar on a computer, Kestrel's top bar on a phone. */
async function openConsoleView(page: Page) {
  await page
    .getByRole("button", { name: "Console view", exact: true })
    .filter({ visible: true })
    .click();
  const consoleView = page.getByTestId("console-view");

  await expect(consoleView).toBeVisible();

  return consoleView;
}

async function deposit(
  page: Page,
  network: "Bitcoin" | "Ethereum",
  amount: string,
) {
  await action(page, "Deposit").click();
  const dialog = page.getByRole("dialog", { name: /^Deposit/ });

  await dialog.getByLabel("Network").selectOption({ label: network });
  await dialog.getByLabel("Amount").fill(amount);
  await dialog.getByRole("button", { name: /^Deposit \d/ }).click();
  await expect(dialog).toBeHidden();
}

test("sign-up, signals from the first load, and the KYC before the first deposit", async ({
  page,
}) => {
  const mock = await mockKestrel(page, {
    account: null,
    afterOnboarding: "approved",
  });

  await page.goto("/crypto-exchange");
  const card = page.getByRole("form", { name: "Create your account" });

  await expect(card).toBeVisible();
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
  // Without a publishable key there is no Didit sign-up in the card.
  await expect(
    page.getByRole("button", { name: "Create a passkey" }),
  ).toHaveCount(0);

  await card.getByLabel("Email").fill("avery.quinn@example.com");
  await card.getByRole("button", { name: "Create account" }).click();

  // The KYC + AML session opens in the web SDK modal right after sign-up.
  await expect(
    page.locator('iframe[src*="/session/e2e-onboarding"]'),
  ).toBeVisible();
  expect(
    mock.requests.some(
      (request) =>
        request.method === "POST" && request.url.endsWith("/account"),
    ),
  ).toBe(true);
  await completeHostedFlow(page);
  await expect(page.getByText("Verify your identity to deposit.")).toHaveCount(
    0,
  );
  await openFeed(page);
  await expect(live(page).getByText("KYC and AML approved")).toBeVisible();
  await expect(
    live(page).getByText("Passport · Portugal · no matches"),
  ).toBeVisible();
});

test("an account in review cannot deposit yet", async ({ page }) => {
  await mockKestrel(page, { account: "review" });
  await page.goto("/crypto-exchange");

  await expect(
    page.getByText("Your verification is in review.").filter({ visible: true }),
  ).toBeVisible();
  await action(page, "Deposit").click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Deposits open once it is approved" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: /^Deposit/ })).toHaveCount(0);
});

test("a deposit is screened by the sending wallet before it is credited", async ({
  page,
}) => {
  const mock = await mockKestrel(page);

  await page.goto("/crypto-exchange");
  await deposit(page, "Bitcoin", "0.25");

  const row = app(page)
    .getByTestId("kestrel-activity-row")
    .filter({ visible: true })
    .first();

  await expect(row).toContainText("Deposit · 0.25 BTC");
  await expect(row).toContainText("Screened");
  const posted = mock.requests.find((request) =>
    request.url.endsWith("/v1/transactions/"),
  )?.body as {
    info: { currency: string; direction: string; amount: string };
    props: Record<string, string>;
    counterparty: { paymentMethod: { accountId: string } };
  };

  // From the browser, with the sending wallet for Didit to screen.
  expect(posted.info).toMatchObject({
    currency: "BTC",
    direction: "in",
    amount: "0.25",
  });
  expect(posted.props).toMatchObject({
    demo_app: "crypto-exchange",
    deposit_source: "own-wallet",
  });
  expect(posted.counterparty.paymentMethod.accountId).toMatch(/^bc1q/);
  if (!isPhone(page)) {
    await expect(page.getByTestId("callout-screened")).toContainText(
      "Sending wallet screened",
    );
    await expect(page.getByTestId("kestrel-balance-btc")).toHaveText("0.25");
  }
  await openFeed(page);
  await expect(live(page).getByText("Deposit screened")).toBeVisible();
  await expect(
    live(page).getByText("0.25 BTC · sending wallet risk 0 of 100, low"),
  ).toBeVisible();
});

test("a deposit Didit cannot take says so in a sentence and keeps the dialog open", async ({
  page,
}) => {
  const errors = collectOwnErrors(page);

  await mockKestrel(page, { submitStatus: 500 });
  await page.goto("/crypto-exchange");
  await action(page, "Deposit").click();
  const dialog = page.getByRole("dialog", { name: /^Deposit/ });

  await dialog.getByLabel("Amount").fill("0.25");
  await dialog.getByRole("button", { name: /^Deposit \d/ }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Didit could not be reached. Check your activity, then try again.",
  );
  await expect(dialog).not.toContainText("status 500");
  await expect(app(page).getByTestId("kestrel-activity-row")).toHaveCount(0);
  expect(errors.filter((error) => !/500/.test(error))).toEqual([]);
});

test("a deposit Didit accepted stays in the activity when its record is read late", async ({
  page,
}) => {
  await mockKestrel(page, { unreadableReads: 1 });
  await page.goto("/crypto-exchange");
  await deposit(page, "Bitcoin", "0.25");

  // Didit's own decision from the submission, until the full record is read.
  const row = app(page)
    .getByTestId("kestrel-activity-row")
    .filter({ visible: true })
    .first();

  await expect(row).toContainText("Deposit · 0.25 BTC");

  // On the next load the unsettled transfer is read again, in full.
  await page.reload();
  await expect(
    app(page).getByTestId("kestrel-activity-row").filter({ visible: true }).first(),
  ).toContainText("Screened");
});

test("a Travel Rule withdrawal asks for the wallet proof, then a selfie, then it is sent", async ({
  page,
}) => {
  const mock = await mockKestrel(page);

  await page.goto("/crypto-exchange");
  await deposit(page, "Bitcoin", "1");
  await goToStep(page, "Transact");

  const dialog = page.getByRole("dialog", { name: "Withdraw BTC" });

  await expect(dialog.getByLabel("Amount")).toHaveValue("0.8");
  await dialog.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(dialog).toContainText("A self-hosted wallet");
  await expect(dialog).toContainText("Prove the wallet is yours");
  if (!isPhone(page)) {
    await expect(page.getByTestId("callout-travel")).toContainText(
      "Travel Rule, built in",
    );
  }
  const posted = mock.requests.filter((request) =>
    request.url.endsWith("/v1/transactions/"),
  )[1]?.body as {
    type: string;
    info: { currency: string };
    props: Record<string, string>;
  };

  expect(posted.type).toBe("travelRule");
  expect(posted.info.currency).toBe("BTC");
  expect(posted.props.withdrawal_destination).toBe("own-wallet");

  await dialog.getByRole("button", { name: "Sign the message" }).click();
  await completeHostedFlow(page);
  await expect(dialog).toContainText("Wallet proven by a signed message");
  await dialog.getByRole("button", { name: "Take a selfie" }).click();
  await completeHostedFlow(page);
  await expect(dialog.getByRole("status")).toContainText("Sent.");
  await expect(dialog.getByRole("status")).toContainText(
    "0.8 BTC is on its way",
  );
  await dialog.getByRole("button", { name: "Close" }).click();
  await openFeed(page);
  await expect(live(page).getByText("Withdrawal sent")).toBeVisible();
});

test("a withdrawal to a sanctioned wallet is declined, and the console view shows why", async ({
  page,
}) => {
  await mockKestrel(page);

  await page.goto("/crypto-exchange");
  await deposit(page, "Ethereum", "1.5");
  await goToStep(page, "Stop fraud");

  const dialog = page.getByRole("dialog", { name: "Withdraw ETH" });

  await expect(dialog.getByLabel("To address")).toHaveValue(
    "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
  );
  await dialog.getByRole("button", { name: "Withdraw", exact: true }).click();
  const declined = page.getByTestId("kestrel-declined");

  await expect(declined).toContainText("We can’t send to this address");
  await expect(declined).toContainText("linked to a sanctioned service");
  await expect(declined).toContainText(
    "Your 1.5 ETH stays in your Kestrel account",
  );
  // Never asked to prove a wallet it already refused.
  await expect(
    dialog.getByRole("button", { name: "Sign the message" }),
  ).toHaveCount(0);
  if (!isPhone(page)) {
    await expect(page.getByTestId("callout-declined")).toContainText(
      "Wallet risk 95 · sanctions",
    );
  }
  await dialog.getByRole("button", { name: "Close" }).click();
  if (!isPhone(page))
    await expect(page.getByTestId("kestrel-balance-eth")).toHaveText("1.50");
  await openFeed(page);
  await expect(live(page).getByText("Withdrawal declined")).toBeVisible();

  // Console: the declined withdrawal, its wallet risk and the rules.
  await goToStep(page, "Console");
  const consoleView = page.getByTestId("console-view");

  await expect(
    consoleView.getByRole("tab", { name: "Transaction" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(consoleView).toContainText("1.5 ETH");
  await expect(consoleView).toContainText("95 / 100");
  await expect(consoleView).toContainText("Sanctioned wallet");
  await expect(consoleView).toContainText("No ETH left the platform.");
});

test("the signed-in home loads with no errors of its own and no sideways scroll", async ({
  page,
}) => {
  await mockKestrel(page);
  const errors = collectOwnErrors(page);

  await page.goto("/crypto-exchange");
  await expect(action(page, "Deposit")).toBeVisible();
  // A new account has no photo: the top bar shows its initials.
  const avatar = app(page).getByTestId("kestrel-avatar");

  await expect(avatar).toHaveText("AQ");
  await expect(avatar).toHaveAttribute("aria-label", "Avery Quinn");
  await expect(app(page).locator("header img.ks-ava")).toHaveCount(0);

  expect(errors).toEqual([]);
  await expectNoHorizontalScroll(page);
});

test("the coin cards keep their change inside on the landing", async ({
  page,
}) => {
  await mockKestrel(page, { account: null });
  await page.goto("/crypto-exchange");

  const cards = app(page).locator(".ks-coincard");

  await expect(cards).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    const card = cards.nth(index);
    const change = card.locator(".h > span").last();
    const outer = await card.boundingBox();
    const inner = await change.boundingBox();

    expect(outer && inner).toBeTruthy();
    expect(inner!.x).toBeGreaterThanOrEqual(outer!.x);
    expect(inner!.x + inner!.width).toBeLessThanOrEqual(
      outer!.x + outer!.width,
    );
  }
  await expectNoHorizontalScroll(page);
});

test("the banner says the check is open while the modal is, and how to resume after it closes", async ({
  page,
}) => {
  await mockKestrel(page, { account: null });
  await page.goto("/crypto-exchange");
  const card = page.getByRole("form", { name: "Create your account" });

  await card.getByLabel("Email").fill("avery.quinn@example.com");
  await card.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.locator('iframe[src*="/session/e2e-onboarding"]'),
  ).toBeVisible();

  const banner = app(page).locator(".ks-banner").filter({ visible: true });

  await expect(banner).toContainText("The check is open on this page.");
  await expect(banner).not.toContainText("window");
  await expect(
    app(page).getByRole("button", { name: "Continue verification" }),
  ).toHaveCount(0);

  // Closed without a decision: the session stays open, and the banner says how to pick it up.
  await page.getByRole("button", { name: "Close verification" }).click();
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await expect(banner).toContainText("Your verification is not finished.", {
    timeout: 15_000,
  });
  await expect(banner).toContainText("Select Continue verification");
  await expect(
    banner.getByRole("button", { name: "Continue verification" }),
  ).toBeVisible();
});

test("an open KYC session after a reload: the banner, the feed's person and the console view", async ({
  page,
}) => {
  await mockKestrel(page, { account: "processing" });
  await page.goto("/crypto-exchange");

  const banner = app(page)
    .locator(".ks-banner")
    .filter({ visible: true })
    .filter({ hasText: "Your verification is not finished." });

  await expect(banner).toBeVisible();
  await expect(banner).not.toContainText("window");
  await expect(
    banner.getByRole("button", { name: "Continue verification" }),
  ).toBeVisible();
  await expect(app(page).getByTestId("kestrel-avatar")).toHaveText("AQ");
  await openFeed(page);
  await expect(live(page)).toContainText("avery.quinn@example.com");
  await expect(live(page)).not.toContainText("No one signed in yet");

  // Opened from the top bar, the phone's too: the session is in progress, never missing.
  const consoleView = await openConsoleView(page);

  await consoleView.getByRole("tab", { name: "Verification" }).click();
  await expect(consoleView).toContainText("In progress");
  await expect(consoleView).toContainText(/Started \d{1,2} \w{3}, \d\d:\d\d/);
  await expect(consoleView).not.toContainText("Not started");
  await expect(consoleView).not.toContainText("No verification yet");
  await consoleView.getByRole("tab", { name: "Person" }).click();
  await expect(consoleView).toContainText("In progress");
  await expect(consoleView).toContainText("KYC started");
  await expect(consoleView).not.toContainText("Not started");
  await expect(consoleView).not.toContainText("Not verified");
});

test("the hub links to the crypto exchange", async ({ page }) => {
  await page.goto("/");
  const card = page.locator('a[href="/crypto-exchange"]').first();

  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
});
