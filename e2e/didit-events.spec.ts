import { expect, test, type Page } from "@playwright/test";

import { mockAurora } from "./aurora-mocks";

const API = "https://verification.staging.didit.me";

async function recordEvents(page: Page) {
  const batches: {
    url: string;
    actions: string[];
    token: string | undefined;
  }[] = [];

  // Catch both environments so a production destination fails the assertion
  // without sending any test events to a real application.
  await page.route(
    /https:\/\/verification\.(staging\.)?didit\.me\/v1\/events\//,
    async (route) => {
      const request = route.request();
      const events =
        request.method() === "POST" ? request.postDataJSON().events : [];

      if (request.method() === "POST") {
        batches.push({
          url: request.url(),
          actions: events.map(
            (event: { action_type: string }) => event.action_type,
          ),
          token: request.headers()["x-monitoring-token"],
        });
      }
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          results: events.map((_: unknown, index: number) => ({
            index,
            outcome: "accepted",
            event_uuid: `00000000-0000-4000-9000-${String(index + 1).padStart(12, "0")}`,
            status: "APPROVED",
          })),
        }),
      });
    },
  );

  return batches;
}

test("cookie mode refreshes the token and sends a page view on first load and reload", async ({
  page,
}) => {
  let tokenRequests = 0;
  const batches = await recordEvents(page);

  await page.route("**/api/fintech/**", (route) =>
    route.fulfill({
      json: {
        customerId: "alder-0123456789abcdef01234567",
        authenticated: false,
        account: null,
      },
    }),
  );
  await page.route("**/api/didit/events-token", (route) => {
    expect(route.request().postDataJSON()).toEqual({ demo: "alder" });
    tokenRequests += 1;

    return route.fulfill({ json: { token: "e2e-monitoring" } });
  });

  await page.goto("/fintech");
  await expect.poll(() => tokenRequests).toBe(1);
  await expect
    .poll(() => batches.flatMap((batch) => batch.actions))
    .toEqual(["page_view"]);
  await page.reload();
  await expect.poll(() => tokenRequests).toBe(2);
  await expect
    .poll(() => batches.flatMap((batch) => batch.actions))
    .toEqual(["page_view", "page_view"]);
  expect(
    batches.every((batch) => batch.url.startsWith(`${API}/v1/events/`)),
  ).toBe(true);
  expect(batches.every((batch) => batch.token === "e2e-monitoring")).toBe(true);
});

test("a clean anonymous skip queues the page view until cookie signup", async ({
  page,
}) => {
  await mockAurora(page);
  const batches = await recordEvents(page);
  const tokenStatuses: number[] = [];

  page.on("response", (response) => {
    if (response.url().endsWith("/api/didit/events-token"))
      tokenStatuses.push(response.status());
  });
  await page.goto("/igaming");
  await expect.poll(() => tokenStatuses).toEqual([200]);
  expect(batches).toHaveLength(0);
  await page
    .getByTestId("aurora-app")
    .getByRole("button", { name: "Sign up" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Create your account" });

  await dialog.getByLabel("Full name").fill("Test Visitor");
  await dialog.getByLabel("Email").fill("visitor@example.com");
  await dialog.getByLabel("Date of birth").fill("1999-03-14");
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect
    .poll(() => batches.flatMap((batch) => batch.actions))
    .toEqual(["page_view", "signup"]);
  expect(tokenStatuses).toEqual([200, 200]);
  expect(
    batches.every((batch) => batch.url.startsWith(`${API}/v1/events/`)),
  ).toBe(true);
});
