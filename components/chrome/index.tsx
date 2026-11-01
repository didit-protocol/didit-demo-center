"use client";

import { StickyHeader } from "@website/components/chrome/StickyHeader";
import { Footer } from "@website/components/chrome/Footer";

/**
 * The didit.me site chrome, rendered from the VENDORED website sources under
 * vendor/didit-website so demos.didit.me carries the exact navbar AND footer
 * didit.me and help.didit.me ship (see scripts/website-chrome/manifest.mjs for
 * the sync + parity contract).
 *
 * These are thin client boundaries: next-intl context comes from the root
 * layout, and the chrome's marketing links resolve to absolute didit.me URLs
 * through the vendored navigation shim - except the routes this app owns,
 * which stay local so "Demo center" in the Developers menu lands right here.
 *
 * <WebsiteHeader> must stay a direct child of <body>. Wrapping it in a div
 * would make that div the sticky containing block and pin the header to the
 * wrapper instead of the viewport (documented in the website layout).
 */

export function WebsiteHeader() {
  return <StickyHeader />;
}

export function WebsiteFooter() {
  return <Footer />;
}
