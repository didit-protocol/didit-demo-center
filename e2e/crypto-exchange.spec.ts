import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  ACCOUNTS,
  CONSOLE,
  completeHostedFlow,
  mockKestrel,
  raw,
} from "./kestrel-mocks";

/**
 * Kestrel (/crypto-exchange) end to end, on desktop and on a phone.
 * Didit's answers are recorded staging responses; see e2e/kestrel-mocks.ts.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;

const app = (page: Page) => page.getByTestId("kestrel-app");
const stage = (page: Page) => page.getByTestId("kestrel-stage");

async function open(page: Page) {
  await page.goto("/crypto-exchange");
  await expect(app(page)).toBeVisible();
}

async function deposit(page: Page, source: RegExp, amount: string) {
  await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
  await page.getByRole("radio", { name: source }).click();
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("button", { name: "Receive deposit" }).click();
}

async function withdraw(page: Page, destination: RegExp, amount: string) {
  await app(page)
    .getByRole("button", { name: "Withdraw", exact: true })
    .click();
  await page.getByRole("radio", { name: destination }).click();
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
}

async function backToWallet(page: Page) {
  await app(page).getByRole("button", { name: "Wallet" }).click();
}

test("sign-up opens the hosted KYC flow and shows the account while it runs", async ({
  page,
}) => {
  const mock = await mockKestrel(page, { account: null });

  await open(page);
  await expect(
    page.getByRole("heading", { name: "Open your Kestrel account" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Verify my identity" }).click();

  // The real hosted flow opens in the Didit web SDK modal.
  await expect(
    page.locator('iframe[src^="https://verify.staging.didit.me/session/"]'),
  ).toBeVisible();
  expect(
    mock.requests.some(
      (r) => r.method === "POST" && r.url.endsWith("/account"),
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Close verification" }).click();
  await expect(
    page.getByRole("heading", { name: "Finishing your verification" }),
  ).toBeVisible();
  await expect(app(page).getByText("Not Started").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue verification" }),
  ).toBeVisible();
  await expect(page.getByText(ACCOUNTS.processing.sessionId)).toBeVisible();
});

test("a finished onboarding opens the account", async ({ page }) => {
  await mockKestrel(page, { account: null, afterOnboarding: "approved" });

  await open(page);
  await page.getByRole("button", { name: "Verify my identity" }).click();
  await completeHostedFlow(page);
  await expect(
    page.getByRole("heading", { name: "Welcome, Avery" }),
  ).toBeVisible();
  await expect(page.getByTestId("kestrel-balance")).toHaveText("0.00 ETH");
  await expect(
    app(page).getByRole("link", { name: "Open in the Didit Console" }),
  ).toHaveAttribute(
    "href",
    `https://business.staging.didit.me/console/${CONSOLE.organizationId}/${CONSOLE.applicationId}/kyc/verifications/${ACCOUNTS.approved.sessionId}`,
  );
});

test("an account in review or declined stays locked", async ({ page }) => {
  await mockKestrel(page, { account: "review" });
  await open(page);
  await expect(
    page.getByRole("heading", { name: "Your account is under review" }),
  ).toBeVisible();
  await expect(page.getByText(/2 possible matches/)).toBeVisible();
  await expect(
    app(page).getByRole("button", { name: "Deposit", exact: true }),
  ).toHaveCount(0);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockKestrel(page, { account: "declined" });
  await open(page);
  await expect(
    page.getByRole("heading", { name: "We could not open your account" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Check again" })).toHaveCount(
    0,
  );
});

test("a deposit from the user's wallet is screened and credited", async ({
  page,
}) => {
  const mock = await mockKestrel(page);

  await open(page);
  await deposit(page, /From your wallet/, "1.25");

  await expect(stage(page)).toContainText("Deposit credited");
  const sent = mock.requests.find((r) => r.url.endsWith("/deposits"))?.body as {
    source: string;
    amount: string;
  };

  expect(sent).toMatchObject({ source: "own-wallet", amount: "1.25" });

  const compliance = page.getByTestId("kestrel-compliance-view");

  await expect(compliance).toContainText("0/100");
  await expect(compliance).toContainText("Merkle Science");

  await backToWallet(page);
  await expect(page.getByTestId("kestrel-balance")).toHaveText("1.25 ETH");
});

test("a deposit from a sanctioned wallet is frozen, with the compliance view", async ({
  page,
}) => {
  await mockKestrel(page);

  await open(page);
  await deposit(page, /From an unknown sender/, "0.8");

  await expect(stage(page)).toContainText("Deposit frozen");
  const compliance = page.getByTestId("kestrel-compliance-view");

  await expect(compliance).toContainText("Declined");
  await expect(compliance).toContainText("95/100");
  await expect(compliance).toContainText("CRITICAL");
  await expect(compliance).toContainText(
    "Wallet risk: sanctioned wallet (crypto exchange demo)",
  );
  await expect(compliance).toContainText("Sanctions / Multi-Regime Designated");
  // The Console ids come from the server, so the link lands on this record.
  await expect(
    compliance.getByRole("link", { name: "Open in the Didit Console" }),
  ).toHaveAttribute(
    "href",
    `https://business.staging.didit.me/console/${CONSOLE.organizationId}/${CONSOLE.applicationId}/transactions/detail/${raw("deposit-unknown-sender").uuid}`,
  );
  await expect(compliance).not.toContainText("search for the transaction");

  await backToWallet(page);
  await expect(page.getByTestId("kestrel-balance")).toHaveText("0.00 ETH");
  await expect(page.getByText(/0\.80 ETH frozen/)).toBeVisible();
});

test("without Console ids the operator links open the Console and name the record", async ({
  page,
}) => {
  await mockKestrel(page, { console: null });

  await open(page);
  await expect(
    app(page).getByRole("link", { name: "Open in the Didit Console" }),
  ).toHaveAttribute("href", "https://business.staging.didit.me/console");
  await deposit(page, /From an unknown sender/, "0.8");

  const compliance = page.getByTestId("kestrel-compliance-view");

  await expect(
    compliance.getByRole("link", { name: "Open in the Didit Console" }),
  ).toHaveAttribute("href", "https://business.staging.didit.me/console");
  await expect(compliance).toContainText("search for the transaction id above");
});

test("a withdrawal to the user's wallet needs wallet proof, then a selfie, then clears", async ({
  page,
}) => {
  const mock = await mockKestrel(page);

  await open(page);
  await deposit(page, /From your wallet/, "1.25");
  await expect(stage(page)).toContainText("Deposit credited");
  await backToWallet(page);

  await withdraw(page, /Your wallet/, "0.4");

  await expect(stage(page)).toContainText("Prove the wallet is yours");

  // Submitted with the SDK: a Travel Rule transfer to a declared self-hosted wallet.
  const submitted = mock.requests.find((r) =>
    r.url.endsWith("/v1/transactions/"),
  )?.body as {
    type: string;
    info: { direction: string };
    counterparty: { paymentMethod: { type: string } };
    includeCryptoScreening: boolean;
  };

  expect(submitted.type).toBe("travelRule");
  expect(submitted.info.direction).toBe("out");
  expect(submitted.counterparty.paymentMethod.type).toBe("unhosted_wallet");
  expect(submitted.includeCryptoScreening).toBe(true);

  await expect(page.getByTestId("kestrel-compliance-view")).toContainText(
    "UNCONFIRMED_OWNERSHIP",
  );

  await stage(page).getByRole("button", { name: "Prove ownership" }).click();
  await completeHostedFlow(page);
  await expect(stage(page)).toContainText("Confirm it's you");
  await expect(page.getByTestId("kestrel-compliance-view")).toContainText(
    "Exchange completed",
  );

  await stage(page).getByRole("button", { name: "Take a selfie" }).click();
  await completeHostedFlow(page);
  await expect(stage(page)).toContainText("Withdrawal approved");
  await expect(page.getByTestId("kestrel-compliance-view")).toContainText(
    "User verification approved",
  );

  await backToWallet(page);
  await expect(page.getByTestId("kestrel-balance")).toHaveText("0.85 ETH");
});

test("a withdrawal to another exchange shows the Travel Rule routing outcome", async ({
  page,
}) => {
  await mockKestrel(page);

  await open(page);
  await deposit(page, /From your wallet/, "1.25");
  await expect(stage(page)).toContainText("Deposit credited");
  await backToWallet(page);
  await withdraw(page, /another exchange/, "0.3");

  await expect(stage(page)).toContainText("found none");
  await expect(page.getByTestId("kestrel-compliance-view")).toContainText(
    "COUNTERPARTY_VASP_NOT_FOUND",
  );
  await backToWallet(page);
  // The transfer waits on the user, so its row asks for action and the
  // balance card holds the amount.
  const row = page
    .getByRole("region", { name: "Activity" })
    .getByRole("listitem")
    .filter({ hasText: "Withdrawal" });

  await expect(row).toContainText("Action needed");
  await expect(page.getByRole("region", { name: "Balance" })).toContainText(
    "On hold 0.30 ETH",
  );
});

test("a withdrawal to a sanctioned address is blocked without asking for wallet proof", async ({
  page,
}) => {
  await mockKestrel(page);

  await open(page);
  await deposit(page, /From your wallet/, "1.25");
  await expect(stage(page)).toContainText("Deposit credited");
  await backToWallet(page);

  await app(page)
    .getByRole("button", { name: "Withdraw", exact: true })
    .click();
  await page.getByRole("radio", { name: /Another address/ }).click();
  await page.getByRole("button", { name: /Try a sanctioned address/ }).click();
  await page.getByLabel("Amount").fill("0.2");
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();

  await expect(stage(page)).toContainText("Withdrawal blocked");
  // Didit minted a wallet-ownership widget for this transfer; Kestrel never shows it.
  await expect(
    page.getByRole("button", { name: "Prove ownership" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("kestrel-compliance-view")).toContainText(
    "95/100",
  );

  await backToWallet(page);
  await expect(page.getByTestId("kestrel-balance")).toHaveText("1.25 ETH");
});

test("the withdrawal form checks the amount and the address before submitting", async ({
  page,
}) => {
  const mock = await mockKestrel(page);

  await open(page);
  await deposit(page, /From your wallet/, "1.25");
  await expect(stage(page)).toContainText("Deposit credited");
  await backToWallet(page);

  await withdraw(page, /Your wallet/, "2");
  await expect(
    page.getByText("You can withdraw up to 1.25 ETH."),
  ).toBeVisible();

  await page.getByRole("radio", { name: /Another address/ }).click();
  await page.getByPlaceholder("0x...").fill("0x1234");
  await page.getByLabel("Amount").fill("0.1");
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByText(/valid Ethereum address/)).toBeVisible();
  expect(mock.requests.some((r) => r.url.endsWith("/token"))).toBe(false);
});

test("the option groups are one Tab stop, follow the arrow keys and show every description in full", async ({
  page,
}) => {
  await mockKestrel(page);
  await open(page);

  // Text cut off with an ellipsis is wider than the box that clips it.
  const clipped = (group: Locator) =>
    group.evaluate((element) =>
      Array.from(element.querySelectorAll("span")).some(
        (span) => span.clientWidth > 0 && span.scrollWidth > span.clientWidth,
      ),
    );

  const area = page.locator(".kestrel");
  const light = page.getByRole("radio", { name: "Light" });
  const dark = page.getByRole("radio", { name: "Dark" });

  await expect(dark).toHaveAttribute("tabindex", "-1");
  await light.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dark).toBeFocused();
  await expect(area).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("ArrowLeft");
  await expect(light).toBeFocused();
  await expect(area).toHaveAttribute("data-theme", "light");

  await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
  const sources = page.getByRole("radiogroup", { name: "Deposit source" });
  const own = sources.getByRole("radio", { name: /From your wallet/ });
  const unknown = sources.getByRole("radio", { name: /unknown sender/ });

  expect(await clipped(sources)).toBe(false);
  await own.focus();
  await page.keyboard.press("ArrowDown");
  await expect(unknown).toBeFocused();
  await expect(unknown).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowDown");
  await expect(own).toBeFocused();
  await expect(own).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Amount")).toBeFocused();

  await page.getByRole("button", { name: "Receive deposit" }).click();
  await expect(stage(page)).toContainText("Deposit credited");
  await backToWallet(page);

  await app(page)
    .getByRole("button", { name: "Withdraw", exact: true })
    .click();
  const destinations = page.getByRole("radiogroup", {
    name: "Withdrawal destination",
  });

  expect(await clipped(destinations)).toBe(false);
  await destinations.getByRole("radio", { name: /Your wallet/ }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(
    destinations.getByRole("radio", { name: /Another address/ }),
  ).toBeFocused();
  await expect(page.getByPlaceholder("0x...")).toBeVisible();
});

test("the Didit panel follows the user and links every call to the docs", async ({
  page,
}) => {
  await mockKestrel(page);
  await open(page);

  if (isPhone(page)) {
    await expect(
      page.getByRole("complementary", { name: "How this uses Didit" }),
    ).toBeHidden();
    await page.getByRole("button", { name: "How this uses Didit" }).click();
  }

  const panel = isPhone(page)
    ? page.getByRole("dialog", { name: "How this uses Didit" })
    : page.getByRole("complementary", { name: "How this uses Didit" });

  await expect(
    panel.getByRole("button", { name: /Deposits: wallet screening/ }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    panel.getByRole("link", { name: /POST \/v3\/transactions\// }),
  ).toHaveAttribute(
    "href",
    "https://docs.didit.me/management-api/transactions/create",
  );

  await panel
    .getByRole("button", { name: /Withdrawals: Travel Rule and selfie/ })
    .click();
  await expect(
    panel.getByRole("link", { name: /DiditSdk\.shared\.submitTransaction/ }),
  ).toHaveAttribute(
    "href",
    "https://docs.didit.me/transaction-monitoring/sdk-transaction-submission",
  );
});

test("on a phone the Didit panel dialog keeps the keyboard inside it", async ({
  page,
}) => {
  test.skip(!isPhone(page), "The dialog only exists below the lg breakpoint");
  await mockKestrel(page);
  await open(page);

  const button = page.getByRole("button", { name: "How this uses Didit" });
  const dialog = page.getByRole("dialog", { name: "How this uses Didit" });
  const focusInside = () =>
    dialog.evaluate((element) => element.contains(document.activeElement));

  await button.click();
  await expect(dialog).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe("hidden");

  // Shift+Tab straight from the panel, then more presses than the dialog has
  // controls, so Tab has to wrap both ways.
  await page.keyboard.press("Shift+Tab");
  expect(await focusInside()).toBe(true);
  for (let press = 0; press < 20; press += 1) {
    await page.keyboard.press("Tab");
    expect(await focusInside()).toBe(true);
  }
  for (let press = 0; press < 20; press += 1) {
    await page.keyboard.press("Shift+Tab");
    expect(await focusInside()).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe("");
});

test("the selected theme and amount pills show a focus ring in both themes", async ({
  page,
}) => {
  await mockKestrel(page);
  await open(page);

  // `shadow-ring` is a solid 3px ring in the theme's --ring (its blue), after
  // two transparent layers Tailwind always lists.
  const LIGHT_RING = "rgb(37, 103, 255) 0px 0px 0px 3px";
  const DARK_RING = "rgb(84, 138, 255) 0px 0px 0px 3px";
  const shadow = (locator: Locator) =>
    locator.evaluate((element) => getComputedStyle(element).boxShadow);
  const light = page.getByRole("radio", { name: "Light" });
  const dark = page.getByRole("radio", { name: "Dark" });

  // The selected pill is ink on canvas, so the ring is all that shows focus.
  expect(await shadow(light)).toBe("none");
  await light.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dark).toBeFocused();
  await expect.poll(() => shadow(dark)).toContain(DARK_RING);
  await page.keyboard.press("ArrowLeft");
  await expect(light).toBeFocused();
  await expect.poll(() => shadow(light)).toContain(LIGHT_RING);

  await app(page).getByRole("button", { name: "Deposit", exact: true }).click();
  const selected = page.getByRole("button", { name: "1.25 ETH", exact: true });

  expect(await shadow(selected)).toBe("none");
  await page.getByLabel("Amount").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(selected).toBeFocused();
  await expect.poll(() => shadow(selected)).toContain(LIGHT_RING);

  await dark.click();
  await page.getByLabel("Amount").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(selected).toBeFocused();
  await expect.poll(() => shadow(selected)).toContain(DARK_RING);
});

test("the dialog's close button keeps its circle in the dark theme", async ({
  page,
}) => {
  test.skip(!isPhone(page), "The panel is a dialog below 1024px only.");
  await mockKestrel(page);
  await open(page);

  await page.getByRole("radio", { name: "Dark" }).click();
  await page.getByRole("button", { name: "How this uses Didit" }).click();
  const close = page
    .getByRole("dialog", { name: "How this uses Didit" })
    .getByRole("button", { name: "Close" });
  const fill = () =>
    close.evaluate((element) => getComputedStyle(element).backgroundColor);

  // 4% of the dark theme's ink (244 244 246), not of black.
  expect(await fill()).toBe("rgba(244, 244, 246, 0.04)");
  await close.hover();
  await expect.poll(fill).toBe("rgba(244, 244, 246, 0.1)");
});

test("the theme switch darkens the demo area and is remembered", async ({
  page,
}) => {
  await mockKestrel(page);
  await open(page);

  const area = page.locator(".kestrel");

  await expect(area).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(area).toHaveAttribute("data-theme", "dark");
  const canvas = await app(page).evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  expect(canvas).toBe("rgb(14, 14, 16)");

  await page.reload();
  await expect(area).toHaveAttribute("data-theme", "dark");
});

test("the catalogue links to the crypto exchange app", async ({ page }) => {
  await page.goto("/modules");
  const card = page.getByRole("link", { name: /Kestrel/ });

  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("href", "/crypto-exchange");
});
