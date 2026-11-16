/**
 * Manifest for the vendored didit.me website chrome (navbar + announcement bar).
 *
 * The demo centre renders the EXACT navbar and footer didit.me ships - the same
 * chrome help.didit.me carries. The files below are byte-copies of
 * fe-didit-website-v4 sources (modulo the one deterministic import rewrite),
 * refreshed by `npm run sync:website-chrome` and enforced by
 * `npm run check:website-chrome`.
 *
 * Rules:
 * - SYNCED_FILES are never hand-edited here. Change them in fe-didit-website-v4
 *   and re-run the sync.
 * - SHIMS are the demo-centre-owned adapter modules the vendored files import
 *   at their module boundaries (locale-aware links -> absolute didit.me URLs,
 *   marketing site search -> the demo catalogue's filter field). They are NOT
 *   parity-checked.
 * - GENERATED entries are derived deterministically from website sources
 *   (token block extraction, message subtree extraction) and ARE parity-checked
 *   by re-deriving them from the same source.
 */

export const WEBSITE_REPO = "didit-protocol/fe-didit-website-v4";

/** Refs the vendored copy is allowed to match, in preference order. */
export const ACCEPTED_REFS = ["development", "main"];

export const VENDOR_DIR = "vendor/didit-website";

/** Byte-identical copies (after the deterministic `imports` rewrite for .tsx/.ts). */
export const SYNCED_FILES = [
  // Chrome composition
  { src: "src/components/chrome/StickyHeader.tsx", dest: "components/chrome/StickyHeader.tsx" },
  { src: "src/components/chrome/AnnouncementBar.tsx", dest: "components/chrome/AnnouncementBar.tsx" },
  { src: "src/components/chrome/Navbar.tsx", dest: "components/chrome/Navbar.tsx" },
  { src: "src/components/chrome/LocaleSwitcher.tsx", dest: "components/chrome/LocaleSwitcher.tsx" },
  { src: "src/components/chrome/Footer.tsx", dest: "components/chrome/Footer.tsx" },
  // UI atoms the chrome depends on
  { src: "src/components/ui/navbar.tsx", dest: "components/ui/navbar.tsx" },
  { src: "src/components/ui/navbar-measurement.ts", dest: "components/ui/navbar-measurement.ts" },
  { src: "src/components/ui/top-bar.tsx", dest: "components/ui/top-bar.tsx" },
  { src: "src/components/ui/badge.tsx", dest: "components/ui/badge.tsx" },
  { src: "src/components/ui/button.tsx", dest: "components/ui/button.tsx" },
  { src: "src/components/ui/container.tsx", dest: "components/ui/container.tsx" },
  { src: "src/components/ui/arrow-diagonal.tsx", dest: "components/ui/arrow-diagonal.tsx" },
  { src: "src/components/ui/gradient-card.tsx", dest: "components/ui/gradient-card.tsx" },
  { src: "src/components/ui/console-module-icon.tsx", dest: "components/ui/console-module-icon.tsx" },
  { src: "src/components/ui/nav-terminal-card.tsx", dest: "components/ui/nav-terminal-card.tsx" },
  { src: "src/components/ui/logo-context-menu.tsx", dest: "components/ui/logo-context-menu.tsx" },
  { src: "src/components/ui/popover.tsx", dest: "components/ui/popover.tsx" },
  { src: "src/components/ui/footer.tsx", dest: "components/ui/footer.tsx" },
  { src: "src/components/ui/backed-by.tsx", dest: "components/ui/backed-by.tsx" },
  // Libraries
  { src: "src/lib/site.ts", dest: "lib/site.ts" },
  { src: "src/lib/utils.ts", dest: "lib/utils.ts" },
  // Design tokens
  { src: "tailwind.preset.cjs", dest: "tailwind.preset.cjs", transform: "none" },
];

/**
 * Demo-centre-owned adapters. The vendored files import these paths, but their
 * implementation is local: links resolve to absolute didit.me URLs (except the
 * routes this app owns), the locale switch persists a preference instead of
 * routing, and the navbar search icon focuses the demo catalogue's filter
 * field instead of opening the marketing-site search dialog.
 */
export const SHIMS = [
  "i18n/navigation.tsx",
  "components/chrome/SiteSearch.tsx",
  "components/chrome/AskAIRow.tsx",
];

/**
 * The `:root` design-token block extracted from the website's globals.css.
 * The extraction is deterministic, so parity re-extracts and byte-compares.
 */
export const TOKENS = {
  src: "src/app/globals.css",
  dest: "styles/tokens.css",
};

/** Translation subtrees the vendored components read, per locale. */
export const MESSAGE_SUBTREES = [
  "translation_v1.chrome.header",
  "translation_v1.chrome.announcementBar",
  "translation_v1.localeswitcher",
  "translation_v1.ui.navbar",
  "translation_v1.ui.topBar",
  "translation_v1.ui.navTerminalCard",
  "translation_v1.ui.logoContextMenu",
  "translation_v1.chrome.footer",
  "translation_v1.ui.footer",
  "translation_v1.ui.backedBy",
  "translation_v1.blog.archive",
];

export const LOCALES = [
  "en", "es", "fr", "de", "ar", "zh", "ja", "hi",
  "id", "ko", "pt-BR", "pt-PT", "sw", "ru", "ca",
];

/**
 * Public directories the vendored components read from with DYNAMIC paths
 * (console-module-icon builds `/icons/modules/<key>.svg` etc.), synced whole.
 */
export const ASSET_DIRS = ["public/icons/modules", "public/icons/industries"];

/** Static assets the vendored components reference by absolute /public path. */
export const ASSETS = [
  "public/logos/mark.svg",
  "public/logos/primary-horizontal-light.svg",
  "public/logos/primary-horizontal-light.png",
  "public/logos/primary-horizontal-light-small.png",
  "public/logos/primary-horizontal-dark.svg",
  "public/logos/investors/yc_logo.svg",
  "public/logos/investors/robinhood_lockup_black.png",
  "public/logos/investors/robinhood_lockup_neon.png",
  "public/icons/other/global.svg",
  "public/icons/lifecycle/id-scan.svg",
  "public/icons/lifecycle/liveness.svg",
  "public/icons/lifecycle/monitoring.svg",
  "public/media/founders/alejandro-alberto-card.jpg",
  "public/media/gradient-library/nature-blurred-05.webp",
  "public/media/gradient-library/nature-blurred-08.webp",
  "public/media/gradient-library/nature-blurred-11.webp",
  "public/media/gradient-library/nature-blurred-14.webp",
  "public/media/gradient-library/nature-blurred-17.webp",
  "public/media/gradient-library/nature-blurred-23.webp",
  "public/media/gradient-library/nature-blurred-31.webp",
];
