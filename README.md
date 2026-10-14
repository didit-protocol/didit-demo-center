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

<<<<<<< HEAD
## Industry apps

Beyond single-module demos, the catalogue links to whole products built on
Didit ([`lib/industry-apps.ts`](lib/industry-apps.ts)).

### Crypto exchange: `/crypto-exchange`

Kestrel, a fictional exchange, runs real Didit flows end to end:

| Step | Didit surface |
| --- | --- |
| Sign-up | `POST /v3/session/` on a KYC + AML workflow, opened with the web SDK; the account reads `GET /v3/session/{id}/decision/` |
| Deposit | the backend reports it with `POST /v3/transactions/`; Didit screens the sending wallet and runs the rules |
| Withdrawal | `POST /v3/transactions/sdk-token/`, then `DiditSdk.shared.submitTransaction` as a Travel Rule transfer; wallet-ownership proof and a selfie step-up come back as `action_required` |
| Compliance view | `GET /v3/transactions/{id}/`, trimmed, plus Console links |

The server routes under `app/api/crypto-exchange/` hold the API key, tie each
visitor to their own `vendor_data` with an httpOnly cookie, and refuse to move
money until the visitor's KYC is approved.

It needs its workflows (in [`lib/crypto-exchange/policy.ts`](lib/crypto-exchange/policy.ts),
staging only for now), three demo-scoped transaction rules and Travel Rule
settings on the application. Install the rules and settings once per
environment:

```sh
npm run crypto-exchange:setup -- --dry-run   # print what would change
npm run crypto-exchange:setup                # create or update them
```

Set `NEXT_PUBLIC_DIDIT_CONSOLE_ORGANIZATION_ID` and
`NEXT_PUBLIC_DIDIT_CONSOLE_APPLICATION_ID` to deep-link each record into the
Console; without them the links open the Console home.

The site itself is light-only, but the app has a light and a dark theme, scoped
to the demo area in [`styles/crypto-exchange.css`](styles/crypto-exchange.css).
=======
## Industry demo: iGaming (`/igaming`)

Aurora Play, a fictional casino and sportsbook, runs Didit end to end. Every
call is live against the environment `NEXT_PUBLIC_IS_STAGING` selects; nothing
on the page is a fixture.

| Step | Didit surface |
| --- | --- |
| Registration | Adaptive age workflow: `POST /v3/session/`, the web SDK's `startVerification`, `GET /v3/session/{id}/decision/` |
| Licensed markets | The session's IP analysis, a country list and a transaction rule |
| Deposits, bets, withdrawals, bonus, limits | `POST /v3/transactions/sdk-token/` on the server, only after `GET /v3/session/{id}/decision/` shows the player's approved age check; `submitTransaction` and `GET /v1/transactions/{id}/` in the browser |
| ID check at 2,000 EUR | A rule moves the deposit to `AWAITING_USER`; the page opens the returned verification session |
| Bonus abuse | A rule counting players per device fingerprint |
| Self-exclusion | The balance is paid back as a monitored withdrawal, then `PATCH /v3/users/{vendor_data}/update-status/` to `BLOCKED`: Didit then refuses the player's transactions |
| Operator side | Console deep links for the session, each transaction and the player |

The player is a random `vendor_data` (`aurora-play-…`) in a signed, httpOnly
cookie. The server routes under `app/api/igaming` only ever return records
that belong to that player, cut down to what the page shows. The 18+ gate is
the server's, not the page's: the token route mints nothing until Didit's own
decision for the player's age check is `Approved`. The hosted flow's return
URL is always this site's `/igaming` (`siteConfig.url`), never one the
request supplies.

**One-time setup per environment.** The rules and lists live on the Didit
application, not in this repo. Install them (idempotent, matched by name):

```sh
npm run igaming:setup -- --dry-run   # print the payloads
npm run igaming:setup                # create or update them
```

Every rule matches only `aurora-play-` players, so other demos on the same
application are untouched. Thresholds, markets and rule definitions are in
[`lib/igaming/policy.ts`](lib/igaming/policy.ts).

The demo area has a light and a dark theme (Console v2 dark palette, scoped to
the page in [`styles/igaming.css`](styles/igaming.css)); the didit.me chrome
around it stays light.
>>>>>>> origin/main

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
<<<<<<< HEAD
npm test                     # node --test (status copy, crypto exchange payloads and policy)
npm run build && npm run test:e2e  # Playwright, desktop and phone, recorded Didit responses
=======
npm test                     # node --test (unit tests and /api/igaming route tests)
npm run test:e2e             # Playwright flows for /igaming against BASE_URL
                             # (E2E_LIVE=1 adds a real staging session)
>>>>>>> origin/main
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
The catalogue is light-only, exactly like didit.me and help.didit.me - the
design system ships no dark token set. Only `/igaming` has a dark theme.

## Technical documentation

<https://docs.didit.me>
