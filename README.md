# Didit Demo Center

The catalogue behind [demos.didit.me](https://demos.didit.me): every Didit
module, runnable. 18 pre-built workflows across KYC, KYB, monitoring and fraud,
each with the request that created it.

## Two kinds of demo

The distinction runs through the whole app, so it is worth stating once:

| Mode | What "Start demo" does | Billed |
| --- | --- | --- |
| **Hosted flow** | Creates a **real** session through `/api/verification` and opens the real hosted flow in the Didit web SDK modal on your device. | Yes - the workflow's modules run |
| **API demo** | Opens a playground showing the real endpoint, headers and body, then replays a **fixture** response with a run trace. | No - nothing is sent |

KYB, key people & UBO, transaction monitoring, wallet screening, standalone AML,
face search and IP analysis are API demos: they are server-to-server surfaces
with no hosted flow to open. Everything else is a hosted flow.

The catalogue lives in [`lib/demos.ts`](lib/demos.ts) - one file, one source of
truth for workflow ids, copy, modules, endpoints, sample decisions and docs
links.

## Results are a modal

A finished session never navigates you away from the catalogue. The web SDK's
`onComplete` opens the results modal in place, which fetches the real decision
from `GET /v3/session/{id}/decision/` through this app's own server route.

`/verification/callback` still exists, because the hosted flow redirects there
when the user finishes on a **different device** than the one that started the
session. It forwards straight to the catalogue, which opens the same modal.

## Industry apps

Next to the module catalogue, `/fintech` is a complete app a prospect
recognises as their own product: **Kestrel**, a fictional neobank. Every
screen is a real call to Didit staging; the "How this uses Didit" panel beside
it lists the modules and calls behind each step and shows the operator side of
the same records.

| Step | What runs |
| --- | --- |
| Sign up | The bank's own form. Its customer id becomes `vendor_data` everywhere |
| Verify identity | `POST /v3/session/` with the published staging workflow "2. KYC ACTIVE LIVENESS" (ID, active liveness, face match, AML, IP analysis), opened with the web SDK |
| Decision | `GET /v3/session/{id}/decision/`, reduced to statuses on the server. Approved opens the account, In Review waits, Declined stays closed |
| Add / send money | `POST /v3/transactions/`, re-read with `GET /v3/transactions/{uuid}/` |
| Review | The rule "High-value outbound transfer (fintech demo)" holds outbound EUR transfers of 5,000 or more |
| Ongoing monitoring | `POST /v3/users/aml-monitoring/` with `estimate_only: true`, which writes nothing |

How it is wired:

- **Staging only.** Onboarding runs AML screening, which is billed per
  screening, so the app runs only when `NEXT_PUBLIC_IS_STAGING=true`. Any other
  build shows where the demo runs and every `/api/fintech/*` route answers 503.
- **A visitor only sees their own records.** The server keeps the customer id,
  the session id and the payment ids in a signed, httpOnly cookie (the signing
  key is derived from `API_KEY`) and only ever reads those ids from Didit.
- **The review rule lives on the application.** Install it once per
  application behind `API_KEY`. It matches only transactions carrying
  `custom_properties.demo_app = "fintech"`, so other traffic is never touched:

  ```sh
  npm run fintech:rule                 # dry run: prints the rule and its state
  npm run fintech:rule -- --apply      # creates it in TEST mode
  npm run fintech:rule -- --activate   # switches it to ACTIVE
  ```

- **Console links** need `DIDIT_CONSOLE_ORG_ID` and `DIDIT_CONSOLE_APP_ID`
  (the console's organization and application ids, which an API key cannot
  look up). Without them the panel links the console and names the record.
- **Copy** is in `messages/fintech/<locale>.json`, one file per language the
  site chrome offers, and follows the chrome's language switcher.
- **Light and dark.** The demo area has its own theme switch (it starts from
  the system preference). It re-points the design tokens inside the demo only,
  so the site chrome stays light like the rest of didit.me.
- **Tests.** `npm test` runs the domain logic and the API handlers against
  responses recorded from staging (`tests/fixtures/fintech`).
  `npm run test:e2e` drives the app in Chromium (`CHROMIUM_PATH` to use a
  system browser); `FINTECH_E2E_LIVE=1` adds the runs against staging itself,
  where only the identity decision is set by the test, since nobody can pass
  KYC without an ID document and a camera.

## Site chrome

The navbar, announcement bar and footer are **not written here**. They are
vendored byte-for-byte from
[fe-didit-website-v4](https://github.com/didit-protocol/fe-didit-website-v4) into
[`vendor/didit-website`](vendor/didit-website), the same way
[fe-didit-help-center](https://github.com/didit-protocol/fe-didit-help-center)
does it, so didit.me, help.didit.me and demos.didit.me present identical chrome.

```sh
npm run sync:website-chrome    # refresh from a sibling clone of the website
npm run check:website-chrome   # byte-compare; fails on any drift
```

Never hand-edit anything under `vendor/`. Change it in the website repo and
re-sync. The three demo-centre-owned adapter shims are listed in
[`vendor/didit-website/README.md`](vendor/didit-website/README.md).

Tailwind compiles from the website's own preset, so `bg-canvas`, `text-ink`,
`border-line` and the rest resolve to exactly the values they have on didit.me.

## Run locally

1. Clone the repository and `cd` into it.
2. Copy `.env.example` to `.env` and fill in `API_KEY` from your application in
   the [Business Console](https://business.didit.me).
3. Replace the workflow ids in `lib/demos.ts` with your own (see below).
4. Install and start:

```sh
npm install
npm run dev
```

### `.env.example`

```ini
API_KEY=same-as-didit-client-secret
NEXT_PUBLIC_REDIRECT_URI=https://demos.didit.me/
NEXT_PUBLIC_IS_STAGING=false
DIDIT_LIVENESS_WORKFLOW_ID=your-liveness-only-workflow-id
# Optional, /fintech only (see "Industry apps")
DIDIT_CONSOLE_ORG_ID=
DIDIT_CONSOLE_APP_ID=
```

`API_KEY` is used only on server-side API routes and must never be exposed
client-side.

## Workflow IDs

Every hosted demo is just a `workflow_id` handed to `POST /v3/session/`.

1. Open the [Business Console](https://business.didit.me).
2. Create a workflow (or open an existing one).
3. Copy the workflow ID from the workflow details screen.
4. Paste it into the matching entry in `lib/demos.ts`.

An entry with `workflowPlaceholder: true` has no published workflow on this
environment yet; the detail modal disables **Start demo** and says so rather
than failing on a 400.

## Checks

```sh
npm test                     # node --test (unit and API handler tests)
npm run test:e2e             # Playwright flows against BASE_URL (default :3000)
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint (vendor/ is excluded - it is synced)
npm run build                # next build
npm run check:website-chrome # vendored chrome matches the website repo
npm run check:docs-links     # every "Docs" button resolves on docs.didit.me
```

### Visual proof

```sh
npm run build && npm run start &
PROOF_SESSION_ID=<a real session id> npm run shots
```

Writes the catalogue, both modal families and the 390px layouts to `proof/`.
The site is light-only, exactly like didit.me and help.didit.me - the design
system ships no dark token set, so there is no dark variant to capture.

## Technical documentation

<https://docs.didit.me>
