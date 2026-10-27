import type { Page, Route } from "@playwright/test";

import fs from "node:fs";
import path from "node:path";

import { projectSession } from "../lib/igaming/records";

/**
 * The Didit side of /igaming (Aurora Play) for the E2E suite.
 *
 * Transactions come from tests/fixtures/igaming: real `submitTransaction`
 * responses (`post`) and transaction reads (`get`) recorded on the staging
 * demo application for two synthetic players on one browser, against the
 * rules `npm run igaming:setup` installs. Session decisions are derived from
 * the fields docs.didit.me documents, because the sandbox cannot pass a
 * liveness check. Didit's hosted flow is replaced by a stand-in page on the
 * same host that reports completion the way it does, with a postMessage.
 *
 * Authentication is off in this suite (no publishable key), which is the
 * production path today: the casino's own sign-up creates the player.
 */

const FIXTURES = path.join(__dirname, "..", "tests", "fixtures", "igaming");
// The app builds for staging from .env; set NEXT_PUBLIC_IS_STAGING=false for a production build.
const STAGING = process.env.NEXT_PUBLIC_IS_STAGING !== "false";
const API = STAGING
  ? "https://verification.staging.didit.me"
  : "https://verification.didit.me";
const VERIFY = STAGING
  ? "https://verify.staging.didit.me"
  : "https://verify.didit.me";

export const PLAYERS = [
  "aurora-play-d1808cd5db4c84d057c140ac",
  "aurora-play-f268a6123b269b6031ac0edf",
];
const AGE_SESSIONS = [
  "8a1f6a52-2c39-4c25-9d7e-0f6f1b9d3e11",
  "8a1f6a52-2c39-4c25-9d7e-0f6f1b9d3e12",
];

type Recording = {
  post: Record<string, unknown>;
  get: Record<string, unknown>;
};

export function recording(name: string): Recording {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES, `${name}.json`), "utf8"),
  );
}

/** The KYC session the held deposit's `action_required` opens. */
export const KYC_SESSION = String(
  (recording("deposit-held").post.action_required as { session_id: string })
    .session_id,
);

/** A finished age check, in the decision fields docs.didit.me documents. */
function ageDecision(sessionId: string, vendor: string) {
  return {
    session_id: sessionId,
    status: "Approved",
    vendor_data: vendor,
    workflow_id: null,
    liveness_checks: [
      { status: "Approved", age_estimation: 27.4, score: 99.4 },
    ],
    id_verifications: [],
    ip_analyses: [
      {
        ip_country: "Malta",
        ip_country_code: "MT",
        is_vpn_or_tor: false,
        is_data_center: false,
      },
    ],
  };
}

/** A finished Core KYC, in the decision fields docs.didit.me documents. */
function kycDecision(vendor: string) {
  return {
    session_id: KYC_SESSION,
    status: "Approved",
    vendor_data: vendor,
    workflow_id: null,
    id_verifications: [
      {
        status: "Approved",
        first_name: "Sofia",
        last_name: "Marin",
        document_type: "Passport",
        issuing_state_name: "Malta",
        age: 27,
      },
    ],
    liveness_checks: [{ status: "Approved", score: 99.4 }],
    face_matches: [{ status: "Approved", score: 98.1 }],
    ip_analyses: [
      {
        ip_country: "Malta",
        ip_country_code: "MT",
        is_vpn_or_tor: false,
        is_data_center: false,
      },
    ],
  };
}

function standInPage(title: string, sessionId: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fff;color:#0a0a0a">
<div style="text-align:center;max-width:280px">
<p style="font-size:18px;font-weight:600;margin:0 0 6px">${title}</p>
<p style="font-size:13px;color:#5d5d5d;margin:0 0 20px">Test stand-in for Didit's hosted page</p>
<button id="complete" style="height:44px;padding:0 22px;border:0;border-radius:999px;background:#2567ff;color:#fff;font-size:14px;cursor:pointer">Complete</button>
</div>
<script>
document.getElementById("complete").onclick = function () {
  parent.postMessage({ type: "didit:completed", data: { sessionId: "${sessionId}", status: "Approved" } }, "*");
};
</script></body></html>`;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });

export interface AuroraMock {
  /** Every transaction submitted, by the fixture it answered with. */
  submitted: string[];
  /** Bodies posted to the device lane, to check what the browser sent. */
  bodies: Record<string, unknown>[];
  /** Headers of those posts (the device data the SDK attaches). */
  headers: Record<string, string>[];
}

export async function mockAurora(page: Page): Promise<AuroraMock> {
  const mock: AuroraMock = { submitted: [], bodies: [], headers: [] };
  let player = -1;
  let kycDone = false;
  const deposits = [0, 0];
  const bonuses = [0, 0];
  const records = new Map<string, Record<string, unknown>>();
  let count = 0;

  const current = () => PLAYERS[Math.max(player, 0)];

  await page.route("**/api/igaming/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;

    if (key === "GET /api/igaming/player")
      return json(route, {
        playerId: player >= 0 ? current() : null,
        authenticated: false,
      });
    if (key === "POST /api/igaming/player") {
      player += 1;

      return json(route, { playerId: current() });
    }
    if (key === "POST /api/igaming/age-check")
      return json(route, {
        sessionId: AGE_SESSIONS[player],
        url: `${VERIFY}/session/e2e-age-${player}`,
        didit: [{ method: "POST", path: "/v3/session/", status: 201 }],
      });
    if (key.startsWith("GET /api/igaming/sessions/")) {
      const id = url.pathname.split("/").pop() ?? "";
      const decision =
        id === KYC_SESSION
          ? kycDecision(current())
          : ageDecision(id, current());

      return json(route, {
        session: projectSession(decision, current()),
        didit: [],
      });
    }
    if (key === "POST /api/igaming/token")
      return json(route, {
        token: `e2e-token-${player}`,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        baseUrl: API,
        didit: [],
      });
    if (key === "POST /api/igaming/verified") {
      kycDone = true;

      return json(route, { verified: true, didit: [] });
    }
    if (key === "GET /api/igaming/operator")
      return json(route, { console: null, player: null, didit: [] });

    return json(route, { error: "unmocked" }, 500);
  });

  // No monitoring token without Didit Authentication on a signed-out page.
  await page.route("**/api/didit/events-token", (route) =>
    json(
      route,
      player >= 0
        ? { token: "e2e-monitoring" }
        : { error: "Nobody is signed in." },
      player >= 0 ? 200 : 401,
    ),
  );
  await page.route(`${API}/v1/events/**`, (route) =>
    json(route, { results: [] }, 202),
  );

  // What the web SDK's submitTransaction posts to, and the reads that follow.
  await page.route(`${API}/v1/transactions/**`, async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      const id =
        new URL(request.url()).pathname.split("/").filter(Boolean).pop() ?? "";
      const stored = records.get(id);

      if (!stored) return json(route, { detail: "Not found." }, 404);
      // The held deposit is released once the ID check is approved.
      if (kycDone && stored.status === "AWAITING_USER")
        return json(route, {
          ...stored,
          status: "APPROVED",
          action_required: null,
        });

      return json(route, stored);
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    const info = body.info as Record<string, string>;
    const kind = info.type;
    const amount = Number(info.amount);
    let name = "deposit-approved";

    mock.bodies.push(body);
    mock.headers.push(request.headers());
    if (kind === "deposit") {
      deposits[player] += amount;
      name = deposits[player] >= 2000 ? "deposit-held" : "deposit-approved";
    } else if (kind === "bonus_claim") {
      bonuses[player] += 1;
      name = player > 0 ? "bonus-shared-device" : "bonus-approved";
    }
    mock.submitted.push(name);
    count += 1;
    const fixture = recording(name);
    const uuid = `00000000-0000-4000-8000-${String(count).padStart(12, "0")}`;
    const amountText = amount.toFixed(2);

    records.set(uuid, {
      ...fixture.get,
      uuid,
      amount: amountText,
      txn_id: body.txnId,
      vendor_data: current(),
    });

    return json(
      route,
      { ...fixture.post, uuid, amount: amountText, txn_id: body.txnId },
      201,
    );
  });

  // Didit's hosted verification flow inside the SDK modal.
  await page.route(`${VERIFY}/**`, (route) => {
    const url = route.request().url();

    if (!url.includes("/session/"))
      return route.fulfill({ status: 204, body: "" });
    const kyc = !url.includes("e2e-age");

    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: standInPage(
        kyc ? "Verify your ID" : "Confirm your age",
        kyc ? KYC_SESSION : AGE_SESSIONS[Math.max(player, 0)],
      ),
    });
  });

  return mock;
}

/** Finishes whatever Didit page the SDK modal is showing. */
export async function completeHostedFlow(page: Page) {
  const frame = page.frameLocator(`iframe[src^="${VERIFY}"]`);

  await frame.getByRole("button", { name: "Complete" }).click();
}
