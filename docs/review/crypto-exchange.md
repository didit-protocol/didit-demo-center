# Code review: Kestrel (crypto exchange)

Kestrel (`/crypto-exchange`) is a reference for a crypto exchange that runs Didit end to end. This note says what was checked, what was fixed and what is demo-only, so a team copying it knows which parts to keep.

## What was checked

- Every file the demo owns: `app/crypto-exchange`, `components/crypto-exchange`, `lib/crypto-exchange` and `app/api/crypto-exchange`, plus the shared `lib/didit` files it calls (server client, auth, config, browser, live layer and console view).
- Every Didit call against the public OpenAPI spec: `POST /v3/session/`, `GET /v3/session/{id}/decision/`, `POST /v3/transactions/sdk-token/`, `GET /v3/transactions/{id}/`, `GET /v3/transactions/` and the web SDK's `POST /v1/transactions/`. Paths, required fields, enums and the fields Kestrel reads all match.
- Workflow ids live once, per environment, in `lib/didit/demos.ts`. Decisions are always read from Didit on the server; the browser never decides whether an account is approved.

## What was fixed

- **One Didit client.** Kestrel had its own copy of the API wrapper and console-id lookup. Its routes now use `lib/didit/server` (`didit.sessions`, `didit.transactions`, `consoleIds`), with its timeout.
- **Errors.** A refused Didit call reaches the browser as one sentence and a 502. Didit's raw field errors are no longer copied into the response. SDK errors (`network`, `validation`, `invalid_token`, `expired_token`) are turned into sentences instead of "Request failed with status 500."
- **Cookie.** The account cookie is `__Host-kestrel_account` over HTTPS: HttpOnly, Secure, SameSite=Lax, Path=/, no Domain. Plain HTTP (local development) uses `kestrel_account` without Secure.
- **Account and identity.** With Didit Authentication on, the account cookie must belong to whoever is signed in now, and no anonymous account is opened. A decided account is never replaced by a new session (409). A session Didit no longer has drops the account.
- **Transaction token.** 10 minutes and 10 uses, still bound to the visitor's `vendor_data`; the browser mints a new one when it runs out. The token's `baseUrl` comes from `lib/didit/config`.
- **Resilience.** Calls to Kestrel's routes time out after 20 seconds with a visible message. One action runs at a time, so a double click cannot send a transfer twice. A transfer Didit accepted stays in the activity even when its record cannot be read straight away, and is read again. A second tab follows the first one's ledger.
- **Comments.** The payload comments now say what the payload carries: the subject comes from the token, the verified name from the approved KYC.

## What is demo-only

- **The ledger and the wallets** live in the browser (`localStorage`). An exchange keeps balances on its server and checks a withdrawal against them before minting a token. Here there is no chain, so the deposit button plays the transfer arriving.
- **The sanctioned wallet** (`SANCTIONED_WALLET`) and the "wallet you do not know" option exist to show a decline.
- **Kestrel's own sign-up** (email and country in the browser) is only used when Didit Authentication is off.
- **The live layer, the callouts and the console view** (`lib/crypto-exchange/live-events.ts`, `console-pages.ts`) are demo theatre. They read what Didit returned; nothing in the integration path depends on them.
- **Polling instead of webhooks.** The demo reads the decision and the transaction again after each step. A production exchange should also receive Didit's webhooks and verify their signature.
- **The transaction rules and Travel Rule settings** in `lib/crypto-exchange/policy.ts` are installed by `npm run crypto-exchange:setup` and scoped to `custom_values.demo_app`. A customer sets these up once in the console.
