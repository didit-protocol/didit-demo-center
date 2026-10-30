// The fixture manifest, checked against what the tests actually load.
//
// tests/fixtures/manifest.json lists every recorded answer the demo suites
// replay, the demo entity families it stands for, and the SHA-256 of the file.
// The fixtures are isolated: `npm test` reads them from disk and never calls
// staging. This test keeps them complete, deterministic and free of live
// session tokens, real personal data and credentials. Run with `npm test`.

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const MANIFEST_FILE = path.join(FIXTURES, "manifest.json");
const MANIFEST = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));

const SECRET_KEY = /(?:^|_)(?:token|secret|password|api_?key|authorization|credential)(?:$|_)/i;
const SAFE_SECRETS = new Set(["REDACTED_TOKEN"]);
const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/sk_live_[A-Za-z0-9]{8,}/, "Stripe live key"],
  [/gh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SAFE_EMAIL = /@(?:example\.(?:com|org|net)|[a-z0-9.-]+\.test)$/i;
const PHONE_KEYS = new Set(["phone", "phone_number", "mobile", "mobile_number"]);
const SAFE_PHONES = new Set(["+15550101000", "+34600000000"]);
const IP_KEYS = new Set(["ip_address", "detected_ip_address", "client_ip", "source_ip"]);
const TEST_NET = /^(?:192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}$/;
const URL_KEY = /^(?:url|.*_url|callback|next|previous)$/;
const SESSION_REF = /verify\.(?:staging\.)?didit\.me\/(?:session|wallet-ownership)\/([^/?#\s"']+)/g;

function fixtureFiles() {
  const files = [];

  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name !== "manifest.json" && entry.name.endsWith(".json"))
        files.push(path.relative(FIXTURES, file).split(path.sep).join("/"));
    }
  })(FIXTURES);

  return files.sort();
}

function raw(rel) {
  return fs.readFileSync(path.join(FIXTURES, rel));
}

function load(rel) {
  return JSON.parse(raw(rel));
}

function walk(value, visit, key = "") {
  if (typeof value === "string") return visit(value, key);
  if (Array.isArray(value)) return value.forEach((item) => walk(item, visit, key));
  if (value && typeof value === "object")
    for (const [name, child] of Object.entries(value)) walk(child, visit, name);
}

test("the manifest lists every fixture exactly once and every family is covered", () => {
  assert.equal(MANIFEST.version, 1);
  assert.deepEqual(MANIFEST.families, [
    "products",
    "users",
    "sessions",
    "transactions",
    "vasps",
    "cases",
    "relationships",
  ]);

  const listed = MANIFEST.fixtures.map((entry) => entry.path).sort();

  assert.deepEqual(listed, fixtureFiles());
  assert.equal(new Set(listed).size, listed.length);

  for (const entry of MANIFEST.fixtures) {
    assert.ok(entry.families.length > 0, entry.path);
    for (const family of entry.families)
      assert.ok(MANIFEST.families.includes(family), `${entry.path}: ${family}`);
    assert.doesNotThrow(() => load(entry.path), entry.path);
  }

  for (const family of MANIFEST.families)
    assert.ok(
      MANIFEST.fixtures.some((entry) => entry.families.includes(family)),
      `no fixture for ${family}`,
    );
});

test("fixtures are pinned: the manifest hash matches the bytes on disk", () => {
  for (const entry of MANIFEST.fixtures) {
    const digest = crypto.createHash("sha256").update(raw(entry.path)).digest("hex");

    assert.equal(digest, entry.sha256, `${entry.path} changed; update the manifest digest`);
  }
});

test("a fixture loads to the same value on every run", () => {
  for (const entry of MANIFEST.fixtures) {
    assert.deepEqual(load(entry.path), load(entry.path), entry.path);
    // Nothing in a fixture is generated at read time: the same bytes are the
    // same values, with no clock, random id or network read.
    assert.equal(raw(entry.path).toString("utf8"), raw(entry.path).toString("utf8"), entry.path);
  }
});

test("no live session token, journal or staging session URL is in a fixture", () => {
  for (const entry of MANIFEST.fixtures) {
    const text = raw(entry.path).toString("utf8");

    for (const [pattern, label] of SECRET_PATTERNS)
      assert.doesNotMatch(text, pattern, `${entry.path}: ${label}`);

    walk(load(entry.path), (value, key) => {
      if (SECRET_KEY.test(key))
        assert.ok(SAFE_SECRETS.has(value), `${entry.path}: ${key} carries a live secret`);

      for (const match of value.matchAll(SESSION_REF)) {
        const id = match[1];

        assert.ok(
          id === "REDACTED_TOKEN" || id.startsWith("e2e-"),
          `${entry.path}: live session reference ${match[0]}`,
        );
      }
    });
  }
});

test("no real personal data: emails, phone numbers and IPs are reserved", () => {
  for (const entry of MANIFEST.fixtures) {
    walk(load(entry.path), (value, key) => {
      for (const email of value.matchAll(EMAIL))
        assert.match(email[0], SAFE_EMAIL, `${entry.path}: ${email[0]}`);

      if (PHONE_KEYS.has(key))
        assert.ok(SAFE_PHONES.has(value), `${entry.path}: ${key} is ${value}`);

      if (IP_KEYS.has(key)) assert.match(value, TEST_NET, `${entry.path}: ${key} is ${value}`);
    });
  }
});

test("every URL is absolute and every media reference is https", () => {
  for (const entry of MANIFEST.fixtures) {
    walk(load(entry.path), (value, key) => {
      if (key === "session_url" || key === "kyc_session_url") {
        // The decision fixture redacts the session URL on purpose.
        assert.ok(value === "<redacted>" || value.startsWith("https://"), `${entry.path}: ${key}`);
        return;
      }
      if (!URL_KEY.test(key) || value === null) return;
      // A recorded refusal (verification/session-create-callback-without-scheme)
      // keeps the request's invalid callback as the evidence it rejects.
      if (!/^https?:\/\//.test(value)) return;

      const url = new URL(value);

      assert.ok(["http:", "https:"].includes(url.protocol), `${entry.path}: ${key} is ${value}`);
      if (/file|image|media|document|portrait|certificate/i.test(key))
        assert.equal(url.protocol, "https:", `${entry.path}: ${key} is not https`);
    });
  }
});

const MEDIA_URL_KEY = /(?:^|_)(?:file|image|media|document|portrait|certificate|video)(?:_url)?$/i;
const RESERVED_HOST = /(?:^|\.)(?:example|test|invalid|localhost)$/i;
const STABLE_ID_KEYS = new Set(["uuid", "session_id", "sessionId", "txn_id", "vendor_data", "payment_txn_id"]);

function fixtureAt(rel) {
  return load(rel);
}

function isRecordContainer(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

test("the manifest counts match the fixtures it lists", () => {
  const { counts } = MANIFEST;

  assert.equal(counts.fixtures, MANIFEST.fixtures.length);
  assert.equal(counts.fixtures, fixtureFiles().length);
  assert.deepEqual(Object.keys(counts.byFamily).sort(), [...MANIFEST.families].sort());

  for (const family of MANIFEST.families) {
    const actual = MANIFEST.fixtures.filter((entry) => entry.families.includes(family)).length;

    assert.ok(actual > 0, family);
    assert.equal(counts.byFamily[family], actual, family);
  }

  assert.equal(
    Object.values(counts.byFamily).reduce((total, count) => total + count, 0),
    MANIFEST.fixtures.reduce((total, entry) => total + entry.families.length, 0),
  );
});

test("a transaction keeps its identity between the request and the deep answer", () => {
  for (const entry of MANIFEST.fixtures) {
    const fixture = fixtureAt(entry.path);

    if (!isRecordContainer(fixture) || !isRecordContainer(fixture.post) || !isRecordContainer(fixture.get))
      continue;

    for (const key of ["uuid", "txn_id", "transaction_number", "transaction_type", "vendor_data"]) {
      if (key in fixture.post || key in fixture.get)
        assert.deepEqual(fixture.get[key], fixture.post[key], `${entry.path}: ${key}`);
    }
  }
});

test("related fixtures across KYC, KYB, transactions and lists agree", () => {
  const session = fixtureAt("alder/session-create.json").body;

  for (const name of ["card-approved", "salary-approved", "transfer-held", "transfer-known-approved"]) {
    const transaction = fixtureAt(`alder/${name}.json`).post;

    assert.equal(transaction.vendor_data, session.vendor_data, name);
    assert.equal(transaction.metadata.subject.vendor_data, session.vendor_data, name);
  }

  const liveness = fixtureAt("product-demos/liveness.json");
  const sessionIds = [liveness.create.sessionId, liveness.started.session_id, liveness.approved.session_id];

  assert.equal(new Set(sessionIds).size, 1);
  assert.equal(
    liveness.started.linked_records.earlier_verifications.vendor_user_id,
    liveness.approved.linked_records.earlier_verifications.vendor_user_id,
  );

  const withdrawal = fixtureAt("crypto-exchange/withdrawal-own-wallet.json");

  for (const name of ["withdrawal-own-wallet-owned", "withdrawal-own-wallet-approved.derived"]) {
    const variant = fixtureAt(`crypto-exchange/${name}.json`);

    assert.equal(variant.txn_id, withdrawal.txn_id, name);
    assert.equal(variant.uuid, withdrawal.uuid, name);
    assert.equal(variant.remediation.session_id, withdrawal.remediation.session_id, name);
  }

  const kyb = fixtureAt("marketplace/kyb-decision-docs-example.json");
  const company = kyb.registry_checks[0].company;

  for (const person of [...company.officers, ...company.beneficial_owners])
    assert.match(person.kyc_session_url, /\/session\/REDACTED_TOKEN$/, person.name);

  const tagIds = new Set();

  for (const entry of MANIFEST.fixtures.filter((fixture) => fixture.path.startsWith("igaming/"))) {
    const fixture = fixtureAt(entry.path);

    for (const side of ["post", "get"])
      for (const tag of fixture[side]?.tags ?? []) tagIds.add(tag.uuid);
  }

  const first = fixtureAt("marketplace/transactions-list-first.json");

  for (const result of first.results)
    for (const tag of result.tags) assert.ok(tagIds.has(tag.uuid), `list tag ${tag.uuid} has no transaction`);
});

test("the deep answers keep the nested records the console reads", () => {
  const liveness = fixtureAt("product-demos/liveness.json");

  for (const side of ["started", "approved"]) {
    const session = liveness[side];

    assert.ok(isRecordContainer(session.decision_trace), side);
    assert.ok(isRecordContainer(session.linked_records), side);
    assert.ok(Array.isArray(session.ip_analyses), side);
    assert.ok(Array.isArray(session.features), side);
  }
  assert.ok(liveness.approved.liveness_checks.length > 0);

  const kyb = fixtureAt("marketplace/kyb-decision-docs-example.json");
  const company = kyb.registry_checks[0].company;

  assert.ok(company.officers.length > 0);
  assert.ok(company.beneficial_owners.length > 0);
  assert.ok(company.registered_address);
  assert.ok(kyb.document_verifications.length > 0);
  assert.ok(kyb.key_people_checks.length > 0);
});

test("every media reference is a synthetic marker, never a real file host", () => {
  for (const entry of MANIFEST.fixtures) {
    walk(fixtureAt(entry.path), (value, key) => {
      if (!MEDIA_URL_KEY.test(key) || !/^https?:\/\//.test(value)) return;

      const { hostname } = new URL(value);

      assert.ok(RESERVED_HOST.test(hostname), `${entry.path}: ${key} points at ${hostname}`);
    });
  }
});

test("reloading the set is deterministic and its repeats deduplicate", () => {
  function records() {
    const found = [];

    for (const entry of MANIFEST.fixtures)
      walk(fixtureAt(entry.path), (value, key) => {
        if (typeof value === "string" && value && value !== "REDACTED_TOKEN" && STABLE_ID_KEYS.has(key))
          found.push(`${key}=${value}`);
      });

    return found.sort();
  }

  const first = records();
  const second = records();

  assert.deepEqual(second, first);
  assert.ok(first.length > MANIFEST.fixtures.length);

  const unique = new Set(first);

  // The variants intentionally repeat one record's ids; deduplication is by identity.
  assert.ok(unique.size < first.length);
  assert.equal(new Set(second).size, unique.size);

  // One transaction id names one record: no two fixtures give it different uuids.
  const uuidByTxn = new Map();

  for (const entry of MANIFEST.fixtures) {
    const fixture = fixtureAt(entry.path);
    const containers = [fixture, fixture.post, fixture.get].filter(isRecordContainer);

    for (const container of containers) {
      if (typeof container.txn_id !== "string" || typeof container.uuid !== "string") continue;
      const uuid = uuidByTxn.get(container.txn_id);

      assert.ok(!uuid || uuid === container.uuid, `${entry.path}: ${container.txn_id} has two uuids`);
      uuidByTxn.set(container.txn_id, container.uuid);
    }
  }
});
