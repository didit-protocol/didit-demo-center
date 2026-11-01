# didit-demo-center

demos.didit.me: four industry demos with Didit inside each one, and the 18 product demos.
`README.md` covers the shared Didit client, the demo shell and the live layer; read it before changing anything.

## URLs are permanent, and SEO and GEO never regress (HARD RULE, Alex 2026-10-28)

The demos are found through Google and AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude), and didit.me, docs.didit.me, sales emails and decks link straight to them.
A URL's rankings, citations and links belong to that exact address; changing it breaks all of them and the new URL starts from zero.

### A published URL never changes

The published URLs are the hub (`/`), the industry demos (`/fintech`, `/igaming`, `/marketplace`, `/crypto-exchange`), the product demos (`/product-demos/<id>`, ids in `lib/product-demos/demos.ts`), `/ibeta`, `/accs`, and the legacy links `/?demo=<legacyId>`, `/modules` and `/product-demos`, which didit.me still uses.

- Never rename, move or delete a published route, a product demo `id` or a `legacyId` mapping.
  When a demo brand is renamed (Aurora Play, Alder, Northmarket, Kestrel), its copy changes and its route stays.
- A new page gets its permanent path on day one: lowercase, hyphenated, the words buyers search for, with no dates, versions or internal codenames.
- If a page truly has to go, its URL keeps working through `permanentRedirect()` (308) to the closest equivalent page, one hop.
  `redirect()` (307) is only for flow steps (a hosted-flow return, a sign-in), never for a page that moved, because search engines keep a temporarily redirected URL and drop the new one.
- `data/published-urls.json` is append-only: add every new page there in the same change, and never remove an entry.
  `tests/url-permanence.test.mjs` (in `npm test`) fails when a listed path loses its page or a legacy `/?demo=` link stops reaching its product demo, and `scripts/check-published-urls.mjs` fails a pull request that drops an entry; `.github/workflows/url-permanence.yml` runs both on every pull request.
- Only Alex can approve an exception, in writing on the issue, and the exception still ships with its redirect.

**Why:** the module catalogue move left `/modules` answering 200 with a client-side jump while its canonical said it was the home page, `/product-demos` redirected with a temporary 307, and the root layout's site-wide canonical told search engines every page without its own was a duplicate of the home page.

### Every page stays findable and quotable

- **Canonical and metadata.** Every indexable page sets its own `alternates.canonical`, a unique `title` and a unique `description` (120 to 160 characters) that says what the demo shows; there is never a site-wide canonical in a layout.
- **Indexing.** `app/robots.ts` keeps production open to every crawler, search and AI alike, keeps staging closed, and keeps flow plumbing (`PRIVATE_PATHS` in `lib/seo.ts`: callbacks, `/auth/`, `/api/`) out; a new indexable page is added to `indexablePaths()` in `lib/seo.ts`, which feeds `app/sitemap.ts`.
  Never `noindex` a public demo page.
- **Answer first, in the HTML.** The page's heading and first sentence say in plain words what the demo shows and which Didit products it uses, rendered on the server so crawlers read it without running the demo.
- **Facts are text.** Prices, products and counts shown in a demo match didit.me/pricing and docs.didit.me, and are text, not only part of an image or animation.
- **Linked.** Each demo links the matching didit.me product page and docs.didit.me guide, with descriptive link text, and is reachable from the hub.
