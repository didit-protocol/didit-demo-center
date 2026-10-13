/**
 * Playwright harness for the fintech demo's end-to-end tests.
 *
 * `installFintechApi(page, didit)` answers the browser's /api/fintech/* calls
 * IN-PROCESS with the very handlers the Next routes run (lib/fintech/server.ts),
 * keeping the account cookie's state in memory. What changes between tests is
 * only the Didit behind those handlers:
 *
 * - `recordedDidit()` serves the responses recorded from Didit staging under
 *   tests/fixtures/fintech - no network, deterministic screens;
 * - `stagingDidit()` calls the REAL staging API with the API key from .env,
 *   except the onboarding decision, which a test sets. A sandbox has no ID
 *   document and no camera, so a person can never pass KYC here; everything
 *   after it - transactions, the review rule, the AML monitoring estimate - is
 *   real.
 */
import fs from "node:fs";
import { randomUUID } from "node:crypto";

import {
  createAccount,
  createPayment,
  deleteAccount,
  getAccount,
  listPayments,
  previewMonitoring,
  readVerification,
  startVerification,
} from "../../lib/fintech/server.ts";
import { REVIEW_THRESHOLD } from "../../lib/fintech/model.ts";

export const API = "https://verification.staging.didit.me";

export const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`../fixtures/fintech/${name}.json`, import.meta.url),
      "utf8",
    ),
  );

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Per-check statuses that go with a session status, for the mocked decision. */
const CHECKS = {
  "Not Started": null,
  "In Progress": { id: "Approved", liveness: "Not Finished" },
  Approved: { id: "Approved", liveness: "Approved", face: "Approved", aml: "Approved" },
  "In Review": { id: "Approved", liveness: "Approved", face: "Approved", aml: "In Review" },
  Declined: { id: "Declined", liveness: "Approved", face: "Declined", aml: "Approved" },
  Expired: null,
};

/**
 * The recorded staging decision (session "Not Started") moved to `status`,
 * with matching per-check entries. This is the one mocked Didit answer.
 */
export function decisionWith(status, sessionId) {
  const base = fixture("decision-not-started").response;
  const checks = CHECKS[status] ?? null;
  const list = (s) => (s ? [{ status: s, node_id: "mock" }] : null);

  return {
    ...base,
    session_id: sessionId ?? base.session_id,
    status,
    id_verifications: list(checks?.id),
    liveness_checks: list(checks?.liveness),
    face_matches: list(checks?.face),
    aml_screenings: list(checks?.aml),
  };
}

/**
 * Offline Didit from recordings. `decision.status` is the session status the
 * next decision read returns; a test changes it to play the analyst.
 */
export function recordedDidit({ status = "Not Started" } = {}) {
  const transactions = new Map();
  const decision = { status };
  let number = 4120;

  const fetch = async (url, init = {}) => {
    const path = url.replace(API, "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : null;

    if (method === "POST" && path === "/v3/session/") {
      // The recording redacts the hosted-flow URL (it embeds the session
      // token); point it at the stub flow instead.
      return json(
        { ...fixture("session-create").response, url: RECORDED_FLOW_URL },
        201,
      );
    }
    if (method === "GET" && /\/v3\/session\/[^/]+\/decision\/$/.test(path)) {
      return json(decisionWith(decision.status));
    }
    if (method === "POST" && path === "/v3/transactions/") {
      const details = body.transaction_details;
      const amount = Number(details.amount);
      const name =
        details.direction === "inbound"
          ? "transaction-deposit-approved"
          : amount >= REVIEW_THRESHOLD
            ? "transaction-transfer-held"
            : "transaction-transfer-approved";
      const recorded = fixture(name).response;
      const record = {
        ...recorded,
        uuid: randomUUID(),
        txn_id: body.transaction_id,
        transaction_number: (number += 1),
        txn_date: new Date().toISOString(),
        amount: String(amount),
        vendor_data: body.subject.vendor_data,
        parties: recorded.parties.map((party) =>
          party.role === "COUNTERPARTY"
            ? { ...party, full_name: body.counterparty.full_name }
            : party,
        ),
      };

      transactions.set(record.uuid, record);

      return json(record, 201);
    }
    const txn = path.match(/^\/v3\/transactions\/([^/]+)\/$/);

    if (method === "GET" && txn) {
      const record = transactions.get(txn[1]);

      return record ? json(record) : json({ detail: "Not found." }, 404);
    }
    if (method === "POST" && path === "/v3/users/aml-monitoring/") {
      return json(fixture("aml-monitoring-estimate").response);
    }

    return json({ detail: `unexpected ${method} ${path}` }, 500);
  };

  return {
    fetch,
    decision,
    /** What an analyst's decision in the console does to a held payment. */
    decide(status) {
      for (const record of transactions.values()) {
        if (record.status === "IN_REVIEW") record.status = status;
      }
    },
  };
}

/** Reads API_KEY from .env without ever printing it. */
export function stagingKey() {
  if (process.env.API_KEY) return process.env.API_KEY;
  try {
    const env = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("API_KEY="));

    return line
      ? line
          .slice("API_KEY=".length)
          .trim()
          .replace(/^(["'])(.*)\1$/, "$2")
      : "";
  } catch {
    return "";
  }
}

/**
 * The real staging API, except the onboarding decision's outcome: the real
 * decision is read for the real session, and only its status (and the
 * per-check statuses that go with it) is replaced by `decision.status`.
 */
export function stagingDidit(decision = { status: "Not Started" }) {
  const key = stagingKey();
  const call = (url, init = {}) =>
    globalThis.fetch(url, {
      ...init,
      headers: { ...init.headers, "x-api-key": key },
    });
  const fetch = async (url, init = {}) => {
    const path = url.replace(API, "");
    const match = path.match(/^\/v3\/session\/([^/]+)\/decision\/$/);

    if ((init.method ?? "GET") === "GET" && match && decision.status !== null) {
      const real = await (await call(url, init)).json();
      const set = decisionWith(decision.status, match[1]);

      return json({
        ...real,
        status: set.status,
        id_verifications: set.id_verifications,
        liveness_checks: set.liveness_checks,
        face_matches: set.face_matches,
        aml_screenings: set.aml_screenings,
      });
    }

    return call(url, init);
  };

  return { fetch, decision, hasKey: Boolean(key) };
}

/**
 * Routes the page's /api/fintech/* calls to the real handlers, with `didit`
 * behind them. Returns the in-memory account cookie for assertions.
 */
export async function installFintechApi(page, didit) {
  const jar = { account: null };
  const env = {
    apiKey: "e2e",
    apiBase: API,
    live: true,
    console: {
      origin: "https://business.staging.didit.me",
      orgId: null,
      appId: null,
    },
    fetch: didit.fetch,
    now: () => Date.now(),
    newId: () => randomUUID(),
  };

  await page.route("**/api/fintech/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/fintech/", "");
    const body = request.postData() ? JSON.parse(request.postData()) : null;
    const key = `${request.method()} ${path}`;
    let reply;

    switch (key) {
      case "GET account":
        reply = await getAccount(env, jar.account);
        break;
      case "POST account":
        reply = await createAccount(env, body);
        break;
      case "DELETE account":
        reply = await deleteAccount();
        break;
      case "GET verification":
        reply = await readVerification(env, jar.account);
        break;
      case "POST verification":
        reply = await startVerification(env, jar.account, {
          origin: body?.origin,
          locale: "en",
        });
        break;
      case "GET payments":
        reply = await listPayments(env, jar.account);
        break;
      case "POST payments":
        reply = await createPayment(env, jar.account, body);
        break;
      case "POST monitoring":
        reply = await previewMonitoring(env, jar.account);
        break;
      default:
        reply = { status: 404, body: { error: "not_found" } };
    }

    if (reply.account !== undefined) jar.account = reply.account;

    await route.fulfill({
      status: reply.status,
      contentType: "application/json",
      body: JSON.stringify(reply.body),
    });
  });

  return jar;
}

/** Where the recorded session's hosted flow "lives" in offline tests. */
export const RECORDED_FLOW_URL =
  "https://verify.staging.didit.me/session/e2e-recorded-flow";

/**
 * Stands in for the hosted verification flow, which needs a real ID document
 * and a camera. The page served at the flow's URL (a *.didit.me origin, the
 * only kind the web SDK listens to) posts the message the real flow posts
 * when the person finishes or closes it: `didit:completed` or
 * `didit:cancelled`. Everything around it - the session the app created, the
 * SDK modal, the app's onComplete handling - is the real thing.
 */
export async function stubHostedFlow(page, { outcome = "completed", delay = 600 } = {}) {
  await page.route(/https:\/\/verify\.staging\.didit\.me\/.*/, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body style="font:15px system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#fff;color:#0a0a0a">
<p data-testid="hosted-flow-stub">Hosted verification flow (ID, liveness, face match)</p>
<script>setTimeout(function () {
  parent.postMessage(JSON.stringify({ type: "didit:${outcome}", data: { sessionId: "e2e", status: "Pending" } }), "*");
}, ${delay});</script></body></html>`,
    }),
  );
}
