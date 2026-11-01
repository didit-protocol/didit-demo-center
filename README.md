# Didit Demo Center

[demos.didit.me](https://demos.didit.me): four industry demos with Didit
inside each one (a casino, a bank, a marketplace and a crypto exchange), and
the module catalogue at `/modules`: every Didit module, runnable, with the
request that created it.

## The Demo Center

The front page (`/`) lists the four industry demos. Each demo walks the same
five steps (sign up, verify, transact, stop fraud, console) inside its own
brand, under the Demo Center bar, with the Didit live layer floating over it.
Aurora Play (`/igaming`) and Kestrel (`/crypto-exchange`) are on this shell;
the other two keep their current screens until they move to it.

### One shared Didit client: `lib/didit/`

| File | What it does |
| --- | --- |
| `config.ts` | The environment (`NEXT_PUBLIC_IS_STAGING`), base URLs, the API key, the publishable key, `pick(production, staging)` and `defineDemo` |
| `demos.ts` | One `defineDemo` per demo: brand, workflows per environment, rules and copy |
| `server.ts` | Every call that needs the API key: `didit.sessions.create`, `.sessions.decision`, `.transactions.sdkToken`, `.events.sdkToken`, `.users.get`. The four demos' own helpers delegate to `callDidit` |
| `auth.ts` | Didit Authentication on the server: whether it is on, and the signed-in visitor's `vendor_data` |
| `browser.ts` | The web SDK modal (`openVerification`), `submitTransaction` from the browser (the SDK attaches the signals device data), `applyStepUp` for `action_required`, and the device read-out |
| `provider.tsx` | `configureEvents` on every page from the first load, page and sign-in events with a monitoring token, and the Authentication bridge |
| `live.ts`, `use-live.ts` | The live layer's feed: the visitor's own events, newest first |
| `console.ts` | The console view's page model (Person, Transaction, Business, Verification, Device) |

The live layer, the callouts, the console view and the Demo Center bar are in
`components/didit-live/`.

### Authentication and signals

Didit Authentication (`@didit-protocol/auth-nextjs`) is on when
`DIDIT_PUBLISHABLE_KEY` holds the demo application's publishable key: the root
layout renders `<DiditAuth>`, `middleware.ts` serves `/auth/*` and the Didit
user id (with the demo's prefix) becomes the `vendor_data` of every session,
transaction and event. `DIDIT_REDIRECT_URI` defaults to this site's
`/auth/callback`; set it to `http://localhost:3000/auth/callback` locally.
Without a key every demo keeps its own sign-in and the Authentication parts
stay hidden.

The Authentication packages, `@didit-protocol/signals` 0.1.0 and
`@didit-protocol/sdk-web` 0.5.0 are not on npm yet, so `vendor/didit-sdk/`
holds their `npm pack` builds from the didit-protocol/sdk-web repository
(commit `35dd5ac`, "Prepare the 0.5.0 release"). Once they are published,
switch each `file:vendor/didit-sdk/…` entry in `package.json` to its version
(and drop the `overrides` and `pnpm.overrides` that point at the same files),
then delete `vendor/didit-sdk/`.

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

## Industry demo: iGaming (`/igaming`)

Aurora Play, a fictional casino and sportsbook, runs Didit end to end on the
Demo Center shell. Every call is live against the environment
`NEXT_PUBLIC_IS_STAGING` selects; the live layer only ever shows what this
visitor's own calls returned.

| Step | Didit surface |
| --- | --- |
| Sign up | Didit Authentication in the casino's own modal (hosted passkey sign-up, or an email code); without a publishable key, the casino's own form |
| Verify | Adaptive age workflow: `didit.sessions.create`, the web SDK modal, `didit.sessions.decision` |
| Transact | `didit.transactions.sdkToken` on the server, only after the player's approved age check; `submitTransaction` in the browser. A rule holds the deposit that brings 30 days to 2,000 EUR (`AWAITING_USER`) and the cashier opens its ID check |
| Stop fraud | A second account in the same browser claims the welcome offer: a rule counting players per device fingerprint holds it for review |
| Console | The console view: Person, Transaction, Verification and Device, from this visitor's records |

Without Authentication the player is a random `vendor_data` (`aurora-play-…`)
in a signed, httpOnly cookie; with it, `aurora-play-` plus the Didit user id.
The server routes under `app/api/igaming` only ever return records that belong
to that player, cut down to what the page shows. The 18+ gate is the
server's: the token route mints nothing until Didit's decision for the
player's age check is `Approved`. The hosted flow's return URL is always this
site's `/igaming`, never one the request supplies.

**One-time setup per environment.** The rules and lists live on the Didit
application, not in this repo. Install them (idempotent, matched by name):

```sh
npm run igaming:setup -- --dry-run   # print the payloads
npm run igaming:setup                # create or update them
```

Every rule matches only `aurora-play-` players, so other demos on the same
application are untouched. Thresholds, markets and rule definitions are in
[`lib/igaming/policy.ts`](lib/igaming/policy.ts).

## Industry demo: fintech (`/fintech`)

Alder, a fictional neobank, runs Didit end to end on the Demo Center shell,
the same way Aurora Play does. Every call is live against the environment
`NEXT_PUBLIC_IS_STAGING` selects (the onboarding workflow is set per
environment in [`lib/didit/demos.ts`](lib/didit/demos.ts)).

| Step | Didit surface |
| --- | --- |
| Sign up | Didit Authentication on the bank's sign-up card (hosted passkey sign-up, or an email code); without a publishable key, the bank's own form |
| Verify | KYC + AML onboarding before the IBAN: `didit.sessions.create`, the web SDK modal, `didit.sessions.decision` |
| Transact | `didit.transactions.sdkToken` on the server, only after the customer's approved onboarding; `submitTransaction` in the browser. A transfer of 5,000 EUR or more to a new payee is held by a rule (`AWAITING_USER`). With Authentication on, the customer first confirms it with their passkey (`reauthenticate()`, which checks it is the same person); Didit then releases it once they pass the selfie step-up the rule opened |
| Stop fraud | A sign-in that fails the passkey check is reported with `submitEvent` (category `security`) and an event rule declines it |
| Console | The console view: Transaction, Person, Verification and Device, from this visitor's records |

Without Authentication the customer is a random `vendor_data` (`alder-…`) in
a signed, httpOnly cookie; with it, `alder-` plus the Didit user id. The
routes under `app/api/fintech` only ever return records that belong to that
customer, cut down to what the page shows. The hosted flow's return URL is
always this site's `/fintech`.

**One-time setup per environment.** The two rules live on the Didit
application (idempotent, matched by title, scoped to `alder-` customers); the
setup also switches off the rule the earlier `/fintech` used:

```sh
npm run fintech:setup -- --dry-run   # print the payloads
npm run fintech:setup                # create or update them
```

The account-takeover rule needs event ingestion on in the application's
transaction monitoring settings; without it Didit refuses the event, and the
security centre says so instead of a decision.

## Industry demo: marketplace (`/marketplace`)

Northmarket, a fictional resale marketplace, runs the Demo Center's five
steps through `lib/didit`, with the live layer and the console view. With
Authentication on, the signed-in Didit user is the shop (`northmarket-<user id>`)
and the buyer (`northmarket-<user id>-buyer`); without it the demo keeps a
random identity per browser.

| Step | Didit surface |
| --- | --- |
| Sign up | A passkey sign-up in the shop's own form (`@didit-protocol/auth-nextjs`), then a `seller_signup` sent to transaction monitoring from the browser |
| Verify | The shop's KYB in the web SDK modal: company registry at the UBO tier, key people with their own ID check, company documents. Payouts stay locked until `GET /v3/session/{id}/decision/` shows it Approved (the server refuses the payout token) |
| Transact | A 1,497 EUR order from the browser, held by a rule (`AWAITING_USER`) until the buyer passes the age check that rule opens |
| Stop fraud | A second shop opened on the same device is held for review and its payouts are paused: both sign-ups carry the same persistent device id |
| Console | The console view's Business page: registry, key people and the linked shop, plus Transaction, Verification and Device |

Workflows come from the Northmarket config in `lib/didit/demos.ts`: the seller
KYB `811d80dd-491e-4799-b905-2c8007c9df78` on production, and on staging the
`NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID` variable; the buyer age check uses the
shared age workflow. The old `/marketplace?chapter=` links redirect to the
matching step.

The browser never sees the API key. The server mints short-lived transaction
tokens (`POST /v3/transactions/sdk-token/`) for identities it created, keeps
the visitor's shops, buyer and transaction ids in one signed httpOnly cookie,
reads back only records whose ids are in that cookie, and returns trimmed
summaries (no session tokens, documents or dates of birth). See
[`lib/marketplace/server.ts`](lib/marketplace/server.ts) and
[`lib/marketplace/summaries.ts`](lib/marketplace/summaries.ts).

**One-time setup on the staging application behind `API_KEY`.** The staging
seller KYB workflow and the three rules live on the Didit application, not in
this repo:

```sh
npm run marketplace:setup                # dry run: what exists
npm run marketplace:setup -- --activate  # create what is missing, rules ACTIVE
```

The workflow is found by name, `Demo - Marketplace seller KYB`, and created
through `POST /v3/workflows/` only when it is missing; existing workflows are
never edited or deleted. If the API refuses the create (an application holds
at most 50 workflows, archived ones included), the script uses the
application's existing published KYB workflow instead, or says there is none.
Put the id it prints in `.env` and in the hosting environment:

```ini
NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID=<printed workflow_id>
```

Without it the hub says the KYB is not published on this environment, and
everything else runs. The rules match only transactions
carrying `custom_properties.demo_app = "marketplace"`, so other demos on the
same application are untouched. Definitions are in
[`lib/marketplace/setup.ts`](lib/marketplace/setup.ts).

`DIDIT_CONSOLE_ORG_ID` and `DIDIT_CONSOLE_APP_ID` are optional. Without them the
server reads the console organization and application from the API to build
the Console v2 links.

## Industry demo: crypto exchange (`/crypto-exchange`)

Kestrel, a fictional crypto exchange, runs Didit end to end on the Demo
Center shell, through `lib/didit`. Every call is live against the
environment `NEXT_PUBLIC_IS_STAGING` selects; the live layer and the console
view only ever show what this visitor's own calls returned.

| Step | Didit surface |
| --- | --- |
| Sign up | Didit Authentication in Kestrel's own card (passkey, Google, Apple or an email code); without a publishable key, Kestrel's own form |
| Verify | KYC + AML before the first deposit: `didit.sessions.create`, the web SDK modal, `GET /v3/session/{id}/decision/` |
| Transact | `didit.transactions.sdkToken` on the server, only once the KYC is approved; every deposit and withdrawal goes through `submitTransaction` in the browser. Deposits are screened by the sending wallet; a withdrawal to the user's own wallet is a Travel Rule transfer whose wallet proof and selfie step-up come back as `action_required` |
| Stop fraud | A withdrawal to a wallet on a sanctions list is declined by a demo rule; nothing leaves the account |
| Console | The console view: the declined withdrawal's Transaction page with the wallet risk and the rules, plus Person, Verification and Device |

The account is the onboarding session and its `vendor_data` in a signed,
httpOnly cookie: `kestrel-` plus the Didit user id with Authentication on, a
random id without it. The server routes under `app/api/crypto-exchange` only
ever return records that carry that `vendor_data`, and refuse to mint a
transaction token until Didit's decision for the onboarding session is
`Approved`. The hosted flow's return URL is always this site's
`/crypto-exchange` (`siteConfig.url`). Kestrel moves BTC and ETH; its market
screen (prices, candles, order book) is scenery and never reaches Didit.

**One-time setup per environment.** The workflows are Kestrel's in
[`lib/didit/demos.ts`](lib/didit/demos.ts) (crypto onboarding and the
face-authentication step-up, per environment). Install the three demo rules
and the application's Travel Rule settings (idempotent, matched by title):

```sh
npm run crypto-exchange:setup -- --dry-run   # print what would change
npm run crypto-exchange:setup                # create or update them
```

Every rule matches only transactions with `custom_values.demo_app ==
"crypto-exchange"`, so other demos on the same application are untouched.
Kestrel's own brand (dark, Space Grotesk and IBM Plex Mono, teal) is
[`styles/demos/kestrel.css`](styles/demos/kestrel.css).

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
NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID=
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
npm test                     # node --test (unit tests, lib/didit, /api/igaming,
                             # /api/fintech, /api/crypto-exchange and
                             # /marketplace route tests)
npm run build && npm run test:e2e:crypto-exchange
                             # Playwright flows for /crypto-exchange, desktop and
                             # phone, on recorded Didit responses
npm run build && npm run test:e2e:aurora-play
                             # the same for /igaming (build without
                             # DIDIT_PUBLISHABLE_KEY)
npm run build && npm run test:e2e:alder
                             # the same for /fintech
npm run build && npm run test:e2e:northmarket
                             # the same for /marketplace
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

Writes the catalogue (`/modules`), both modal families and the 390px layouts to `proof/`.
The catalogue is light-only, exactly like didit.me and help.didit.me - the
design system ships no dark token set. The industry demos bring their own
look: Aurora Play is a dark casino, Alder a light neobank and Northmarket a
warm light marketplace.

## Technical documentation

<https://docs.didit.me>
