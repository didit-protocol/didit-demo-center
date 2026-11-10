// The transaction subject's name (lib/didit/subject.ts). Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

const { subjectName } = await import("../lib/didit/subject.ts");

test("the first non-blank candidate wins, trimmed", () => {
  assert.equal(subjectName("Sofia Marin", "typed", "a@b.co"), "Sofia Marin");
  assert.equal(subjectName(null, "  Typed Name ", "a@b.co"), "Typed Name");
  // Signed in with Didit Authentication before the ID check: only the email.
  assert.equal(subjectName(undefined, "", "mm@example.com"), "mm@example.com");
  assert.equal(subjectName(null, "   ", undefined), "");
  assert.equal(subjectName(), "");
});
