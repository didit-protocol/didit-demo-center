// lib/didit: keeping the Authentication session alive, readable sign-in
// errors and the console's in-progress labels. Run with `npm test`.
//
// The keeper runs on a fake clock: time is advanced past the access token's
// expiry to pin that it renews before then, and signs the visitor out when
// the renewal is refused.
import test from "node:test";
import assert from "node:assert/strict";

await import("./helpers/register.mjs");

const keeper = await import("../lib/didit/session-keeper.ts");
const { authErrorMessage } = await import("../lib/didit/auth-errors.ts");
const { IN_PROGRESS, isOpenSession, startedLabel } = await import(
  "../lib/didit/console.ts"
);

const MINUTE = 60_000;

/** A fake clock and an access token that lives ten minutes per rotation. */
function harness({ renewal = "ok" } = {}) {
  let now = 0;
  let timers = [];
  const calls = [];
  let signedOut = 0;
  let expiresAt = 10 * MINUTE;
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  const env = {
    now: () => now,
    setTimer: (run, ms) => {
      const timer = { at: now + ms, run };

      timers.push(timer);

      return timer;
    },
    clearTimer: (timer) => {
      timers = timers.filter((item) => item !== timer);
    },
    read: async () => {
      calls.push(["read", now]);

      return { signedIn: now < expiresAt, expiresAt };
    },
    renew: async () => {
      calls.push(["renew", now]);
      if (renewal === "offline") throw new TypeError("Failed to fetch");
      if (renewal === "refused" || now >= expiresAt)
        return { signedIn: false, expiresAt: null };
      expiresAt = now + 10 * MINUTE;

      return { signedIn: true, expiresAt };
    },
    onSignedOut: () => {
      signedOut += 1;
    },
  };

  /** Moves the clock forward, firing every timer that falls due. */
  async function advance(ms) {
    const end = now + ms;

    await flush();
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];

      if (!next || next.at > end) break;
      timers.shift();
      now = next.at;
      next.run();
      await flush();
    }
    now = end;
  }

  return {
    env,
    advance,
    calls,
    get signedOut() {
      return signedOut;
    },
    get expiresAt() {
      return expiresAt;
    },
  };
}

test("renews a minute before the access token expires, so it never lapses", async () => {
  const run = harness();
  const stop = keeper.keepSession(run.env);

  // Thirty-five minutes: three and a half lifetimes of the first token.
  await run.advance(35 * MINUTE);
  stop();

  const renewals = run.calls.filter(([kind]) => kind === "renew");

  assert.ok(renewals.length >= 3);
  // Every renewal happened while the token in hand was still valid.
  let valid = 10 * MINUTE;

  for (const [, at] of renewals) {
    assert.ok(at < valid, `renewed at ${at} after expiry ${valid}`);
    valid = at + 10 * MINUTE;
  }
  assert.equal(run.signedOut, 0);
  assert.ok(run.expiresAt > 35 * MINUTE);
});

test("a refused renewal signs the visitor out once", async () => {
  const run = harness({ renewal: "refused" });

  keeper.keepSession(run.env);
  await run.advance(11 * MINUTE);

  assert.equal(run.signedOut, 1);
  // Nothing else is scheduled after the sign-out.
  await run.advance(30 * MINUTE);
  assert.equal(run.calls.filter(([kind]) => kind === "renew").length, 1);
});

test("an unreachable Didit retries instead of signing out", async () => {
  const run = harness({ renewal: "offline" });

  keeper.keepSession(run.env);
  await run.advance(10 * MINUTE - 1);

  assert.equal(run.signedOut, 0);
  assert.ok(run.calls.filter(([kind]) => kind === "renew").length >= 2);
});

test("an unknown expiry renews every four minutes; stop ends the keeper", async () => {
  assert.equal(keeper.renewDelay(null, 0), 4 * MINUTE);
  assert.equal(keeper.renewDelay(10 * MINUTE, 0), 4 * MINUTE);
  assert.equal(keeper.renewDelay(10 * MINUTE, 8 * MINUTE), MINUTE);
  assert.equal(keeper.renewDelay(10 * MINUTE, 9.5 * MINUTE), 0);

  const run = harness();
  const stop = keeper.keepSession(run.env);

  await run.advance(1);
  stop();
  await run.advance(60 * MINUTE);
  assert.deepEqual(
    run.calls.map(([kind]) => kind),
    ["read"],
  );
});

test("a session already over on load signs out without renewing", async () => {
  const run = harness();

  run.env.read = async () => ({ signedIn: false, expiresAt: null });
  keeper.keepSession(run.env);
  await run.advance(1);

  assert.equal(run.signedOut, 1);
});

test("Authentication errors read as sentences, never as codes", () => {
  const error = (code, extra = {}) =>
    Object.assign(new Error(`raw ${code}`), { code, ...extra });
  const cases = [
    [error("method_unavailable"), "start", /not available here/],
    [error("invalid_grant"), "verify", /did not work or has expired/],
    [error("rate_limited", { retryAfter: 90 }), "start", /Wait 2 minutes/],
    [error("rate_limited"), "verify", /Wait a minute/],
    [new TypeError("Failed to fetch"), "start", /could not be reached/],
    [
      new Error("[didit-auth] Completing the sign-in failed with 400."),
      "verify",
      /did not work or has expired/,
    ],
    [Object.assign(new Error("x"), { status: 429 }), "start", /Too many/],
    [error("something_new"), "start", /could not be sent/],
    [null, "verify", /did not work/],
  ];

  for (const [input, step, expected] of cases) {
    const sentence = authErrorMessage(input, step);

    assert.match(sentence, expected);
    assert.doesNotMatch(sentence, /_|\[didit-auth\]|raw /);
    assert.doesNotMatch(sentence, /\u2014/);
  }
});

test("an open session is in progress with its started time", () => {
  assert.deepEqual(IN_PROGRESS, { label: "In progress", tone: "rev" });
  assert.equal(isOpenSession("Not Started"), true);
  assert.equal(isOpenSession("In Progress"), true);
  assert.equal(isOpenSession("Approved"), false);
  assert.equal(isOpenSession(null), false);
  assert.match(startedLabel("2026-10-28T16:48:00Z"), /^Started 28 Oct, \d\d:\d\d$/);
  assert.equal(startedLabel(null), "Started just now");
  assert.equal(startedLabel("nope"), "Started just now");
});
