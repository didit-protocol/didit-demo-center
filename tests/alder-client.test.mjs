// The browser's calls for /fintech (lib/fintech/client.ts): every one has a
// timeout and fails with a sentence, never a status code. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";

const { RouteError, callRoute, fetchTransaction, networkMessage } = await import("../lib/fintech/client.ts");
const { awaitsCustomer, isFinalStatus } = await import("../lib/fintech/alder.ts");

const answer = (body, status = 200) => async () =>
  new Response(body === undefined ? "" : JSON.stringify(body), { status });

test("a route's own error is what the customer reads, with its code", async () => {
  await assert.rejects(
    callRoute("/api/fintech/token", {}, answer({ error: "Payments open once Didit approves your identity check. Finish it first.", code: "locked" }, 403)),
    (error) =>
      error instanceof RouteError &&
      error.status === 403 &&
      error.code === "locked" &&
      error.message.startsWith("Payments open once"),
  );
});

test("an answer with no error says what kind of failure it was, never the status", async () => {
  await assert.rejects(callRoute("/x", {}, answer(undefined, 500)), (error) => {
    assert.equal(error.message, "Something went wrong on our side. Try again in a moment.");
    assert.doesNotMatch(error.message, /500/);

    return true;
  });
  await assert.rejects(callRoute("/x", {}, answer(undefined, 404)), /That did not work/);
});

test("no answer at all: a timeout and an offline browser read differently", async () => {
  // A request that never answers. AbortSignal.timeout's timer does not keep
  // Node alive on its own, so this one does until the abort lands.
  const timeout = async (_url, init) =>
    new Promise((_resolve, reject) => {
      const alive = setTimeout(() => undefined, 5_000);

      init.signal.addEventListener("abort", () => {
        clearTimeout(alive);
        reject(init.signal.reason);
      });
    });

  await assert.rejects(callRoute("/x", {}, timeout, 10), (error) => {
    assert.equal(error.status, 0);
    assert.match(error.message, /taking too long/);

    return true;
  });
  await assert.rejects(
    callRoute("/x", {}, async () => {
      throw new TypeError("Failed to fetch");
    }),
    /Alder could not be reached/,
  );
  assert.match(networkMessage(new DOMException("x", "TimeoutError")), /too long/);
});

test("every route call carries a timeout and the JSON header", async () => {
  let seen;

  await callRoute("/api/fintech/customer", { method: "POST" }, async (url, init) => {
    seen = init;

    return Response.json({ customerId: "alder-1" });
  });
  assert.ok(seen.signal instanceof AbortSignal);
  assert.equal(seen.headers["Content-Type"], "application/json");
  assert.equal(seen.method, "POST");
});

test("a payment is read back with the customer's token, and a failed read is null, not an error", async () => {
  let seen;
  const token = { token: "sdk-1", baseUrl: "https://verification.staging.didit.me" };
  const read = await fetchTransaction(token, "00000000-0000-4000-8000-000000000001", async (url, init) => {
    seen = { url, init };

    return Response.json({ uuid: "00000000-0000-4000-8000-000000000001", status: "APPROVED" });
  });

  assert.equal(read.status, "APPROVED");
  assert.equal(seen.url, "https://verification.staging.didit.me/v1/transactions/00000000-0000-4000-8000-000000000001/");
  assert.equal(seen.init.headers["X-Transaction-Token"], "sdk-1");
  assert.ok(seen.init.signal instanceof AbortSignal);

  assert.equal(await fetchTransaction(token, "a/../b", async (url) => {
    assert.ok(url.endsWith("/v1/transactions/a%2F..%2Fb/"));

    return Response.json({ detail: "Not found." }, { status: 404 });
  }), null);
  assert.equal(await fetchTransaction(token, "x", async () => {
    throw new TypeError("Failed to fetch");
  }), null);
});

test("session statuses: which stop polling and which wait on the customer", () => {
  for (const status of ["Approved", "Declined", "In Review", "Expired", "Kyc Expired", "Abandoned"])
    assert.ok(isFinalStatus(status), status);
  for (const status of ["Not Started", "In Progress", "Awaiting User", "Resubmitted"])
    assert.ok(!isFinalStatus(status), status);
  // These continue on the same hosted link instead of a new session.
  for (const status of ["Not Started", "Awaiting User", "Resubmitted"]) assert.ok(awaitsCustomer(status), status);
  assert.ok(!awaitsCustomer("In Progress"));
});
