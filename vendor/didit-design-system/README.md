# Vendored Didit design system v4

`ds.css` holds the parts of the Didit design system v4 package the Demo Center
chrome uses: the colour tokens (light and dark), the spacing, radius and type
tokens, and the type, button, status, tag, tile, halftone, window, segmented
control, wash and eyebrow rules. Each block is taken verbatim from the
package's `tokens.css` and `components/bundle.css`.

## Rules

- **Never hand-edit `ds.css`.** Change the design system, then run
  `npm run sync:design-system -- --from-dir <design repo checkout> --commit <sha>`.
  `SYNC-STATE.json` records the source commit.
- `--check` re-derives the sheet and fails on any drift.
- The one rewrite: the token sheet's spacing, radius and type block is scoped
  to `.dd` instead of `:root`, because this app's Tailwind preset owns
  `--radius-*` and `--font-sans` on `:root`. Put `dd` on an element to give it
  the DS v4 scale.
- `styles/demos/live.css` imports the sheet, so every page that brings the live
  layer brings the design system with it.
