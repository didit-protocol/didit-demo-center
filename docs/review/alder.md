# Code review: Alder (fintech)

What a team copying `/fintech` into their own product can rely on, what this review changed, and what is there only for the demo.

## What was checked

Every file the demo owns (`app/fintech`, `components/fintech`, `lib/fintech`, `app/api/fintech`) and the shared code it calls in `lib/didit` (server client, Authentication, provider, browser SDK helpers, live layer, console view), request by request, against the public API reference (`openapi-25.json`):

- `POST /v3/session/`: `workflow_id`, `vendor_data`, `callback` (this site's own `/fintech`, never an address from the request), `callback_method`, `contact_details` with notification emails off. Only `session_id` and `url` reach the browser; `session_token` never does.
- `GET /v3/session/{id}/decision/`: read on the server and cut down to statuses, the name and document type read, and the AML hit count. A session whose `vendor_data` is not this customer's is a 404.
- `POST /v3/transactions/sdk-token/`: minted only after the server re-reads an Approved onboarding of the onboarding workflow for this customer. The token pins every payment to the customer's `vendor_data` (15 minutes, 30 uses).
- `POST /v1/transactions/` (web SDK `submitTransaction`) and `GET /v1/transactions/{id}/` with `X-Transaction-Token`: submitted from the browser so the device data rides along. `txn_id` is stable across the one retry on an expired token.
- `POST /v3/events/sdk-token/` and the signals `submitEvent`: the account-takeover event, with the person taken from the token.
- Workflow ids come from `lib/didit/demos.ts` per environment, and nowhere else.

## What was fixed

- **Customer cookie.** It is now `__Host-alder_customer`: always `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`. `Lax` rather than `Strict`, because the hosted flow's callback navigates back to `/fintech` and must carry it.
- **Monitoring token scope.** The takeover step's token allows one event for five minutes. Each attempt mints a fresh one.
- **Expired sign-in.** With Authentication on, a route with no Didit session now says "Your sign-in has ended. Sign in to Alder again." and returns `code: "no_customer"`, not "Open your Alder account first."
- **Timeouts and readable errors.** Every browser call goes through `lib/fintech/client.ts`, which sets a timeout and turns failures into a sentence. A timeout, an offline browser and a route error each read differently, and no status code reaches the screen.
- **A payment Didit accepted is never shown as refused.** If reading it back fails, the submission's own answer stands in.
- **Reload, another device, another tab.** On load, an onboarding or step-up that is still open is read from Didit again, so a decision is never lost because the modal's callback or the redirect did not arrive. Two tabs of the same account follow each other's changes.
- **Resubmissions.** A session that is `Awaiting User` or `Resubmitted` continues on its own hosted link instead of starting a new one. `Kyc Expired` counts as final.
- **Double submit.** A double click sends one transfer and opens one verification modal.
- **Callback address.** It comes from `lib/didit/config.ts`, the one place for environment URLs.

## Intentionally demo-only

- **State in `localStorage`.** The demo has no database, so the account, its payments and the check ids live in the visitor's browser. Restart clears them. A real bank keeps this on its server and reads payments from Didit by `vendor_data`. Two simultaneous payments from two tabs can still race on the balance shown, which a server-side ledger would prevent.
- **Polling, not webhooks.** The staging demo application is shared, so the demo reads decisions on demand. A production integration subscribes to `status.updated` and `transaction.status.updated` and verifies the webhook signature.
- **The first week of payments** (`FIRST_WEEK`) is submitted for real so the home screen has monitored activity. It is theatre, not onboarding logic.
- **The account takeover** is staged: the bank reports a failed passkey check as a `security` event so the rule can decline it.
- **The live layer, callouts and console view** (`lib/fintech/live-events.ts`, `lib/fintech/console-pages.ts`, `components/didit-live`) explain what Didit did. Nothing in the integration path depends on them.

## Left to their owners

- The shared `/api/didit/events-token` route mints a page-view token without Authentication only for Aurora Play's player, so Alder's own page events are not tied to a cookie customer when Authentication is off. A separate change to that shared route covers this.
- `projectSession` and `projectTransaction` live in `lib/igaming/records.ts` and are shared by every demo. Moving them under `lib/didit` would touch every demo, so it is left to a shared change.
