# Northmarket (marketplace) code review

Northmarket is meant to be copied into a real marketplace. This note says what
was checked, what was fixed, and what is there only for the demo.

## What was checked

- Every file the demo owns: `app/marketplace`, `components/northmarket`,
  `lib/marketplace`, `app/api/marketplace`, `scripts/marketplace-setup.mjs`.
- The shared files it calls: `lib/didit` (config, demos, server client, auth,
  browser client, provider, live layer, console view).
- Each Didit call against the public API (`openapi-25.json`): `POST
  /v3/session/` (fields, `callback_method`, `language`, `expected_details`),
  `GET /v3/session/{id}/decision/` (status values), `POST
  /v3/transactions/sdk-token/`, `GET /v3/transactions/{id}/` and `GET
  /v3/transactions/`.
- Security: where the API key lives, how tokens are scoped, cookies, callback
  origins, input validation, and what reaches the browser.
- Resilience: timeouts, error states, retries, double submits and reloads.

## What was fixed

- **A visitor could approve their own KYB.** `POST
  /api/marketplace/sellers/{id}/kyb/decision` called `update-status` with the
  server's API key for anyone holding the shop's cookie, and that unlocks
  payouts. No screen used it any more. It is removed: the decision belongs to
  an analyst in the Didit console.
- **A second KYB session on a network blip.** When reading an existing KYB
  failed, starting the KYB again created a new session. It now answers 502 and
  keeps the one session. One helper (`kybRestartable`) decides when a new
  session is allowed: Declined, Expired, Kyc Expired or Abandoned.
- **A signed-out visitor could start a KYB** when Authentication is on. That
  route is now gated like opening a shop and minting tokens.
- **The state cookie** is `__Host-northmarket_state` on https: Secure,
  HttpOnly, SameSite=Lax, Path=/. A plain-http dev server keeps the bare name,
  the same way Didit Authentication names its cookies. Existing demo state
  under the old name is dropped once.
- **The hosted flow's `language`** is always one of the codes Didit accepts.
  Before this, `en-US` or `de-AT` from the language cookie went to Didit as is
  and were refused.
- **Timeouts and error states in the browser.** Calls to the demo's own routes
  time out after 45 seconds with a sentence the page shows. A web SDK that
  fails to open now shows an error instead of failing silently.
- **Double submits.** One click is one KYB session or one order, even before
  the buttons re-render as disabled.
- **A transaction known only from one event.** The order is remembered when the
  browser claims it after `submitTransaction`. A failed claim is retried once,
  since claiming the same uuid twice is harmless.
- **Workflow ids in one place.** The routes and the setup script read them from
  the Northmarket entry of `lib/didit/demos.ts`. A second copy of the staging
  ids in `lib/marketplace/config.ts` is gone, and so is its comment saying the
  demo does not run on production.
- **No guessed decisions.** The console view called any sign-up that was not
  approved "same device, payouts paused". It now needs Didit's `SHARED_DEVICE`
  tag from the device rule.
- **Dead code removed:** the old operator route and its device, notes and
  network summaries, and the old page's status copy helpers.

## Left as is, on purpose

- The payout token (`purpose: "payout"`) is refused until the KYB is Approved.
  The page shows payouts and does not submit one, but this is the server-side
  rule a marketplace should copy.
- The live layer (`lib/marketplace/live-events.ts`, `components/didit-live`)
  and the console view (`lib/marketplace/console-pages.ts`) are demo only.
  They explain what Didit did and are not part of the integration.
- The signed cookie is the demo's "database". A real marketplace keeps shops,
  the buyer and transaction ids in its own database, keyed by `vendor_data`.
- A browser may hold up to three shops, so the second-shop story can run on
  one device. Real sellers are one account each.
- The callback accepts this site's own `*.didit.me` origins and localhost. A
  real marketplace builds it from its own configured URL.

## Shared files, for the owner of `lib/didit`

These show up in Northmarket but live in shared code, so they are reported and
not changed here:

- `openVerification` starts the SDK with `void startVerification(...)`. If that
  start rejects, the promise never settles and the page stays busy.
- `loadSdk` caches a rejected import, so a failed chunk load needs a reload.
- `consoleIds` in `lib/didit/server.ts` and `resolveConsoleIds` in
  `lib/marketplace/server.ts` do the same lookup with two caches.
