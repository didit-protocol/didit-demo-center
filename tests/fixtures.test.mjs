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
      if (!URL_KEY.test(key) || value === null) return;

      const url = new URL(value);

      assert.ok(["http:", "https:"].includes(url.protocol), `${entry.path}: ${key} is ${value}`);
      if (/file|image|media|document|portrait|certificate/i.test(key))
        assert.equal(url.protocol, "https:", `${entry.path}: ${key} is not https`);
    });
  }
});
