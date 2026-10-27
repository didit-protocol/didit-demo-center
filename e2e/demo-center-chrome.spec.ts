import { expect, test, type Locator, type Page } from "@playwright/test";

import { mockAurora } from "./aurora-mocks";

/**
 * The Demo Center chrome on design system v4, checked where it is drawn: the
 * bar and the Didit live feed on Aurora Play at 1440 (the desktop project)
 * and 390 (the phone project). Geometry and computed styles stand in for
 * pixel baselines, so the check holds on any machine's fonts.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 640;

async function box(locator: Locator) {
  const rect = await locator.boundingBox();

  expect(rect).not.toBeNull();

  return rect!;
}

function css(locator: Locator, property: string) {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}

test("the bar: white, a hairline, the colour lockup and the DS v4 controls", async ({
  page,
}) => {
  await mockAurora(page);
  await page.goto("/igaming");

  // The banner role skips the copy React streams in hidden before hydrating.
  const bar = page.getByRole("banner");

  await expect(bar).toBeVisible();
  expect(await css(bar, "background-color")).toBe("rgb(255, 255, 255)");
  expect(await css(bar, "border-bottom-width")).toBe("1px");
  expect(await css(bar, "border-bottom-color")).toBe("rgb(237, 237, 237)");
  expect((await box(bar)).height).toBe(isPhone(page) ? 44 : 56);
  await expect(bar.getByRole("img", { name: "Didit" })).toHaveAttribute(
    "src",
    "/brand/didit-lockup-colour.png",
  );

  if (isPhone(page)) {
    // The phone keeps the current step only, as a raised segment.
    const current = page.getByRole("button", { name: /^Step 1 of 5/ });

    await expect(current).toBeVisible();
    expect(await css(current, "background-color")).toBe("rgb(255, 255, 255)");

    return;
  }

  // The five steps as one segmented control: a track with the current step raised.
  const track = bar.locator(".dx-track");
  const current = track.locator('[aria-current="step"]');

  await expect(track.getByRole("button")).toHaveCount(5);
  expect(await css(track, "background-color")).toBe("rgb(248, 248, 248)");
  expect(await css(current, "background-color")).toBe("rgb(255, 255, 255)");
  expect(await css(current.locator(".n"), "background-color")).toBe(
    "rgb(37, 103, 255)",
  );
  // Sandbox is the DS v4 warning status; Console view the secondary small
  // button; restart a ghost icon button.
  const sandbox = bar.getByText("Sandbox", { exact: true });

  await expect(sandbox).toHaveClass(/dd-status-warning/);
  expect(await css(sandbox, "background-color")).toBe("rgb(255, 247, 224)");
  const consoleView = bar.getByRole("button", { name: "Console view" });

  await expect(consoleView).toHaveClass(/dd-btn-secondary/);
  expect((await box(consoleView)).height).toBe(32);
  const restart = bar.getByRole("button", { name: "Restart the demo" });

  await expect(restart).toHaveClass(/dd-btn-ghost/);
  expect(await box(restart)).toMatchObject({ width: 32, height: 32 });
});

test("the feed: a hairline card on a computer, the collapsed pill on a phone", async ({
  page,
}) => {
  await mockAurora(page);
  await page.goto("/igaming");

  const feed = page.getByTestId("didit-live");
  const pill = page.getByTestId("didit-live-pill");

  // The root providers settle a moment after load; measure the shell once
  // there is only one.
  await expect(page.locator(".dx-app")).toHaveCount(1);

  if (isPhone(page)) {
    // It starts folded, so the lobby stays in view, and opens on a tap.
    await expect(pill).toBeVisible();
    await expect(feed).toHaveCount(0);
    const folded = await box(pill);
    const app = await box(page.locator(".dx-app"));

    expect(folded.x).toBe(app.x + 12);
    expect(folded.x + folded.width).toBe(app.x + app.width - 12);
    expect(folded.y + folded.height).toBe(app.y + app.height - 16);
    expect(await css(pill, "background-color")).toBe("rgb(255, 255, 255)");
    await pill.getByRole("button", { name: /Didit live, \d+ checks?/ }).click();
    await expect(feed).toBeVisible();
    await expect(pill).toHaveCount(0);
    // The fold button puts it back.
    await feed.getByRole("button", { name: "Fold the feed" }).click();
    await expect(pill).toBeVisible();

    return;
  }

  await expect(feed).toBeVisible();
  const card = await box(feed);
  // The page keeps a stable scrollbar gutter: measure from the app's edges.
  const app = await box(page.locator(".dx-app"));

  expect(card.width).toBe(372);
  expect(app.x + app.width - (card.x + card.width)).toBe(20);
  expect(app.y + app.height - (card.y + card.height)).toBe(20);
  expect(await css(feed, "background-color")).toBe("rgb(255, 255, 255)");
  expect(await css(feed, "border-top-width")).toBe("1px");
  expect(await css(feed, "border-top-color")).toBe("rgb(237, 237, 237)");
  // Signals reads the device on load: its glyph sits in a neutral tile in
  // the Signals colour, after a module dot in the same colour.
  const event = feed.locator(".lv-ev.p-sig").first();

  await expect(event).toContainText("Signals");
  const tile = event.locator(".lv-ic");

  expect(await css(tile, "background-color")).toBe("rgb(242, 242, 242)");
  expect(await css(tile, "color")).toBe("rgb(7, 121, 155)");
  expect(
    await event
      .locator(".lv-x small")
      .evaluate(
        (element) => getComputedStyle(element, "::before").backgroundColor,
      ),
  ).toBe("rgb(7, 121, 155)");
  // The DS v4 button footer.
  await expect(
    feed.getByRole("button", { name: "Open the console view" }),
  ).toHaveClass(/dd-btn-primary/);
  await expect(feed.getByRole("button", { name: "Code" })).toHaveClass(
    /dd-btn-secondary/,
  );
});
