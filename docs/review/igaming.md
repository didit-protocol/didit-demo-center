# Aurora Play (iGaming): code review

What was read, what changed and what is on purpose only a demo. Every Didit
call was checked against the public API reference (`openapi-25.json` on
docs.didit.me) and the web SDK's own types.

## What was checked

- Every file the demo owns: `app/igaming`, `components/igaming`,
  `lib/igaming`, `app/api/igaming` and `scripts/igaming-setup.mjs`.
- The shared code it calls: `lib/didit` (config, server client, auth, the
  session keeper, the provider and events token, the browser client, the live
  layer) and `middleware.ts`.
- Request by request:

| Call | From | Checked |
| --- | --- | --- |
| `POST /v3/session/` | `/api/igaming/age-check` | required `workflow_id`, `callback_method` enum, `contact_details` with notifications off, callback built from config, never from the request |
| `GET /v3/session/{id}/decision/` | sessions, token, verified | read on the server, returned only when `vendor_data` is this player |
| `POST /v3/transactions/sdk-token/` | `/api/igaming/token` | minted only after Didit approved this player's age check, 15 minutes, 30 uses, pinned to `vendor_data` |
| `POST /v1/transactions/`, `GET /v1/transactions/{id}/` | the browser | transaction token only, device data attached by the SDK |
| `POST /v3/events/sdk-token/` | `/api/didit/events-token` | categories from the documented enum, 30 minutes |
| `GET /v3/users/{vendor_data}/`, `PATCH .../update-status/` | operator, self-exclusion | `status` enum, `reason` |
| `GET /v3/lists/`, `POST /v3/lists/{id}/entries/` | verified, setup | query parameters, duplicate-entry error shape |

## What was fixed

- **List lookups used a parameter the API ignores.** `GET /v3/lists/` pages
  with `limit` (50 by default, newest first), not `page_size`. On a shared
  application with more than 50 lists, the "ID-verified players" list was not
  found, and `npm run igaming:setup` created the lists again on every run. The
  server and the script now share one query (`LISTS_QUERY`), filtered to custom
  lists. The rules and entries lists use `limit` too.
- **The player cookie is `__Host-` over HTTPS:** Secure, HttpOnly,
  SameSite=Lax, path `/`, no domain. A bare cookie is trusted only on
  plain-HTTP localhost. Players holding the old cookie start again as a new
  player.
- **An unreachable Didit is reported as such.** The verified route read the
  decision with its own raw call and answered "Unknown session" (404) when
  Didit was down. It now uses the shared client and answers 502 with a
  sentence.
- **Every browser call has a timeout** (20 seconds) and a readable message.
  Before this, a hung request left the cashier spinning.
- **A double click is one transaction.** Game tiles and "Claim now" had no busy
  guard, so a double click submitted two bets or two bonus claims. One guard
  now covers every cashier action and self-exclusion.
- **One token request at a time.** Concurrent callers share one mint, and a
  token minted for a player who has since signed out is dropped.
- **Two tabs no longer overwrite each other.** A tab picks up the state another
  tab of the same player saved, instead of writing its older copy over it.
- **A web SDK that fails to load** shows an error instead of a stuck page, and
  the next try loads it again. Before this, the failed download was cached
  (`lib/didit/browser.ts`), so only a reload helped.
- **One source for URLs.** The callback and the console links come from
  `diditUrls` in `lib/didit/config.ts`, not from a second copy in
  `config/site.ts`.

Tests: route unit tests for the cookie, the list query and the 502; e2e tests
on recorded responses for the double click, a refused token and an SDK that
fails to load. The phone run of the lobby test also failed on main before this
change, so that test now finds the account button by its test id: on a phone
the button is folded away next to the balance.

## Intentionally demo-only

- **No database.** Player state lives in the browser's localStorage. Every
  status shown is still read from Didit: sessions through
  `/api/igaming/sessions`, transactions from `/v1/transactions/{id}/` with the
  player's own token. A real operator keeps this state server-side.
- **No webhook.** The demo shares one application with the other demos, so it
  has no webhook endpoint of its own. `/api/igaming/verified` is called by the
  page when the hosted flow reports back, and it re-reads the decision before
  it trusts it. In production this is a `status.updated` webhook handler with
  its signature verified.
- **The cookie sign-up.** Without an Authentication publishable key (the
  production application today), a random `vendor_data` in a signed cookie
  stands in for the signed-in user. With a key set, the Didit user id is the
  `vendor_data`.
- **The theatre.** The live layer (`lib/igaming/live-events.ts`), the console
  view (`lib/igaming/console-pages.ts`), the API log and the "second account
  on this device" button exist to show what Didit did. None of them is in the
  integration path. To copy the integration, take `lib/didit`,
  `app/api/igaming`, `lib/igaming/{server,player,records,policy,ledger}.ts` and
  `components/igaming/use-aurora.ts`.

## Shared notes for the other demos

These are in `lib/didit` and affect every demo. They were left as they are
here so that the four reviews stay consistent:

- `consoleIds` reads `organization_id` and `application_id` from
  `GET /v3/transactions/` results. The public reference does not list those
  fields, so console deep links may be missing when Didit omits them.
- `POST /v3/events/sdk-token/` accepts `bind_to_origin`, which would tie the
  monitoring token to this site's origin.
