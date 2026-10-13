import { expect, test, type Page } from "@playwright/test";

import { ACCOUNTS, completeHostedFlow, mockKestrel } from "./kestrel-mocks";

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
  await expect(compliance).toContainText("merklescience");

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
  await expect(
    compliance.getByRole("link", { name: "Open in the Didit Console" }),
  ).toHaveAttribute("href", /business\.staging\.didit\.me\/console/);

  await backToWallet(page);
  await expect(page.getByTestId("kestrel-balance")).toHaveText("0.00 ETH");
  await expect(page.getByText(/0\.80 ETH frozen/)).toBeVisible();
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
  await expect(page.getByText("On hold")).toBeVisible();
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
    .getByRole("button", { name: /Withdrawals: Travel Rule and step-up/ })
    .click();
  await expect(
    panel.getByRole("link", { name: /DiditSdk\.shared\.submitTransaction/ }),
  ).toHaveAttribute(
    "href",
    "https://docs.didit.me/transaction-monitoring/sdk-transaction-submission",
  );
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
  await page.goto("/");
  const card = page.getByRole("link", { name: /Kestrel/ });

  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("href", "/crypto-exchange");
});
