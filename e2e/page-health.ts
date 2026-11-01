import { expect, type Page } from "@playwright/test";

/**
 * Console errors from the demo's own origin. Third-party scripts (the web
 * SDK's iframe, fonts) are not the demo's code, so their messages are left
 * out; everything logged by this origin's pages and scripts counts.
 */
export function collectOwnErrors(page: Page): string[] {
  const errors: string[] = [];
  const own = (url: string | undefined) => {
    if (!url) return true;
    try {
      return new URL(url).origin === new URL(page.url()).origin;
    } catch {
      return true;
    }
  };

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (own(message.location().url)) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  return errors;
}

/** Nothing on the page is wider than the viewport. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
}
