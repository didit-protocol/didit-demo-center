import { expect, test, type Page } from "@playwright/test";

import { completeHostedFlow, mockNorthmarket } from "./northmarket-mocks";
import { collectOwnErrors, expectNoHorizontalScroll } from "./page-health";

/**
 * Northmarket (/marketplace) end to end, on desktop and on a phone: the five
 * steps of the Demo Center on Didit's recorded staging answers (see
 * e2e/northmarket-mocks.ts). Authentication is off here, the production path
 * until it ships there, so Northmarket's own form opens the shop.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

const app = (page: Page) => page.getByTestId("northmarket-app");
const live = (page: Page) => page.getByTestId("didit-live");

/** On a phone the feed opens on each new check; fold it to reach the app. */
async function foldFeed(page: Page) {
  if (isPhone(page) && (await live(page).isVisible())) {
    await live(page).getByRole("button", { name: "Fold the feed" }).click();
  }
}

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

test("the storefront, the Demo Center bar and signals from the first load", async ({
  page,
}) => {
  await mockNorthmarket(page);
  await page.goto("/marketplace");

  const form = page.getByRole("form", { name: "Open your shop" });

  await expect(form).toBeVisible();
  await expect(form.getByLabel("Shop name")).toHaveValue("Ruiz Vintage");
  // Without a publishable key there is no Didit sign-up in the form.
  await expect(
    page.getByRole("button", { name: "Create a passkey" }),
  ).toHaveCount(0);
  await openFeed(page);
  await expect(
    live(page).getByText(/New device fingerprinted|Known device/),
  ).toBeVisible();
});

test("the old page's links land on the new flow", async ({ page }) => {
  await mockNorthmarket(page);
  await page.goto("/marketplace?chapter=buyer");
  await expect(page).toHaveURL(/\/marketplace$/);
  // No shop yet: the checkout step asks for one first.
  await expect(app(page).getByText(/Open your shop first/)).toBeVisible();
});

test("a shop, its KYB before payouts, the 1,497 EUR order held for an age check, a second shop paused", async ({
  page,
}) => {
  const mock = await mockNorthmarket(page);

  await page.goto("/marketplace");

  // 1. Sign up: the shop opens and its sign-up is monitored from this device.
  await foldFeed(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  await expect(
    app(page).getByRole("heading", { name: "Ruiz Vintage" }),
  ).toBeVisible();
  await expect(page.getByTestId("nm-payouts")).toContainText(
    "Verify your business to get paid",
  );
  expect(mock.submitted).toEqual(["transaction-signup-approved"]);
  expect(mock.headers[0]["x-transaction-token"]).toBe("e2e-token-signup");
  expect(mock.headers[0]["x-didit-pid"]).toBeTruthy();

  // 2. Verify: the KYB in the web SDK modal, then payouts turn on.
  await foldFeed(page);
  await page.getByRole("button", { name: "Verify my business" }).click();
  await completeHostedFlow(page);
  await expect(page.getByTestId("nm-payouts")).toContainText("Payouts are on");
  await expect(page.getByTestId("nm-payouts")).toContainText(
    "Ruiz Vintage SL is verified",
  );
  if (!isPhone(page))
    await expect(page.getByTestId("callout-kyb")).toContainText(
      "KYB approved · 2 owners",
    );
  await openFeed(page);
  await expect(live(page).getByText("Business approved")).toBeVisible();

  // 3. Transact: the order from the browser, held for the buyer's age check.
  await foldFeed(page);
  await goToStep(page, "Transact");
  await foldFeed(page);
  await app(page)
    .getByRole("button", { name: "Place order · 1,497 EUR" })
    .click();
  const hold = page.getByTestId("nm-hold");

  await expect(hold).toContainText("Confirm your age to finish this order");
  expect(mock.submitted.at(-1)).toBe("transaction-order-awaiting-user");
  expect(mock.headers.at(-1)?.["x-transaction-token"]).toBe(
    "e2e-token-purchase",
  );
  if (!isPhone(page))
    await expect(page.getByTestId("callout-rule")).toContainText(
      "Rule hit: orders of 1,000 EUR or more",
    );
  await foldFeed(page);
  await hold.getByRole("button", { name: "Take a selfie" }).click();
  await completeHostedFlow(page);
  await expect(hold).toContainText("Order placed");
  await expect(hold).toContainText("1,497 EUR to Ruiz Vintage");

  // 4. Stop fraud: a second shop on the same device, payouts paused.
  await foldFeed(page);
  await goToStep(page, "Stop fraud");
  await expect(
    page.getByText("This is a second shop on the same device as Ruiz Vintage"),
  ).toBeVisible();
  await expect(page.getByLabel("Shop name")).toHaveValue("Ruiz Vintage Outlet");
  await foldFeed(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  await expect(page.getByTestId("nm-paused")).toContainText(
    "Payouts are paused for this shop",
  );
  expect(mock.submitted.at(-1)).toBe("transaction-signup-held");
  // Both sign-ups carried the same device id.
  expect(mock.headers.at(-1)?.["x-didit-pid"]).toBe(
    mock.headers[0]["x-didit-pid"],
  );
  if (!isPhone(page))
    await expect(page.getByTestId("callout-device")).toContainText(
      "Same device as Ruiz Vintage",
    );

  // 5. Console: the Business page with the key people.
  if (isPhone(page)) {
    await openFeed(page);
    await live(page)
      .getByRole("button", { name: "Open the console view" })
      .click();
  } else {
    await goToStep(page, "Console");
  }
  const consoleView = page.getByTestId("console-view");

  await expect(
    consoleView.getByRole("heading", { name: "Ruiz Vintage SL" }),
  ).toBeVisible();
  await expect(consoleView).toContainText("Marta Ruiz");
  await expect(consoleView).toContainText("Director · 60% owner");
  await expect(consoleView).toContainText("ID verified");
  await expect(consoleView).toContainText("Ruiz Vintage Outlet");
  await consoleView.getByRole("tab", { name: "Transaction" }).click();
  await expect(consoleView).toContainText("1,497.00 EUR");
});

/** Opens the first shop with Northmarket's own form: the seller hub. */
async function openFirstShop(page: Page) {
  await page.goto("/marketplace");
  await foldFeed(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  await expect(
    app(page).getByRole("heading", { name: "Ruiz Vintage" }),
  ).toBeVisible();
}

test("the signed-in home loads with no errors of its own and no sideways scroll", async ({
  page,
}) => {
  await mockNorthmarket(page);
  const errors = collectOwnErrors(page);

  await openFirstShop(page);
  await expect(page.getByTestId("nm-payouts")).toContainText(
    "Verify your business to get paid",
  );

  expect(errors).toEqual([]);
  await expectNoHorizontalScroll(page);
});

test("without the seller KYB workflow, Verify my business is off and says why before any click", async ({
  page,
}) => {
  const mock = await mockNorthmarket(page, { kyb: false });

  await openFirstShop(page);
  const banner = page.getByTestId("nm-payouts");

  await expect(banner.getByTestId("nm-kyb-off")).toHaveText(
    "Business verification is not available here.",
  );
  await expect(
    banner.getByRole("button", { name: "Verify my business" }),
  ).toBeDisabled();

  // The Verify step does not try either: no 503 and no toast.
  await foldFeed(page);
  await goToStep(page, "Verify");
  await expect(banner.getByTestId("nm-kyb-off")).toBeVisible();
  await expect(app(page).getByRole("alert")).toHaveCount(0);
  expect(mock.kybStarts).toBe(0);

  // The rest of the demo runs: the checkout still places the order.
  await foldFeed(page);
  await goToStep(page, "Transact");
  await expect(
    app(page).getByRole("button", { name: "Place order · 1,497 EUR" }),
  ).toBeVisible();
});

test("a message stays with its step: changing step clears it", async ({
  page,
}) => {
  await mockNorthmarket(page);
  await page.goto("/marketplace");
  await foldFeed(page);
  await goToStep(page, "Transact");
  const toast = app(page).getByText(/Open your shop first/);

  await expect(toast).toBeVisible();
  await goToStep(page, "Sign up");
  await expect(toast).toHaveCount(0);
});

test("a second shop whose sign-up check failed offers it again, and resumes it after a reload", async ({
  page,
}) => {
  const mock = await mockNorthmarket(page);

  await openFirstShop(page);
  await foldFeed(page);
  await goToStep(page, "Stop fraud");
  await expect(page.getByLabel("Shop name")).toHaveValue("Ruiz Vintage Outlet");

  // Didit is down for the second shop's sign-up.
  mock.signupDown = true;
  await foldFeed(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  const banner = page.getByTestId("nm-paused");

  await expect(
    app(page).getByRole("heading", { name: "Ruiz Vintage Outlet" }),
  ).toBeVisible();
  await expect(banner).toContainText("The sign-up check did not finish");
  await expect(banner).not.toContainText("Checking");
  const failed = mock.failedSignups;

  expect(failed).toBeGreaterThan(0);

  // Try again while it is still down: the retry stays.
  await foldFeed(page);
  await banner.getByRole("button", { name: "Try again" }).click();
  await expect.poll(() => mock.failedSignups).toBeGreaterThan(failed);
  await expect(banner.getByRole("button", { name: "Try again" })).toBeVisible();

  // After a reload the page checks the sign-up on its own.
  mock.signupDown = false;
  await page.reload();
  await expect(banner).toContainText("Payouts are paused for this shop");
  expect(mock.submitted.at(-1)).toBe("transaction-signup-held");
});

test("a double click on Verify my business starts one KYB, not two", async ({
  page,
}) => {
  const mock = await mockNorthmarket(page);

  await page.goto("/marketplace");
  await foldFeed(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  await expect(
    app(page).getByRole("heading", { name: "Ruiz Vintage" }),
  ).toBeVisible();
  await foldFeed(page);
  await page.getByRole("button", { name: "Verify my business" }).dblclick();
  await completeHostedFlow(page);
  await expect(page.getByTestId("nm-payouts")).toContainText("Payouts are on");
  expect(mock.kybStarts).toBe(1);
});

test("an order whose claim fails once is retried and still shows its hold", async ({
  page,
}) => {
  const mock = await mockNorthmarket(page);

  await page.goto("/marketplace");
  await foldFeed(page);
  await page.getByRole("button", { name: "Open my shop" }).click();
  await expect(
    app(page).getByRole("heading", { name: "Ruiz Vintage" }),
  ).toBeVisible();
  const before = mock.claims;

  mock.claimFailures = 1;
  await foldFeed(page);
  await goToStep(page, "Transact");
  await foldFeed(page);
  await app(page)
    .getByRole("button", { name: "Place order · 1,497 EUR" })
    .click();
  await expect(page.getByTestId("nm-hold")).toContainText(
    "Confirm your age to finish this order",
  );
  // One order submitted to Didit, claimed on the second try.
  expect(mock.submitted.filter((name) => name.includes("order"))).toHaveLength(
    1,
  );
  expect(mock.claims - before).toBe(2);
});

test("restart returns to the sign-up screen", async ({ page }) => {
  // The restart button is in the computer's bar.
  test.skip(isPhone(page), "The phone bar has no restart button");
  await mockNorthmarket(page);
  await openFirstShop(page);

  await page.getByRole("button", { name: "Restart the demo" }).click();
  const form = page.getByRole("form", { name: "Open your shop" });

  await expect(form).toBeVisible();
  await expect(
    form.getByRole("heading", { name: "Open your shop" }),
  ).toBeVisible();
  await expect(form.getByLabel("Shop name")).toHaveValue("Ruiz Vintage");
});

test("at 1440 the open live feed leaves the order total clear", async ({
  page,
}) => {
  test.skip(
    isPhone(page),
    "On a phone the summary comes first, above the form",
  );
  await mockNorthmarket(page);
  await openFirstShop(page);
  await goToStep(page, "Transact");
  await app(page)
    .getByRole("button", { name: "Place order · 1,497 EUR" })
    .click();
  await expect(page.getByTestId("nm-hold")).toContainText(
    "Confirm your age to finish this order",
  );
  await expect(live(page)).toBeVisible();

  const total = await app(page).locator(".nm-lines .is-total").boundingBox();
  const feed = await live(page).boundingBox();

  expect(total).not.toBeNull();
  expect(feed).not.toBeNull();
  // Side by side: the total ends left of the feed.
  expect(total!.x + total!.width).toBeLessThanOrEqual(feed!.x);
});

test("the console's Transaction tab says what the order waits for in words", async ({
  page,
}) => {
  await mockNorthmarket(page);
  await openFirstShop(page);
  await foldFeed(page);
  await goToStep(page, "Transact");
  await foldFeed(page);
  await app(page)
    .getByRole("button", { name: "Place order · 1,497 EUR" })
    .click();
  await expect(page.getByTestId("nm-hold")).toContainText(
    "Confirm your age to finish this order",
  );

  if (isPhone(page)) {
    await openFeed(page);
    await live(page)
      .getByRole("button", { name: "Open the console view" })
      .click();
  } else {
    await goToStep(page, "Console");
  }
  const consoleView = page.getByTestId("console-view");

  await consoleView.getByRole("tab", { name: "Transaction" }).click();
  await expect(consoleView).toContainText("Waiting for the buyer's age check.");
  await expect(consoleView).not.toContainText("Not Started");
  await expect(consoleView).not.toContainText("Not started");
});
