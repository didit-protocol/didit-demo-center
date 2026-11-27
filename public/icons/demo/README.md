# Demo-centre-owned icons

`public/icons/modules`, `public/icons/industries`, `public/icons/lifecycle`,
`public/icons/other`, `public/logos` and `public/media` are synced byte-for-byte
from fe-didit-website-v4 (see `scripts/website-chrome/manifest.mjs`) and must
not be edited here.

This directory holds the small set of design-system icons the demo catalogue
needs that the website does not currently ship in its own module set:

- `api.svg`, `case-management.svg`, `networks.svg`, `webhooks.svg` - module
  glyphs for the API-first demos.
- `verdict-approved.svg`, `verdict-review.svg`, `verdict-declined.svg` - the
  three status marks used on sample-decision verdict cards.
- `flags/*.svg` - country marks for the sample KYB / UBO / monitoring rows.

All of them come from the Didit design system bundle. If the website later
ships equivalents under `public/icons/modules`, delete the copy here and point
`lib/demos.ts` at the synced path instead.
