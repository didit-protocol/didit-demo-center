import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * The product demos end to end, on desktop and on a phone: the hub's grid,
 * one live demo (Liveness) on Didit's recorded staging answers
 * (tests/fixtures/product-demos), one sample, and the old routes.
 *
 *   npm run build && npm run test:e2e:product-demos
 */

const FIXTURE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "tests", "fixtures", "product-demos", "liveness.json"),
    "utf8",
  ),
);
const STAGING = process.env.NEXT_PUBLIC_IS_STAGING !== "false";
const VERIFY = STAGING
  ? "https://verify.staging.didit.me"
  : "https://verify.didit.me";

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

/** The app's own session route, answered from the recording. */
async function mockLiveness(page: Page) {
  const calls: string[] = [];

  await page.route("**/api/product-demos/**", (route) => {
    const request = route.request();

    calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
    if (request.method() === "POST") return json(route, FIXTURE.create);

    return json(route, { decision: FIXTURE.approved, didit: [] });
  });
  // Didit's hosted flow in the SDK modal: a stand-in that reports completion.
  await page.route(`${VERIFY}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><html><body><button id="done">Complete</button><script>
document.getElementById("done").onclick = function () {
  parent.postMessage({ type: "didit:completed", data: { sessionId: "${FIXTURE.create.sessionId}", status: "Approved" } }, "*");
};</script></body></html>`,
    }),
  );

  return calls;
}

test("the hub lists all 18 product demos with the family filter", async ({
  page,
}) => {
  await page.goto("/#product-demos");
  const section = page.getByTestId("product-demos");

  await expect(
    section.getByRole("heading", { name: "One product at a time." }),
  ).toBeVisible();
  await expect(section.getByRole("listitem")).toHaveCount(18);
  await expect(section.getByText("Live", { exact: true })).toHaveCount(10);
  await expect(section.getByText("Sample decision")).toHaveCount(8);

  await section.getByRole("button", { name: /^Business/ }).click();
  await expect(section.getByRole("listitem")).toHaveCount(2);
  await section.getByRole("button", { name: /^Identity/ }).click();
  await expect(section.getByRole("listitem")).toHaveCount(10);
  await section.getByRole("button", { name: /^All/ }).click();

  await section.getByRole("link", { name: /^Liveness/ }).click();
  await expect(page).toHaveURL(/\/product-demos\/liveness$/);
});

test("Liveness: start, finish the selfie, see the decision, the feed and the console view", async ({
  page,
}) => {
  const calls = await mockLiveness(page);

  await page.goto("/product-demos/liveness");
  const demo = page.getByTestId("product-demo");

  await expect(demo.getByRole("heading", { name: "Liveness" })).toBeVisible();
  await expect(demo.getByText("Identity · Biometrics")).toBeVisible();
  await expect(demo.getByText("About 30 seconds")).toBeVisible();
  await expect(demo.getByLabel("The call behind this demo")).toContainText(
    '"<liveness workflow>"',
  );

  await demo.getByRole("button", { name: "Start the demo" }).click();
  await page
    .frameLocator(`iframe[src^="${VERIFY}"]`)
    .getByRole("button", { name: "Complete" })
    .click();

  const decision = page.getByTestId("decision");

  await expect(decision).toContainText("Approved");
  await expect(decision).toContainText("Passed · 99.4");
  await expect(decision).toContainText("Residential · no VPN");
  await expect(decision).toContainText(`S-${FIXTURE.approved.session_number}`);
  expect(calls).toEqual([
    "POST /api/product-demos/liveness/session",
    "GET /api/product-demos/liveness/session",
  ]);

  if (isPhone(page)) {
    await page.getByRole("button", { name: /Didit live, 3 checks/ }).click();
  }
  const feed = page.getByTestId("didit-live");

  await expect(feed).toContainText("Liveness passed");
  await expect(feed).toContainText("IP analysis");
  await expect(feed).toContainText("Session created");

  await demo.getByRole("button", { name: "Open the console view" }).click();
  const console = page.getByRole("dialog", { name: "Console view" });

  await expect(console).toContainText("Demo visitor");
  await expect(console).toContainText(FIXTURE.approved.vendor_data);
  await expect(console).toContainText("One timeline, every Didit product");
  await console.getByRole("button", { name: "Close the console view" }).click();

  await demo.getByRole("button", { name: "Run it again" }).click();
  await expect(
    demo.getByRole("button", { name: "Start the demo" }),
  ).toBeVisible();
});

test("a sample shows its fixture decision and sends nothing", async ({
  page,
}) => {
  const sent: string[] = [];

  page.on("request", (request) => {
    if (request.url().includes("/api/product-demos/")) sent.push(request.url());
  });
  await page.goto("/product-demos/transaction-monitoring");
  const demo = page.getByTestId("product-demo");
  const sample = demo.getByRole("region", { name: "Sample decision" });

  await expect(sample).toContainText("TX-81204 · a fixture, nothing sent");
  await expect(sample).toContainText("5,000.00 EUR");
  await expect(sample).toContainText("In review");
  await expect(sample).toContainText("New payee, 5,000 EUR or more");
  await expect(demo.getByLabel("The request and the response")).toContainText(
    '"risk_score": 38',
  );
  await expect(
    demo.getByRole("link", { name: "Open the Alder demo" }),
  ).toHaveAttribute("href", "/fintech");
  expect(sent).toEqual([]);
});

test("the old routes open the new pages", async ({ page }) => {
  await page.goto("/?demo=liveness");
  await expect(page).toHaveURL(/\/product-demos\/liveness$/);
  await page.goto("/modules?demo=txn");
  await expect(page).toHaveURL(/\/product-demos\/transaction-monitoring$/);
  await page.goto("/modules");
  await expect(page).toHaveURL(/\/#product-demos$/);
});
