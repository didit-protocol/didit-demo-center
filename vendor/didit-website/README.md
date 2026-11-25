# Vendored didit.me chrome

This directory carries the EXACT navbar, announcement bar and footer didit.me
ships, copied from
[fe-didit-website-v4](https://github.com/didit-protocol/fe-didit-website-v4) so
demos.didit.me, help.didit.me and didit.me always present the same chrome.

## Rules

- **Never hand-edit the synced files.**
  Change the navbar in fe-didit-website-v4, then run `npm run sync:website-chrome`
  here. The manifest of what is synced lives in
  `scripts/website-chrome/manifest.mjs`.
- The only difference from the website sources is a deterministic import
  rewrite (`@/` becomes `@website/`), so vendored imports cannot collide with
  this repo's own `@/*` alias.
- `npm run check:website-chrome` re-derives every artifact from the website repo
  and byte-compares. Any drift on either side fails until a sync is committed.

## Not synced (demo-centre-owned adapters)

- `i18n/navigation.tsx` - locale-aware links resolve to absolute didit.me URLs,
  except the routes this app owns (`/`, `/accs`, `/ibeta`,
  `/verification/callback`), which stay local. The locale switcher changes the
  chrome language in place through the `NEXT_LOCALE` cookie.
- `components/chrome/SiteSearch.tsx` - the navbar search icon focuses the demo
  catalogue's filter field instead of the marketing-site search dialog.
- `components/chrome/AskAIRow.tsx` - the GEO prompts cite demos.didit.me.

## Also synced

- `styles/tokens.css` - the website's `:root` design-token block (RGB-triplet
  format used by the Tailwind preset).
- `messages/*.json` - the translation subtrees the chrome reads, all 15 locales.
- Brand assets under `public/` (logos, lifecycle/module/industry icons, founders
  card, gradient library) at their original paths.
