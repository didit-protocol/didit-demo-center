import type { Page, Route } from "@playwright/test";

import fs from "node:fs";
import path from "node:path";

import { projectSession } from "../lib/igaming/records";

/**
 * The Didit side of /fintech (Alder) for the E2E suite.
 *
 * Transactions come from tests/fixtures/alder: real `POST /v1/transactions/`
 * answers (`post`) and reads (`get`) recorded on the staging demo
 * application for one synthetic customer, against the rules
 * `npm run fintech:setup` installs. Session decisions and the security
 * event's answer are derived from the fields docs.didit.me documents,
 * because the sandbox cannot pass a liveness check and event ingestion is
 * not switched on for the staging application. Didit's hosted flow is
 * replaced by a stand-in page that reports completion with a postMessage.
 *
 * Authentication is off in this suite (no publishable key), which is the
 * production path today: Alder's own sign-up creates the customer.
 */

const FIXTURES = path.join(__dirname, "..", "tests", "fixtures", "alder");
// The app builds for staging from .env; set NEXT_PUBLIC_IS_STAGING=false for a production build.
const STAGING = process.env.NEXT_PUBLIC_IS_STAGING !== "false";
const API = STAGING
  ? "https://verification.staging.didit.me"
  : "https://verification.didit.me";
const VERIFY = STAGING
  ? "https://verify.staging.didit.me"
  : "https://verify.didit.me";

export const CUSTOMER = "alder-0f3a9c21d4e85b7a6c19e2d0";

type Recording = {
  post?: Record<string, unknown>;
  get: Record<string, unknown>;
};

export function recording(name: string): Recording {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES, `${name}.json`), "utf8"),
  );
}

const ONBOARDING_SESSION = String(
  (recording("session-create") as unknown as { body: { session_id: string } })
    .body.session_id,
);

/** The step-up session the held transfer's `action_required` opens. */
export const STEP_UP_SESSION = String(
  (recording("transfer-held").post?.action_required as { session_id: string })
    .session_id,
);

/**
 * The onboarding (KYC + AML), in the fields docs.didit.me documents:
 * Approved once finished, In Progress before.
 */
function onboardingDecision(finished = true) {
  if (!finished)
    return {
      session_id: ONBOARDING_SESSION,
      status: "In Progress",
      vendor_data: CUSTOMER,
    };

  return {
    session_id: ONBOARDING_SESSION,
    status: "Approved",
    vendor_data: CUSTOMER,
    workflow_id: STAGING
      ? "c076a8bb-b0a1-482a-a257-c296391fac2f"
      : "205ef0c6-8efd-49a2-b99e-af9d5d5ecb23",
    id_verifications: [
      {
        status: "Approved",
        first_name: "Lena",
        last_name: "Fischer",
        document_type: "Identity Card",
        issuing_state_name: "Germany",
        age: 34,
      },
    ],
    liveness_checks: [{ status: "Approved", score: 98.7 }],
    face_matches: [{ status: "Approved", score: 97.9 }],
    aml_screenings: [{ status: "Approved", total_hits: 0 }],
    ip_analyses: [
      {
        ip_country: "Germany",
        ip_country_code: "DE",
        is_vpn_or_tor: false,
        is_data_center: false,
      },
    ],
  };
}

function stepUpDecision() {
  return {
    session_id: STEP_UP_SESSION,
    status: "Approved",
    vendor_data: CUSTOMER,
    workflow_id: null,
    liveness_checks: [{ status: "Approved", score: 99.1 }],
    face_matches: [{ status: "Approved", score: 98.4 }],
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

export interface AlderMock {
  /** Every transaction submitted, by the fixture it answered with. */
  submitted: string[];
  /** Bodies posted to the transactions lane, to check what the browser sent. */
  bodies: Record<string, unknown>[];
  /** Headers of those posts (the device data the SDK attaches). */
  headers: Record<string, string>[];
  /** Security events the bank reported. */
  events: Record<string, unknown>[];
}

export interface AlderMockOptions {
  /**
   * Start with an account already open and its onboarding session created
   * but not finished, the way a Didit sign-up leaves it: no name yet, only
   * the email. Its decision reads In Progress until the visitor finishes it.
   */
  pendingOnboarding?: {
    email: string;
    startedAt: number;
    /** The customer finished it elsewhere (a phone, another tab). */
    finishedElsewhere?: boolean;
  };
  /** Alder's onboarding route answers that Didit could not be reached. */
  diditDown?: boolean;
}

export async function mockAlder(
  page: Page,
  options: AlderMockOptions = {},
): Promise<AlderMock> {
  const mock: AlderMock = {
    submitted: [],
    bodies: [],
    headers: [],
    events: [],
  };
  const pending = options.pendingOnboarding;
  let customer = Boolean(pending);
  let stepUpDone = false;
  let onboardingDone = Boolean(pending?.finishedElsewhere);
  const records = new Map<string, Record<string, unknown>>();
  let count = 0;

  if (pending) {
    // use-alder's saved state (localStorage "alder-demo:v1"), set before
    // the app reads it.
    await page.addInitScript(
      (stored) => {
        if (!window.localStorage.getItem("alder-demo:v1"))
          window.localStorage.setItem("alder-demo:v1", JSON.stringify(stored));
      },
      {
        version: 1,
        customerId: CUSTOMER,
        name: "",
        email: pending.email,
        phone: "",
        createdAt: pending.startedAt,
        onboarding: {
          sessionId: ONBOARDING_SESSION,
          url: `${VERIFY}/session/e2e-onboarding`,
          summary: null,
          startedAt: pending.startedAt,
        },
        stepUp: null,
        activity: [],
        seeded: false,
        takeover: null,
      },
    );
  }

  await page.route("**/api/fintech/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;

    if (key === "GET /api/fintech/customer")
      return json(route, {
        customerId: customer ? CUSTOMER : null,
        authenticated: false,
      });
    if (key === "POST /api/fintech/customer") {
      customer = true;

      return json(route, { customerId: CUSTOMER });
    }
    if (key === "POST /api/fintech/onboarding" && options.diditDown)
      return json(
        route,
        {
          error: "The Didit API could not be reached.",
          didit: [{ method: "POST", path: "/v3/session/", status: 0 }],
        },
        502,
      );
    if (key === "POST /api/fintech/onboarding")
      return json(route, {
        sessionId: ONBOARDING_SESSION,
        url: `${VERIFY}/session/e2e-onboarding`,
        didit: [{ method: "POST", path: "/v3/session/", status: 201 }],
      });
    if (key.startsWith("GET /api/fintech/sessions/")) {
      const id = url.pathname.split("/").pop() ?? "";
      const decision =
        id === STEP_UP_SESSION
          ? stepUpDecision()
          : onboardingDecision(onboardingDone);

      return json(route, {
        session: projectSession(decision, CUSTOMER),
        didit: [],
      });
    }
    if (key === "POST /api/fintech/token")
      return json(route, {
        token: "e2e-token",
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        baseUrl: API,
        didit: [],
      });
    if (key === "POST /api/fintech/monitoring-token")
      return json(route, { token: "e2e-monitoring", baseUrl: API, didit: [] });

    return json(route, { error: "unmocked" }, 500);
  });

  // The page's own monitoring token, as the route answers without Didit
  // Authentication: no token and no error, so the console stays clean.
  await page.route("**/api/didit/events-token", (route) =>
    json(route, { token: null, signedIn: false }),
  );

  // The security event: the takeover rule declines it (add_score 90,
  // change_status DECLINED), answered in the batch shape the docs give.
  await page.route(`${API}/v1/events/**`, async (route) => {
    const body = route.request().postDataJSON() as {
      events: Record<string, unknown>[];
    };

    mock.events.push(...body.events);

    return json(
      route,
      {
        results: body.events.map((event, index) => ({
          index,
          outcome: "accepted",
          event_uuid: `00000000-0000-4000-9000-${String(index + 1).padStart(12, "0")}`,
          status:
            event.action_type === "login_failed" ? "DECLINED" : "APPROVED",
          score: event.action_type === "login_failed" ? 90 : 0,
        })),
      },
      202,
    );
  });

  // What the web SDK's submitTransaction posts to, and the reads that follow.
  await page.route(`${API}/v1/transactions/**`, async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      const id =
        new URL(request.url()).pathname.split("/").filter(Boolean).pop() ?? "";
      const stored = records.get(id);

      if (!stored) return json(route, { detail: "Not found." }, 404);
      // The held transfer is released once the step-up is approved.
      if (stepUpDone && stored.status === "AWAITING_USER")
        return json(route, {
          ...stored,
          status: "APPROVED",
          decision_reason_code: "user_action_approved",
          action_required: null,
        });

      return json(route, stored);
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    const info = body.info as Record<string, string>;
    const props = (body.props ?? {}) as Record<string, unknown>;
    const counterparty = (body.counterparty ?? {}) as Record<string, string>;
    const amount = Number(info.amount);
    const name =
      info.type === "transfer"
        ? props.new_payee === true && amount >= 5000
          ? "transfer-held"
          : "transfer-known-approved"
        : info.type === "card_payment"
          ? "card-approved"
          : "salary-approved";

    mock.bodies.push(body);
    mock.headers.push(request.headers());
    mock.submitted.push(name);
    count += 1;
    const fixture = recording(name);
    const uuid = `00000000-0000-4000-8000-${String(count).padStart(12, "0")}`;
    const fields = {
      uuid,
      amount: amount.toFixed(2),
      txn_id: body.txnId,
      txn_date: new Date().toISOString(),
      action_type: info.type,
      vendor_data: CUSTOMER,
      parties: [
        ...(((fixture.get.parties as Record<string, unknown>[]) ?? []).filter(
          (party) => party.role !== "COUNTERPARTY",
        ) as Record<string, unknown>[]),
        { role: "COUNTERPARTY", full_name: counterparty.fullName },
      ],
    };

    records.set(uuid, { ...fixture.get, ...fields });

    return json(route, { ...fixture.post, ...fields }, 201);
  });

  // Didit's hosted verification flow inside the SDK modal.
  await page.route(`${VERIFY}/**`, (route) => {
    const url = route.request().url();

    if (!url.includes("/session/"))
      return route.fulfill({ status: 204, body: "" });
    const onboarding = url.includes("e2e-onboarding");

    if (onboarding) onboardingDone = true;
    else stepUpDone = true;

    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: standInPage(
        onboarding ? "Verify your identity" : "Confirm it is you",
        onboarding ? ONBOARDING_SESSION : STEP_UP_SESSION,
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
