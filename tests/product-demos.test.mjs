// The product demos: the 18 configs, the decision a live demo shows and the
// session handlers behind it. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

await import("./helpers/register.mjs");

process.env.NEXT_PUBLIC_IS_STAGING = "true";

const { PRODUCT_DEMOS, getProductDemo, routeForLegacy } = await import("../lib/product-demos/demos.ts");
const { familyCounts, productDemoRoute } = await import("../lib/product-demos/define.ts");
const { readDecision, decisionEvents, sessionEvent, consolePage } = await import("../lib/product-demos/decision.ts");
const { startSession, readSession, vendorFor } = await import("../lib/product-demos/server.ts");
const { DEMOS: CATALOGUE } = await import("../lib/demos.ts");

const LIVE = [
  "Core KYC",
  "KYC and AML",
  "Liveness",
  "Adaptive age check",
  "Age estimation, ISO 27566",
  "Age verification, ISO 27566",
  "Proof of address",
  "Questionnaires",
  "Biometric authentication",
  "Multi-factor",
];
const SAMPLE = [
  "Face search 1:N",
  "IP and device",
  "Didit CAPTCHA",
  "Business verification",
  "Key people and UBOs",
  "Transaction monitoring",
  "Wallet screening",
  "AML screening",
];

test("all 18, in the hub's order, 10 live and 8 samples", () => {
  assert.equal(PRODUCT_DEMOS.length, 18);
  assert.deepEqual(
    PRODUCT_DEMOS.filter((demo) => demo.mode === "live").map((demo) => demo.title),
    LIVE,
  );
  assert.deepEqual(
    PRODUCT_DEMOS.filter((demo) => demo.mode === "sample").map((demo) => demo.title).sort(),
    [...SAMPLE].sort(),
  );
  assert.deepEqual(PRODUCT_DEMOS.slice(0, 3).map((demo) => demo.id), ["core-kyc", "kyc-and-aml", "liveness"]);
  assert.equal(PRODUCT_DEMOS.at(-1).id, "aml-screening");
});

test("the filter's counts match the Main board", () => {
  assert.deepEqual(familyCounts(PRODUCT_DEMOS), {
    all: 18,
    identity: 10,
    authentication: 3,
    business: 2,
    transactions: 3,
  });
});

test("every config is complete, with a unique id and route", () => {
  const ids = new Set();

  for (const demo of PRODUCT_DEMOS) {
    assert.match(demo.id, /^[a-z0-9-]+$/, demo.id);
    assert.ok(!ids.has(demo.id), `duplicate ${demo.id}`);
    ids.add(demo.id);
    assert.equal(productDemoRoute(demo), `/product-demos/${demo.id}`);
    assert.equal(getProductDemo(demo.id), demo);
    assert.equal(demo.steps.length, 3, demo.id);
    assert.ok(demo.tags.length > 0, demo.id);
    assert.ok(demo.blurb && demo.lede && demo.area && demo.docsPath, demo.id);
    assert.match(demo.icon, /^[a-z0-9-]+$/, demo.id);

    if (demo.mode === "live") {
      assert.ok(demo.time.short && demo.time.long && demo.check, demo.id);
      assert.ok(demo.preview.items.length > 0, demo.id);
    } else {
      assert.ok(demo.fixture.rules.length > 0, demo.id);
      assert.match(demo.fixture.request.path, /^\//, demo.id);
      assert.doesNotThrow(() => JSON.parse(demo.fixture.response), demo.id);
      if (demo.industry) assert.match(demo.industry.route, /^\/[a-z-]+$/, demo.id);
    }
  }
});

test("live demos keep the workflows the old catalogue ran", () => {
  for (const demo of PRODUCT_DEMOS.filter((item) => item.mode === "live")) {
    const old = CATALOGUE.find((item) => item.id === demo.legacyId);

    assert.ok(old, `${demo.id} has no catalogue entry`);
    if (old.workflowId) assert.equal(demo.workflow, old.workflowId, demo.id);
  }
  // KYC and AML runs the KYC and AML onboarding workflow; questionnaires is
  // not published on the demo application yet.
  assert.equal(getProductDemo("kyc-and-aml").workflow, "c076a8bb-b0a1-482a-a257-c296391fac2f");
  assert.equal(getProductDemo("questionnaires").workflow, null);
  assert.equal(getProductDemo("biometric-authentication").requiresPortrait, true);
});

test("every old catalogue id redirects to its new page", () => {
  for (const old of CATALOGUE)
    assert.match(routeForLegacy(old.id) ?? "", /^\/product-demos\/[a-z0-9-]+$/, old.id);
  assert.equal(routeForLegacy("liveness"), "/product-demos/liveness");
  assert.equal(routeForLegacy("txn"), "/product-demos/transaction-monitoring");
  assert.equal(routeForLegacy("nope"), null);
});

// Words that keep their capitals mid-sentence: names and acronyms.
const PROPER = /^(ID|IDs|KYC|KYB|AML|PEP|UBOs|ISO|CAPTCHA|IP|VPN|Tor|BTC|EUR|Didit|Alder|Kestrel|Northmarket|Aurora|Play|Northwind|Trading|B\.V\.|Ivan|Petrov|Jonas|Koch)[,.]?$/;

function sentenceCase(text) {
  return text
    .split(" ")
    .slice(1)
    .every((word) => !/^[A-Z]/.test(word) || PROPER.test(word));
}

test("copy: sentence case, no em dash, no tracker keys", () => {
  for (const demo of PRODUCT_DEMOS) {
    const copy = JSON.stringify(demo);

    assert.ok(!copy.includes("\u2014"), `${demo.id} has an em dash`);
    assert.doesNotMatch(copy, /\b(DID|DM|BOT)-\d/, demo.id);
    const titles = [
      demo.title,
      ...demo.tags,
      ...demo.steps.map((step) => step.title),
      ...(demo.mode === "sample" ? demo.fixture.rules.map((rule) => rule.title) : []),
    ];

    for (const title of titles) assert.ok(sentenceCase(title), `${demo.id}: "${title}"`);
  }
});

const LIVENESS = {
  session_id: "3f0c2a1e-8b7d-4c6e-9a5f-1b2c3d4e5f60",
  session_number: 48219,
  status: "Approved",
  vendor_data: "product-demo-abc123def456",
  liveness_checks: [{ status: "Approved", method: "PASSIVE", score: 99.4, reference_image: "https://example.test/selfie.jpg" }],
  ip_analyses: [{ ip_country: "Malta", is_vpn_or_tor: false, is_data_center: false }],
};

test("a liveness decision reads as the ProductDemoResult board", () => {
  const view = readDecision(LIVENESS);

  assert.equal(view.status, "approved");
  assert.equal(view.statusLabel, "Approved");
  assert.equal(view.session, "S-48219");
  assert.equal(view.portrait, "https://example.test/selfie.jpg");
  assert.deepEqual(view.rows, [
    ["Liveness", "Passed · 99.4"],
    ["Method", "Passive"],
    ["Network", "Residential · no VPN"],
    ["Session", "S-48219"],
  ]);
  assert.equal(view.summary, "Score 99.4 · passive");

  const demo = getProductDemo("liveness");
  const events = decisionEvents(demo, LIVENESS.session_id, view);

  assert.deepEqual(
    events.map((event) => [event.product, event.title, event.detail]),
    [
      ["signals", "IP analysis", "Residential network · no VPN · Malta"],
      ["verification", "Liveness passed", "Score 99.4 · passive"],
    ],
  );
  assert.equal(events[1].code, "GET /v3/session/{id}/decision/");
  assert.equal(sessionEvent(demo, "x").detail, "Liveness workflow · sandbox");

  const page = consolePage(demo, view, { vendorData: LIVENESS.vendor_data, device: "Chrome on macOS", timeline: [] });

  assert.equal(page.kind, "person");
  assert.equal(page.record, "S-48219");
  assert.equal(page.head.tag.label, "Approved");
  assert.deepEqual(page.side.pairs.find(([key]) => key === "Device"), ["Device", "Chrome on macOS"]);
});

test("declined, in review and unfinished decisions keep their status", () => {
  assert.equal(readDecision({ status: "Declined" }).status, "declined");
  assert.equal(readDecision({ status: "In Review" }).status, "review");
  assert.equal(readDecision({ status: "In Progress" }).statusLabel, "Not finished");
  const kyc = readDecision({
    status: "Approved",
    session_id: "abcdef12-0000-0000-0000-000000000000",
    id_verifications: [{ status: "Approved", document_type: "Passport", issuing_state_name: "Malta", age: 27, first_name: "Sofia", last_name: "Marin" }],
    aml_screenings: [{ status: "Approved", total_hits: 0 }],
  });

  assert.equal(kyc.name, "Sofia Marin");
  assert.deepEqual(kyc.rows.slice(0, 3), [
    ["Document", "Passed · Passport · Malta"],
    ["Age", "27"],
    ["AML screening", "No matches"],
  ]);
  assert.deepEqual(kyc.rows.at(-1), ["Session", "abcdef12"]);
});

function recorder(answer) {
  const calls = [];
  const env = {
    apiBase: "https://api.test",
    apiKey: "k-123",
    fetch: async (url, init) => {
      const call = { url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined };

      calls.push(call);
      const { status, body } = answer(call);

      return new Response(JSON.stringify(body), { status });
    },
  };

  return { calls, env };
}

test("startSession creates the session with the demo's own workflow for the visitor", async () => {
  const { calls, env } = recorder(() => ({ status: 201, body: { session_id: "s-1", url: "https://verify.test/s-1" } }));
  const demo = getProductDemo("liveness");
  const vendor = vendorFor("abc123def456");
  const answer = await startSession(demo, vendor, {}, env);

  assert.equal(answer.status, 200);
  assert.deepEqual(answer.body, {
    sessionId: "s-1",
    url: "https://verify.test/s-1",
    didit: [{ method: "POST", path: "/v3/session/", status: 201 }],
  });
  assert.equal(calls[0].url, "https://api.test/v3/session/");
  assert.equal(calls[0].body.workflow_id, demo.workflow);
  assert.equal(calls[0].body.vendor_data, "product-demo-abc123def456");
  assert.equal(calls[0].body.callback, "https://demos.staging.didit.me/product-demos/liveness");
  assert.deepEqual(calls[0].body.metadata, { demo: "liveness" });
});

test("startSession refuses an unpublished workflow and a missing portrait, without calling Didit", async () => {
  const { calls, env } = recorder(() => ({ status: 201, body: {} }));

  assert.equal((await startSession(getProductDemo("questionnaires"), "v", {}, env)).status, 409);
  assert.equal((await startSession(getProductDemo("biometric-authentication"), "v", {}, env)).status, 400);
  assert.equal(
    (await startSession(getProductDemo("biometric-authentication"), "v", { portrait: "data:text/html;base64,AAAA" }, env)).status,
    400,
  );
  assert.equal(calls.length, 0);

  await startSession(getProductDemo("biometric-authentication"), "v", { portrait: "data:image/png;base64,iVBORw0K" }, env);
  assert.equal(calls[0].body.portrait_image, "iVBORw0K");
});

test("readSession returns a decision only to the visitor who ran it", async () => {
  const id = LIVENESS.session_id;
  const { calls, env } = recorder(() => ({ status: 200, body: LIVENESS }));

  const mine = await readSession(id, LIVENESS.vendor_data, env);

  assert.equal(mine.status, 200);
  assert.equal(mine.body.decision.session_number, 48219);
  assert.equal(calls[0].url, `https://api.test/v3/session/${id}/decision/`);

  assert.equal((await readSession(id, "product-demo-someoneelse", env)).status, 404);
  assert.equal((await readSession("../../users", LIVENESS.vendor_data, env)).status, 400);
  assert.equal(calls.length, 2);
});
