// Trimming of real API payloads before they reach the browser
// (lib/marketplace/summaries.ts), against recorded staging responses.
import test from "node:test";
import assert from "node:assert/strict";

import {
  isMarketplaceTransaction,
  subjectVendor,
  summarizeKyb,
  summarizeTransaction,
} from "../lib/marketplace/summaries.ts";

import { RECORDED, fixture } from "./marketplace-helpers.mjs";

test("a held sign-up keeps its rule, score and tag", () => {
  const summary = summarizeTransaction(fixture("transaction-signup-held"));

  assert.equal(summary.uuid, RECORDED.signupHeld);
  assert.equal(summary.kind, "signup");
  assert.equal(summary.status, "IN_REVIEW");
  assert.equal(summary.score, 70);
  assert.equal(summary.subject, RECORDED.secondShop);
  assert.deepEqual(summary.rules, [
    {
      title: "Marketplace demo: second shop on one device",
      scoreDelta: 70,
      statusTarget: "IN_REVIEW",
    },
  ]);
  assert.deepEqual(summary.tags, ["SHARED_DEVICE"]);
  assert.equal(summary.verification, null);
});

test("an approved order has no rule hits and no verification", () => {
  const summary = summarizeTransaction(fixture("transaction-order-approved"));

  assert.equal(summary.kind, "purchase");
  assert.equal(summary.status, "APPROVED");
  assert.equal(summary.amount, 180);
  assert.equal(summary.listing, "film-camera");
  assert.equal(summary.subject, RECORDED.buyer);
  assert.deepEqual(summary.rules, []);
});

test("a high-value order carries the age check link, never its token", () => {
  const raw = fixture("transaction-order-awaiting-user");
  const summary = summarizeTransaction(raw);

  assert.equal(summary.status, "AWAITING_USER");
  assert.equal(summary.amount, 2900);
  assert.equal(
    summary.rules[0].title,
    "Marketplace demo: high-value order needs an age check",
  );
  assert.ok(summary.verification);
  assert.equal(summary.verification.sessionId, raw.action_required.session_id);
  assert.match(summary.verification.url, /^https:\/\/verify\.staging\.didit\.me\/session\//);
  assert.ok(!JSON.stringify(summary).includes("session_token"));
  assert.ok(!("remediation" in summary));
});

test("the subject is the APPLICANT party, not the counterparty shop", () => {
  const raw = fixture("transaction-order-awaiting-user");
  const roles = raw.parties.map((party) => party.role).sort();

  assert.deepEqual(roles, ["APPLICANT", "COUNTERPARTY"]);
  // Whatever order the API lists the parties in.
  assert.equal(subjectVendor(raw), RECORDED.buyer);
  assert.equal(
    subjectVendor({ ...raw, parties: [...raw.parties].reverse() }),
    RECORDED.buyer,
  );
  assert.ok(isMarketplaceTransaction(raw));
  assert.ok(!isMarketplaceTransaction({ ...raw, props: { demo_app: "fintech" } }));
});

test("the KYB summary keeps the business picture and drops personal data", () => {
  const kyb = summarizeKyb(fixture("kyb-decision-docs-example"));
  const text = JSON.stringify(kyb);

  assert.equal(kyb.status, "Awaiting User");
  assert.equal(kyb.company.name, "Acme Corporation Limited");
  assert.equal(kyb.company.number, "12345678");
  assert.equal(kyb.company.registryStatus, "active");
  assert.deepEqual(kyb.officers, [{ name: "Jane Doe", role: "Director" }]);
  assert.deepEqual(kyb.owners, [{ name: "John Doe", ownership: 40 }]);
  assert.deepEqual(
    kyb.steps.map((step) => step.key),
    ["registry", "people", "documents", "aml"],
  );
  assert.deepEqual(kyb.documents, [
    { type: "certificate_of_incorporation", status: "Approved" },
  ]);
  assert.equal(kyb.amlHits, 0);

  // The submitted key person can continue their own unfinished ID check...
  assert.equal(kyb.people[0].name, "Alice Chen");
  assert.equal(kyb.people[0].kycStatus, "Not Started");
  assert.match(kyb.people[0].kycUrl, /^https:\/\/verify\.didit\.me\//);
  // ...but the session is past the hosted flow, so it has no continue link.
  assert.equal(kyb.url, null);

  for (const leaked of [
    "file_url",
    "1990-01-01",
    "alex.sample@example.com",
    "+34612345678",
    "SAMPLE-TAX-12345",
    "1 Example Street",
  ]) {
    assert.ok(!text.includes(leaked), `${leaked} must not reach the browser`);
  }
});

test("an open KYB keeps its continue link; a finished person check loses theirs", () => {
  const raw = fixture("kyb-decision-docs-example");
  const open = summarizeKyb({ ...raw, status: "In Progress" });
  const party = raw.key_people_checks[0].submitted.parties[0];
  const done = summarizeKyb({
    ...raw,
    key_people_checks: [
      {
        ...raw.key_people_checks[0],
        submitted: {
          parties: [{ ...party, kyc_session_status: "Approved" }],
        },
      },
    ],
  });

  assert.equal(open.url, raw.session_url);
  assert.equal(done.people[0].kycUrl, null);
});
