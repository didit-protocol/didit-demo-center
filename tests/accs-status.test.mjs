// Status copy rendered by /accs/callback. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

import { resolveAccsStatus } from "../lib/accs-status.ts";

const LABEL = "Age Estimation";
const resolve = (status) => resolveAccsStatus(status, LABEL);

test("In Review explains manual review and stays non-approved", () => {
  const meta = resolve("In Review");

  assert.equal(meta.kind, "review");
  assert.equal(meta.label, "In Review");
  assert.match(meta.description, /manual review/);
  assert.match(meta.description, /not approved/);
  // The whole point of this page fix: never call manual review "processing".
  assert.doesNotMatch(meta.description, /being processed/);
});

test("approved and declined keep their decision copy", () => {
  for (const status of ["Approved", "success", "COMPLETED"]) {
    const meta = resolve(status);

    assert.equal(meta.kind, "approved");
    assert.equal(meta.label, "Approved");
    assert.equal(
      meta.description,
      `The ${LABEL} check passed: the session was accepted.`,
    );
  }

  for (const status of ["Declined", "rejected", "FAILED"]) {
    const meta = resolve(status);

    assert.equal(meta.kind, "declined");
    assert.equal(meta.label, "Declined");
    assert.equal(
      meta.description,
      `The ${LABEL} check did not pass: the session was rejected.`,
    );
  }
});

test("processing copy is reserved for statuses that really are in flight", () => {
  for (const status of ["Not Started", "In Progress", "pending"]) {
    const meta = resolve(status);

    assert.equal(meta.kind, "processing");
    assert.equal(meta.label, status);
    assert.match(meta.description, /still being processed/);
  }
});

test("unrecognised and missing statuses get an honest fallback", () => {
  const abandoned = resolve("Abandoned");

  assert.equal(abandoned.kind, "unknown");
  assert.equal(abandoned.label, "Abandoned");
  assert.match(abandoned.description, /does not interpret/);
  assert.doesNotMatch(abandoned.description, /being processed/);

  for (const status of ["", "   "]) {
    const meta = resolve(status);

    assert.equal(meta.kind, "unknown");
    assert.equal(meta.label, "No status returned");
    assert.match(meta.description, /did not include a status/);
    assert.doesNotMatch(meta.description, /being processed/);
  }
});

test("status matching tolerates the casing and spacing a redirect may carry", () => {
  assert.equal(resolve("in_review").kind, "review");
  assert.equal(resolve("  In  Review  ").kind, "review");
  assert.equal(resolve("in-progress").kind, "processing");
});
