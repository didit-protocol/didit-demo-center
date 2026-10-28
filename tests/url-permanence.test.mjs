// Every demos.didit.me URL that was published keeps working, and crawlers see
// the real pages (CLAUDE.md, "URLs are permanent"). didit.me, the docs and
// search results link these paths and the legacy `/?demo=<id>` links, so a
// renamed or removed page must keep its URL through a permanent redirect.
// data/published-urls.json is append-only. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./helpers/register.mjs");

const { PRODUCT_DEMOS, routeForLegacy } = await import("../lib/product-demos/demos.ts");
const { PRIVATE_PATHS, indexablePaths } = await import("../lib/seo.ts");
const { default: robots } = await import("../app/robots.ts");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const published = JSON.parse(readFileSync(path.join(ROOT, "data/published-urls.json"), "utf8"));
const demoIds = new Set(PRODUCT_DEMOS.map((demo) => demo.id));

/** True when a page file serves `urlPath`, through the (site) route group too. */
function served(urlPath) {
  const productDemo = urlPath.match(/^\/product-demos\/([^/]+)$/);
  if (productDemo) {
    return existsSync(path.join(ROOT, "app/product-demos/[id]/page.tsx")) && demoIds.has(productDemo[1]);
  }
  return ["app", "app/(site)"].some((dir) => existsSync(path.join(ROOT, dir, urlPath, "page.tsx")));
}

test("every published path still has its page", () => {
  const lost = published.paths.filter((urlPath) => !served(urlPath));
  assert.deepEqual(lost, [], "keep these pages, or redirect them permanently to their closest equivalent");
});

test("every product demo is in the published list", () => {
  const missing = PRODUCT_DEMOS.map((demo) => `/product-demos/${demo.id}`).filter(
    (urlPath) => !published.paths.includes(urlPath),
  );
  assert.deepEqual(missing, [], "add these paths to data/published-urls.json");
});

test("every legacy /?demo= link still reaches a product demo", () => {
  for (const legacyId of published.legacyDemoIds) {
    const target = routeForLegacy(legacyId);
    assert.ok(target && served(target), `/?demo=${legacyId} no longer reaches a page`);
  }
});

test("the sitemap lists the hub, the industry demos and every product demo, never a moved path", () => {
  const paths = indexablePaths();
  for (const urlPath of ["/", "/fintech", "/igaming", "/marketplace", "/crypto-exchange"]) {
    assert.ok(paths.includes(urlPath), urlPath);
  }
  for (const demo of PRODUCT_DEMOS) assert.ok(paths.includes(`/product-demos/${demo.id}`), demo.id);
  assert.ok(!paths.includes("/modules") && !paths.includes("/product-demos"));
  assert.ok(paths.every(served), "the sitemap lists a path with no page");
});

test("production robots welcome every crawler, keep flow plumbing out and advertise the sitemap", () => {
  assert.deepEqual(robots(), {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: "https://demos.didit.me/sitemap.xml",
  });
});
