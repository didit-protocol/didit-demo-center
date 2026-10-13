// The fintech demo's copy (messages/fintech/*.json). Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { LOCALES } from "../vendor/didit-website/lib/site.ts";

const dir = new URL("../messages/fintech/", import.meta.url);
const read = (locale) =>
  JSON.parse(fs.readFileSync(new URL(`${locale}.json`, dir), "utf8"));

function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );
}

const placeholders = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = new Map(flatten(read("en")));

test("there is one file per language the site chrome offers, and no other", () => {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

  assert.deepEqual(files, [...LOCALES].sort());
});

for (const locale of LOCALES.filter((l) => l !== "en")) {
  test(`${locale}: same keys and placeholders as English, all translated`, () => {
    const messages = new Map(flatten(read(locale)));

    assert.deepEqual([...messages.keys()].sort(), [...en.keys()].sort());

    // Strings that are names, not copy, stay as they are in every language.
    const sameEverywhere = new Set(["bank.name", "panel.docs", "panel.moduleNames.webhooks"]);
    let identical = 0;

    for (const [key, english] of en) {
      const text = messages.get(key);

      assert.equal(typeof text, "string", `${locale} ${key}`);
      assert.notEqual(text.trim(), "", `${locale} ${key} is empty`);
      assert.deepEqual(
        placeholders(text),
        placeholders(english),
        `${locale} ${key} placeholders`,
      );
      if (text === english && !sameEverywhere.has(key)) identical += 1;
    }

    // A few words are legitimately the same (e.g. "Fintech", "Kestrel"); a
    // file that is mostly English was not translated.
    assert.ok(identical <= 3, `${locale}: ${identical} strings left in English`);
  });
}

test("no em dashes and no unbalanced ICU braces anywhere", () => {
  for (const locale of LOCALES) {
    for (const [key, text] of flatten(read(locale))) {
      assert.doesNotMatch(text, /—/, `${locale} ${key} has an em dash`);
      assert.equal(
        (text.match(/\{/g) ?? []).length,
        (text.match(/\}/g) ?? []).length,
        `${locale} ${key} braces`,
      );
      // An apostrophe right before a brace would quote the placeholder in ICU.
      assert.doesNotMatch(text, /'\{/, `${locale} ${key} quotes a placeholder`);
    }
  }
});
