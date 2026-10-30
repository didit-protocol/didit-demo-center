// What /igaming may show of a Didit record. Run with `npm test`.
//
// The inputs use the field names staging returned for real sessions and
// transactions (GET /v3/session/{id}/decision/, GET /v1/transactions/{id}/),
// trimmed to what the projections read plus fields they must drop.
import test from "node:test";
import assert from "node:assert/strict";

const { projectSession, projectTransaction, projectUser, diditErrorMessage } =
  await import("../lib/igaming/records.ts");

const PLAYER = "aurora-play-0123456789abcdef01234567";

const decision = (overrides = {}) => ({
  session_id: "11111111-2222-3333-4444-555555555555",
  session_number: 8066,
  vendor_data: PLAYER,
  workflow_id: "8482aee5-38b8-46fd-914b-e1bc6edcadca",
  status: "Approved",
  contact_details: { email: "player@example.com" },
  liveness_checks: [
    {
      status: "Approved",
      age_estimation: 31.7,
      reference_image: "https://signed.example/selfie.jpg",
      video_url: "https://signed.example/video.mp4",
    },
  ],
  id_verifications: [],
  ip_analyses: [
    {
      ip_address: "203.0.113.7",
      ip_country: "Spain",
      ip_country_code: "ES",
      is_vpn_or_tor: false,
      is_data_center: true,
      latitude: 40.4,
    },
  ],
  ...overrides,
});

test("a session belongs to its player or to nobody", () => {
  assert.equal(projectSession(decision({ vendor_data: "someone-else" }), PLAYER), null);
  assert.equal(projectSession(decision({ session_id: "" }), PLAYER), null);
  assert.equal(projectSession(null, PLAYER), null);
  assert.equal(projectSession("not json", PLAYER), null);
});

test("a session keeps the age, the location and nothing else", () => {
  const summary = projectSession(decision(), PLAYER);

  assert.deepEqual(summary, {
    sessionId: "11111111-2222-3333-4444-555555555555",
    workflowId: "8482aee5-38b8-46fd-914b-e1bc6edcadca",
    status: "Approved",
    estimatedAge: 31,
    documentAge: null,
    ip: {
      country: "Spain",
      countryCode: "ES",
      isVpnOrTor: false,
      isDataCenter: true,
    },
    fullName: null,
    documentType: null,
    documentCountry: null,
    faceMatch: null,
    liveness: null,
    amlHits: null,
  });
  // No images, no email, no coordinates, no raw IP.
  assert.doesNotMatch(
    JSON.stringify(summary),
    /signed\.example|player@example|203\.0\.113|40\.4/,
  );
});

test("an ID check keeps the name, document type and scores, never the document", () => {
  const summary = projectSession(
    decision({
      id_verifications: [
        {
          status: "Approved",
          first_name: "Sofia",
          last_name: "Marin",
          document_type: "Passport",
          issuing_state_name: "Malta",
          document_number: "MT1234567",
          date_of_birth: "1999-03-14",
          front_image: "https://signed.example/front.jpg",
        },
      ],
      face_matches: [{ status: "Approved", score: 98.1 }],
      liveness_checks: [{ status: "Approved", score: 99.4 }],
      aml_screenings: [{ status: "Approved", total_hits: 0 }],
    }),
    PLAYER,
  );

  assert.equal(summary.fullName, "Sofia Marin");
  assert.equal(summary.documentType, "Passport");
  assert.equal(summary.documentCountry, "Malta");
  assert.equal(summary.faceMatch, 98.1);
  assert.equal(summary.liveness, 99.4);
  assert.equal(summary.amlHits, 0);
  assert.doesNotMatch(
    JSON.stringify(summary),
    /MT1234567|1999-03-14|signed\.example/,
  );
});

test("the ID fallback age and an unfinished session", () => {
  const fallback = projectSession(
    decision({ id_verifications: [{ status: "Approved", age: 19 }] }),
    PLAYER,
  );

  assert.equal(fallback.documentAge, 19);
  const unfinished = projectSession(
    decision({ status: "Not Started", liveness_checks: [], ip_analyses: [] }),
    PLAYER,
  );

  assert.equal(unfinished.estimatedAge, null);
  assert.equal(unfinished.ip, null);
  assert.equal(unfinished.status, "Not Started");
});

const transaction = (overrides = {}) => ({
  uuid: "f63c7a24-0000-4000-8000-000000000001",
  transaction_number: 42,
  txn_id: "ap-deposit-01234567-abc",
  transaction_type: "FINANCE",
  action_type: "deposit",
  direction: "INBOUND",
  status: "AWAITING_USER",
  amount: "2000",
  currency: "EUR",
  score: 40,
  decision_reason_label: null,
  vendor_data: PLAYER,
  tags: [
    { uuid: "t1", name: "KYC_STEP_UP" },
    { uuid: "t2", name: "UNLICENSED_MARKET" },
  ],
  parties: [
    {
      role: "APPLICANT",
      vendor_data: PLAYER,
      device: {
        fingerprint: "J4I3kU90oOIS-device",
        user_agent: "Mozilla/5.0",
        network_context: {
          ip_address: "203.0.113.7",
          ip_country: "United States",
          ip_country_code: "US",
          is_vpn_or_tor: false,
          is_data_center: true,
        },
      },
    },
  ],
  rule_runs: [
    {
      rule_title: "Aurora Play demo: ID verification at 2,000 EUR deposited",
      matched: true,
      is_test: false,
      score_delta: 0,
      status_target: "AWAITING_USER",
    },
    {
      rule_title: "Aurora Play demo: cashier used outside licensed markets",
      matched: true,
      is_test: false,
      score_delta: 40,
      status_target: null,
    },
    { rule_title: "Shadow rule", matched: true, is_test: true, score_delta: 5 },
  ],
  action_required: {
    type: "verification_session",
    url: "https://verify.staging.didit.me/session/abc",
    session_id: "24e57cc4-0794-4c73-9e2f-cc6e57a506c5",
    session_token: "secret-session-token",
    status: "Not Started",
  },
  txn_date: "2026-10-13T21:39:35Z",
  ...overrides,
});

test("a transaction keeps its decision, rule hits and device signals", () => {
  const record = projectTransaction(transaction());

  assert.equal(record.id, "f63c7a24-0000-4000-8000-000000000001");
  assert.equal(record.status, "AWAITING_USER");
  assert.equal(record.amount, 2000);
  assert.equal(record.direction, "in");
  assert.deepEqual(record.tags, ["KYC_STEP_UP", "UNLICENSED_MARKET"]);
  // Test-mode rule runs never changed anything, so they are not shown.
  assert.deepEqual(record.ruleHits, [
    {
      title: "Aurora Play demo: ID verification at 2,000 EUR deposited",
      scoreDelta: 0,
      statusTarget: "AWAITING_USER",
    },
    {
      title: "Aurora Play demo: cashier used outside licensed markets",
      scoreDelta: 40,
      statusTarget: null,
    },
  ]);
  assert.deepEqual(record.device, {
    fingerprint: "J4I3kU90oOIS-device",
    ipCountry: "United States",
    ipCountryCode: "US",
    isVpnOrTor: false,
    isDataCenter: true,
  });
  assert.deepEqual(record.action, {
    type: "verification_session",
    url: "https://verify.staging.didit.me/session/abc",
    sessionId: "24e57cc4-0794-4c73-9e2f-cc6e57a506c5",
    status: "Not Started",
  });
  assert.doesNotMatch(JSON.stringify(record), /secret-session-token|203\.0\.113/);
});

test("a withdrawal, a record without a device, and a broken record", () => {
  const out = projectTransaction(
    transaction({
      direction: "OUTBOUND",
      status: "APPROVED",
      parties: [],
      action_required: null,
      rule_runs: [],
      tags: [],
    }),
  );

  assert.equal(out.direction, "out");
  assert.equal(out.action, null);
  assert.equal(out.device.fingerprint, null);
  assert.equal(projectTransaction({ status: "APPROVED" }), null);
  assert.equal(projectTransaction(null), null);
});

test("the persistent device id stands in for a missing fingerprint", () => {
  const record = projectTransaction(
    transaction({
      parties: [
        { role: "APPLICANT", device: { persistent_device_id: "pid-1" } },
      ],
    }),
  );

  assert.equal(record.device.fingerprint, "pid-1");
});

test("a user belongs to its player or to nobody", () => {
  const user = {
    vendor_data: PLAYER,
    didit_internal_id: "4ce8abd9-e36d-4f65-895e-de75619873d7",
    status: "BLOCKED",
    effective_name: "Alex Demo",
    approved_emails: ["player@example.com"],
  };

  assert.deepEqual(projectUser(user, PLAYER), {
    internalId: "4ce8abd9-e36d-4f65-895e-de75619873d7",
    status: "BLOCKED",
    name: "Alex Demo",
  });
  assert.equal(projectUser({ ...user, vendor_data: "other" }, PLAYER), null);
});

test("Didit error bodies become one readable message", () => {
  assert.equal(diditErrorMessage({ detail: "Invalid transaction token." }), "Invalid transaction token.");
  assert.equal(
    diditErrorMessage({
      vendor_data:
        "The individual 'aurora-play-x' is in the blocklist and cannot participate in transactions.",
    }),
    "The individual 'aurora-play-x' is in the blocklist and cannot participate in transactions.",
  );
  assert.equal(
    diditErrorMessage({ value: ["An entry with this value already exists in this list."] }),
    "An entry with this value already exists in this list.",
  );
  assert.equal(diditErrorMessage({ transaction_details: { amount: "Too big." } }), "Too big.");
  assert.equal(diditErrorMessage("plain text"), "plain text");
  assert.equal(diditErrorMessage({}), null);
  assert.equal(diditErrorMessage(null), null);
});
