// scripts/check-published-urls.mjs keeps data/published-urls.json append-only:
// against a fixture repository, dropping an entry fails, adding one passes, and
// a base without the list has nothing to compare. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts/check-published-urls.mjs");
const LIST = { _comment: "x", paths: ["/", "/igaming"], legacyDemoIds: ["kyb"] };

function repo(t, list) {
  const root = mkdtempSync(path.join(os.tmpdir(), "published-urls-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  mkdirSync(path.join(root, "data"));
  writeFileSync(path.join(root, "README.md"), "fixture\n");
  if (list) writeFileSync(path.join(root, "data/published-urls.json"), JSON.stringify(list));
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, base: git("rev-parse", "HEAD").trim() };
}

const write = (root, list) => writeFileSync(path.join(root, "data/published-urls.json"), JSON.stringify(list));
const check = (root, base) => {
  const result = spawnSync(process.execPath, [SCRIPT, "--root", root, "--base", base], { encoding: "utf8" });
  return { code: result.status, out: result.stdout + result.stderr };
};

test("passes when the list is unchanged or grows", (t) => {
  const { root, base } = repo(t, LIST);
  assert.equal(check(root, base).code, 0);
  write(root, { ...LIST, paths: [...LIST.paths, "/fintech"] });
  assert.equal(check(root, base).code, 0);
});

test("fails and names the path when an entry is dropped", (t) => {
  const { root, base } = repo(t, LIST);
  write(root, { ...LIST, legacyDemoIds: [] });
  const { code, out } = check(root, base);
  assert.equal(code, 1);
  assert.match(out, /kyb/);
});

test("has nothing to compare when the base has no list yet", (t) => {
  const { root, base } = repo(t, null);
  write(root, LIST);
  assert.equal(check(root, base).code, 0);
});
