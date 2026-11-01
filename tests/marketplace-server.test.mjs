// The marketplace's server handlers (lib/marketplace/server.ts) end to end,
// against a fake Didit API serving recorded staging responses.
import test from "node:test";
import assert from "node:assert/strict";

import {
  TOKEN_MAX_USES,
  TOKEN_TTL_SECONDS,
  availability,
  clearConsoleIdCache,
  handleClaim,
  handleOpenShop,
  handleStartKyb,
  handleState,
  handleToken,
  handleTransaction,
  safeOrigin,
} from "../lib/marketplace/server.ts";

import {
  RECORDED,
  TEST_KEY,
  fakeApi,
  fixture,
  makeEnv,
  seller,
  stateWith,
} from "./marketplace-helpers.mjs";

const tx = (uuid) => `GET /v3/transactions/${uuid}/`;
const decision = (sid) => `GET /v3/session/${sid}/decision/`;
const KYB_SID = "6f1c9b8e-2a4d-4f3b-9c1e-7d5a8b0e4c21";

const kybWith = (status) => ({
  ...fixture("kyb-decision-docs-example"),
  status,
});

test.beforeEach(() => clearConsoleIdCache());

test("without an API key every route answers 503 and names where the demo runs", async () => {
  const env = makeEnv({ apiKey: "" });

  assert.deepEqual(availability(env), { transactions: false, kyb: false });

  for (const reply of [
    await handleOpenShop(env, null, { shop: "A shop", company: "Acme", country: "GB" }),
    await handleToken(env, null, { purpose: "purchase" }),
    await handleClaim(env, null, { uuid: RECORDED.orderApproved }),
  ]) {
    assert.equal(reply.status, 503);
    assert.equal(reply.body.code, "not_configured");
    assert.match(reply.body.error, /demos\.staging\.didit\.me\/marketplace/);
  }
});

test("production runs the demo too, with the production workflows", () => {
  assert.deepEqual(availability(makeEnv({ isStaging: false })), {
    transactions: true,
    kyb: true,
  });
});

test("with Authentication on, the signed-in Didit user is the shop and the buyer", async () => {
  const visitor = "northmarket-user_2b8f0c1d9e";
  const signedOut = makeEnv({ visitor: null });

  for (const reply of [
    await handleOpenShop(signedOut, null, { shop: "Ruiz Vintage" }),
    await handleToken(signedOut, null, { purpose: "purchase" }),
  ]) {
    assert.equal(reply.status, 401);
    assert.equal(reply.body.code, "signed_out");
  }

  const env = makeEnv({ visitor });
  const opened = await handleOpenShop(env, null, { shop: "Ruiz Vintage" });

  assert.equal(opened.status, 201);
  assert.equal(opened.state.sellers[0].id, visitor);
  // Without a legal name the KYB's registry search starts from the shop's.
  assert.equal(opened.state.sellers[0].company, "Ruiz Vintage");
  assert.equal(opened.state.sellers[0].country, "");

  const again = await handleOpenShop(env, opened.state, { shop: "Ruiz Vintage Outlet" });

  assert.equal(again.status, 409);
  assert.equal(again.body.code, "shop_exists");

  const api = fakeApi({
    "POST /v3/transactions/sdk-token/": [201, { sdk_token: "minted-for-test" }],
  });
  const token = await handleToken(makeEnv({ visitor, fetch: api.fetch }), opened.state, {
    purpose: "purchase",
  });

  assert.equal(token.status, 200);
  assert.equal(token.state.buyer, `${visitor}-buyer`);
  assert.equal(api.calls[0].body.vendor_data, `${visitor}-buyer`);
});

test("without the KYB workflow id only the business verification is off", async () => {
  const env = makeEnv({
    workflows: { kyb: "", age: "a", person: "p" },
  });
  const state = stateWith({ sellers: [seller(RECORDED.firstShop)] });

  assert.deepEqual(availability(env), { transactions: true, kyb: false });

  const reply = await handleStartKyb(env, state, RECORDED.firstShop, {
    origin: "https://demos.staging.didit.me",
    fallbackOrigin: "https://demos.staging.didit.me",
    language: "en",
  });

  assert.equal(reply.status, 503);
  assert.equal(reply.body.code, "kyb_workflow_missing");
});

test("an id that is not a workflow uuid turns the business verification off too, and the page knows it", async () => {
  for (const kyb of ["", "  ", "todo", "811d80dd-491e-4799-b905"]) {
    assert.equal(availability(makeEnv({ workflows: { kyb, age: "a", person: "p" } })).kyb, false, kyb);
  }
  assert.equal(
    availability(makeEnv({ workflows: { kyb: "811d80dd-491e-4799-b905-2c8007c9df78", age: "a", person: "p" } })).kyb,
    true,
  );

  // The state route carries it, so "Verify my business" is off before a click.
  const state = await handleState(makeEnv({ workflows: { kyb: "", age: "a", person: "p" } }), null);

  assert.equal(state.status, 200);
  assert.deepEqual(state.body.availability, { transactions: true, kyb: false });
});

test("opening a shop validates the form and caps shops per browser", async () => {
  const env = makeEnv();

  assert.equal(
    (await handleOpenShop(env, null, { shop: "x", company: "Acme", country: "GB" })).status,
    400,
  );
  assert.equal(
    (await handleOpenShop(env, null, { shop: "Shop", company: "Acme", country: "US" })).status,
    400,
  );

  const reply = await handleOpenShop(env, null, {
    shop: "  Atelier   Nord ",
    company: "Acme Corporation Limited",
    country: "GB",
  });

  assert.equal(reply.status, 201);
  assert.equal(reply.state.sellers.length, 1);
  assert.equal(reply.state.sellers[0].shop, "Atelier Nord");
  assert.match(reply.state.sellers[0].id, /^mkt-seller-[a-f0-9]{12}$/);
  assert.equal(reply.body.seller.kyb, null);

  const full = stateWith({
    sellers: [seller("mkt-seller-000000000001"), seller("mkt-seller-000000000002"), seller("mkt-seller-000000000003")],
  });
  const capped = await handleOpenShop(env, full, {
    shop: "Fourth",
    company: "Acme",
    country: "GB",
  });

  assert.equal(capped.status, 409);
  assert.equal(capped.body.code, "too_many_shops");
});

test("a purchase token is minted for a new buyer this browser owns", async () => {
  const api = fakeApi({
    "POST /v3/transactions/sdk-token/": [201, { sdk_token: "minted-for-test", expires_at: "2026-10-13T22:05:00Z" }],
  });
  const env = makeEnv({ fetch: api.fetch });
  const reply = await handleToken(env, null, { purpose: "purchase" });

  assert.equal(reply.status, 200);
  assert.match(reply.state.buyer, /^mkt-buyer-[a-f0-9]{12}$/);
  assert.deepEqual(api.calls[0].body, {
    vendor_data: reply.state.buyer,
    ttl_seconds: TOKEN_TTL_SECONDS,
    max_uses: TOKEN_MAX_USES,
  });
  assert.equal(api.calls[0].headers["x-api-key"], TEST_KEY);
  assert.equal(reply.body.token, "minted-for-test");
  assert.equal(reply.body.baseUrl, env.apiBase);
  assert.deepEqual(reply.body.subject, {
    vendorData: reply.state.buyer,
    name: "Northmarket buyer",
    type: "individual",
  });
  // The API key itself never appears in what the browser receives.
  assert.ok(!JSON.stringify(reply.body).includes(TEST_KEY));
});

test("a token is never minted for a shop this browser did not open", async () => {
  const api = fakeApi({});
  const reply = await handleToken(makeEnv({ fetch: api.fetch }), stateWith(), {
    purpose: "signup",
    seller: RECORDED.firstShop,
  });

  assert.equal(reply.status, 404);
  assert.equal(api.calls.length, 0);
});

test("payouts stay locked until the shop's KYB is approved", async () => {
  const noKyb = stateWith({ sellers: [seller(RECORDED.firstShop)] });
  const locked = await handleToken(makeEnv(), noKyb, {
    purpose: "payout",
    seller: RECORDED.firstShop,
  });

  assert.equal(locked.status, 409);
  assert.equal(locked.body.code, "payouts_locked");

  const withKyb = stateWith({
    sellers: [seller(RECORDED.firstShop, { sid: KYB_SID })],
  });

  for (const status of ["Awaiting User", "In Review", "Declined"]) {
    const api = fakeApi({ [decision(KYB_SID)]: kybWith(status) });
    const reply = await handleToken(makeEnv({ fetch: api.fetch }), withKyb, {
      purpose: "payout",
      seller: RECORDED.firstShop,
    });

    assert.equal(reply.status, 409, status);
    assert.match(reply.body.error, new RegExp(status));
    assert.ok(!api.calls.some((call) => call.path.includes("sdk-token")));
  }

  const api = fakeApi({
    [decision(KYB_SID)]: kybWith("Approved"),
    "POST /v3/transactions/sdk-token/": [201, fixture("sdk-token")],
  });
  const open = await handleToken(makeEnv({ fetch: api.fetch }), withKyb, {
    purpose: "payout",
    seller: RECORDED.firstShop,
  });

  assert.equal(open.status, 200);
  assert.deepEqual(open.body.subject, {
    vendorData: RECORDED.firstShop,
    name: "Acme Corporation Limited",
    type: "company",
  });
});

test("a submitted transaction is claimed only by the browser that owns its subject", async () => {
  const api = fakeApi({
    [tx(RECORDED.signupHeld)]: fixture("transaction-signup-held"),
  });
  const env = makeEnv({ fetch: api.fetch });
  const owner = stateWith({
    sellers: [
      seller(RECORDED.firstShop, { signup: RECORDED.signupApproved }),
      seller(RECORDED.secondShop, { shop: "Kestrel Goods" }),
    ],
    tx: [RECORDED.signupApproved],
  });

  const claimed = await handleClaim(env, owner, { uuid: RECORDED.signupHeld });

  assert.equal(claimed.status, 200);
  assert.equal(claimed.body.status, "IN_REVIEW");
  assert.deepEqual(claimed.state.tx, [RECORDED.signupApproved, RECORDED.signupHeld]);
  assert.equal(claimed.state.sellers[1].signup, RECORDED.signupHeld);

  // Someone else who learned the uuid cannot add it to their browser.
  const stranger = await handleClaim(env, stateWith({ sellers: [seller("mkt-seller-aaaaaaaaaaaa")] }), {
    uuid: RECORDED.signupHeld,
  });

  assert.equal(stranger.status, 404);
  assert.equal(stranger.state, undefined);
  assert.equal((await handleClaim(env, owner, { uuid: "nope" })).status, 400);
});

test("another demo's transaction is never claimed, even for an owned subject", async () => {
  const other = { ...fixture("transaction-signup-held"), props: { demo_app: "fintech" } };
  const api = fakeApi({ [tx(RECORDED.signupHeld)]: other });
  const reply = await handleClaim(
    makeEnv({ fetch: api.fetch }),
    stateWith({ sellers: [seller(RECORDED.secondShop)] }),
    { uuid: RECORDED.signupHeld },
  );

  assert.equal(reply.status, 404);
});

test("a transaction is read back only when it is in the browser's state", async () => {
  const api = fakeApi({
    [tx(RECORDED.orderAwaiting)]: fixture("transaction-order-awaiting-user"),
  });
  const env = makeEnv({ fetch: api.fetch });

  assert.equal(
    (await handleTransaction(env, stateWith(), RECORDED.orderAwaiting)).status,
    404,
  );
  assert.equal(api.calls.length, 0);

  const reply = await handleTransaction(
    env,
    stateWith({ buyer: RECORDED.buyer, tx: [RECORDED.orderAwaiting] }),
    RECORDED.orderAwaiting,
  );

  assert.equal(reply.status, 200);
  assert.equal(reply.body.status, "AWAITING_USER");
  assert.ok(reply.body.verification);
});

test("starting a KYB creates a business session with the shop's details", async () => {
  const api = fakeApi({
    "POST /v3/session/": [201, { session_id: KYB_SID, url: "https://verify.staging.didit.me/session/REDACTED_TOKEN", status: "Not Started" }],
  });
  const env = makeEnv({ fetch: api.fetch });
  const state = stateWith({ sellers: [seller(RECORDED.firstShop)] });
  const reply = await handleStartKyb(env, state, RECORDED.firstShop, {
    origin: "https://demos.staging.didit.me",
    fallbackOrigin: "https://demos.staging.didit.me",
    language: "es",
  });

  assert.equal(reply.status, 201);
  assert.equal(reply.state.sellers[0].sid, KYB_SID);
  assert.deepEqual(api.calls[0].body, {
    workflow_id: env.workflows.kyb,
    vendor_data: RECORDED.firstShop,
    callback: "https://demos.staging.didit.me/marketplace",
    callback_method: "both",
    language: "es",
    metadata: { demo_app: "marketplace", shop: "Atelier Nord" },
    expected_details: {
      company_name: "Acme Corporation Limited",
      registry_country: "GB",
    },
  });
});

test("a foreign or plain-http origin falls back to the site's own callback", async () => {
  for (const origin of ["https://evil.example.com", "http://demos.didit.me", "https://didit.me.evil.example"]) {
    assert.equal(safeOrigin(origin, "https://demos.staging.didit.me"), "https://demos.staging.didit.me");
  }
  assert.equal(safeOrigin("http://localhost:3111", "https://demos.didit.me"), "http://localhost:3111");
  assert.equal(safeOrigin("https://demos.didit.me", "https://demos.staging.didit.me"), "https://demos.didit.me");

  const api = fakeApi({
    "POST /v3/session/": [201, { session_id: KYB_SID, url: "https://verify.staging.didit.me/session/x" }],
  });
  const reply = await handleStartKyb(
    makeEnv({ fetch: api.fetch }),
    stateWith({ sellers: [seller(RECORDED.firstShop)] }),
    RECORDED.firstShop,
    { origin: "http://plain.example.com", fallbackOrigin: "https://demos.staging.didit.me", language: "en" },
  );

  assert.equal(reply.status, 201);
  assert.equal(api.calls[0].body.callback, "https://demos.staging.didit.me/marketplace");
});

test("an open KYB is resumed instead of starting a second one", async () => {
  const api = fakeApi({ [decision(KYB_SID)]: kybWith("In Progress") });
  const reply = await handleStartKyb(
    makeEnv({ fetch: api.fetch }),
    stateWith({ sellers: [seller(RECORDED.firstShop, { sid: KYB_SID })] }),
    RECORDED.firstShop,
    { origin: null, fallbackOrigin: "https://demos.staging.didit.me", language: "en" },
  );

  assert.equal(reply.status, 200);
  assert.equal(reply.body.resumed, true);
  assert.equal(reply.body.url, fixture("kyb-decision-docs-example").session_url);
  assert.ok(!api.calls.some((call) => call.method === "POST"));
});

const KYB_START = { origin: null, fallbackOrigin: "https://demos.staging.didit.me", language: "en" };

test("a KYB whose decision cannot be read is not started a second time", async () => {
  const api = fakeApi({
    [decision(KYB_SID)]: [503, { detail: "Service unavailable." }],
    "POST /v3/session/": [201, { session_id: crypto.randomUUID(), url: "https://verify.staging.didit.me/session/x" }],
  });
  const reply = await handleStartKyb(
    makeEnv({ fetch: api.fetch }),
    stateWith({ sellers: [seller(RECORDED.firstShop, { sid: KYB_SID })] }),
    RECORDED.firstShop,
    KYB_START,
  );

  assert.equal(reply.status, 502);
  assert.equal(reply.state, undefined);
  assert.ok(!api.calls.some((call) => call.method === "POST"));
});

test("only a KYB that can no longer finish is started again", async () => {
  for (const [status, restarts] of [
    ["Declined", true],
    ["Expired", true],
    ["Abandoned", true],
    ["In Review", false],
    ["Approved", false],
  ]) {
    const api = fakeApi({
      [decision(KYB_SID)]: kybWith(status),
      "POST /v3/session/": [201, { session_id: "7a2d0c4e-1b3f-4e5a-8c6d-9e0f1a2b3c4d", url: "https://verify.staging.didit.me/session/x" }],
    });
    const reply = await handleStartKyb(
      makeEnv({ fetch: api.fetch }),
      stateWith({ sellers: [seller(RECORDED.firstShop, { sid: KYB_SID })] }),
      RECORDED.firstShop,
      KYB_START,
    );

    assert.equal(reply.status, restarts ? 201 : 409, status);
    assert.equal(api.calls.some((call) => call.method === "POST"), restarts, status);
  }
});

test("with Authentication on, a signed-out visitor cannot start a KYB", async () => {
  const api = fakeApi({});
  const reply = await handleStartKyb(
    makeEnv({ fetch: api.fetch, visitor: null }),
    stateWith({ sellers: [seller(RECORDED.firstShop)] }),
    RECORDED.firstShop,
    KYB_START,
  );

  assert.equal(reply.status, 401);
  assert.equal(reply.body.code, "signed_out");
  assert.equal(api.calls.length, 0);
});

test("configured console ids win over the ones read from the API", async () => {
  const api = fakeApi({ [decision(KYB_SID)]: kybWith("In Review") });
  const reply = await handleState(
    makeEnv({
      fetch: api.fetch,
      console: { origin: "https://business.staging.didit.me", orgId: "org-from-env", appId: "app-from-env" },
    }),
    stateWith({ sellers: [seller(RECORDED.firstShop, { sid: KYB_SID })] }),
  );

  assert.equal(reply.status, 200);
  assert.ok(!api.calls.some((call) => call.path.startsWith("/v3/transactions/?")));
  assert.match(
    reply.body.sellers[0].kybLink.href,
    new RegExp(`/console/org-from-env/app-from-env/kyb/verifications/${KYB_SID}$`),
  );
});

test("without console ids the KYB link honestly lands on the console home", async () => {
  const api = fakeApi({
    [decision(KYB_SID)]: kybWith("In Review"),
    // No row to read the ids from, so nothing is cached either.
    "GET /v3/transactions/?limit=1": { count: 0, next: null, results: [] },
  });
  const reply = await handleState(
    makeEnv({ fetch: api.fetch }),
    stateWith({ sellers: [seller(RECORDED.firstShop, { sid: KYB_SID })] }),
  );

  assert.equal(reply.status, 200);
  assert.equal(api.calls.filter((call) => call.path === "/v3/transactions/?limit=1").length, 1);
  assert.deepEqual(reply.body.sellers[0].kybLink, { href: "https://business.staging.didit.me/", direct: false });
});

test("the page state lists this browser's shops and transactions, newest first", async () => {
  const api = fakeApi({
    [tx(RECORDED.signupApproved)]: fixture("transaction-signup-approved"),
    [tx(RECORDED.orderApproved)]: fixture("transaction-order-approved"),
    [decision(KYB_SID)]: kybWith("In Review"),
    "GET /v3/transactions/?limit=1": fixture("transactions-list-first"),
  });
  const reply = await handleState(
    makeEnv({ fetch: api.fetch }),
    stateWith({
      buyer: RECORDED.buyer,
      sellers: [seller(RECORDED.firstShop, { sid: KYB_SID, signup: RECORDED.signupApproved })],
      tx: [RECORDED.signupApproved, RECORDED.orderApproved],
    }),
  );

  assert.equal(reply.status, 200);
  assert.deepEqual(
    reply.body.transactions.map((t) => t.uuid),
    [RECORDED.orderApproved, RECORDED.signupApproved],
  );
  assert.equal(reply.body.sellers[0].kyb.status, "In Review");
  assert.equal(reply.body.sellers[0].kybLink.direct, true);
  assert.match(reply.body.sellers[0].kybLink.href, new RegExp(`/kyb/verifications/${KYB_SID}$`));
});
