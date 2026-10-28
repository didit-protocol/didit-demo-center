// POST /api/didit/events-token: the signals SDK posts the visitor's events to
// the API of the environment the token was minted on. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

await import("./helpers/register.mjs");

process.env.API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_IS_STAGING = "true";
delete process.env.DIDIT_PUBLISHABLE_KEY;

const { NextRequest } = await import("next/server");
const { PLAYER_COOKIE, signPlayer } = await import("../lib/igaming/player.ts");
const route = await import("../app/api/didit/events-token/route.ts");

const PLAYER = "aurora-play-0123456789abcdef01234567";
const calls = [];

globalThis.fetch = async (url) => {
  calls.push(String(url));

  return Response.json({ monitoring_token: "mt_123", expires_at: null });
};

test("the token comes with the API it belongs to (staging here)", async () => {
  const response = await route.POST(
    new NextRequest("http://localhost:3000/api/didit/events-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${PLAYER_COOKIE}=${signPlayer(PLAYER, "test-api-key")}`,
      },
      body: JSON.stringify({ demo: "aurora-play" }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.token, "mt_123");
  assert.equal(body.baseUrl, "https://verification.staging.didit.me");
  assert.ok(calls[0].startsWith("https://verification.staging.didit.me/"));
});
