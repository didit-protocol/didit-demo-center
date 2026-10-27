// Shared by the marketplace tests: recorded staging responses and a fake
// Didit API that serves them and records every request it receives.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/marketplace",
);

/** A recorded response (tokens replaced by REDACTED_TOKEN when recorded). */
export function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
}

/** The identities the recorded transactions belong to. */
export const RECORDED = {
  firstShop: "mkt-seller-9e7b751f882f",
  secondShop: "mkt-seller-3628d6dddc2a",
  buyer: "mkt-buyer-cbaffda12112",
  signupApproved: "66ef27fd-09ae-494c-a5ae-9b4a81bfeab4",
  signupHeld: "1853582d-b64d-441e-9841-5604bbc57356",
  orderApproved: "0eb2e39d-02fa-4504-8f6a-f69dc369c479",
  orderAwaiting: "06dbbf52-e4bc-4b6a-8282-c049f1761650",
  heldParty: "84481707-bfe1-4f07-bda6-e155888ac0af",
  orgId: "fe668b65-677a-423a-a5c0-8479e59dcbba",
  appId: "a5f3bca2-46e2-411e-90ef-a580900a57ee",
};

export const API = "https://verification.staging.didit.me";

/**
 * routes: { "GET /v3/...": body | [status, body] | (request) => [status, body] }.
 * Unknown routes answer 404 so a test fails loudly on an unexpected call.
 */
export function fakeApi(routes) {
  const calls = [];

  const fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    const pathname = url.replace(API, "");
    const body = init.body ? JSON.parse(init.body) : undefined;
    const call = { method, path: pathname, body, headers: init.headers };

    calls.push(call);

    const route = routes[`${method} ${pathname}`];

    if (route === undefined) {
      return new Response(JSON.stringify({ detail: "Not found." }), {
        status: 404,
      });
    }

    const [status, payload] =
      typeof route === "function"
        ? route(call)
        : Array.isArray(route) && typeof route[0] === "number"
          ? route
          : [200, route];

    return new Response(JSON.stringify(payload), { status });
  };

  return { fetch, calls };
}

export const TEST_KEY = "test-api-key-not-a-real-one";

let counter = 0;

export function makeEnv(overrides = {}) {
  return {
    apiKey: TEST_KEY,
    apiBase: API,
    isStaging: true,
    workflows: {
      kyb: "11111111-2222-4333-8444-555555555555",
      age: "8482aee5-38b8-46fd-914b-e1bc6edcadca",
      person: "2db28cd2-7713-405f-89ad-144613b7086e",
    },
    console: {
      origin: "https://business.staging.didit.me",
      orgId: null,
      appId: null,
    },
    fetch: async () => new Response("{}", { status: 500 }),
    now: () => Date.UTC(2026, 9, 13, 22, 0, 0),
    newId: () =>
      `0000000${(counter += 1).toString(16)}`.slice(-8) +
      "-aaaa-4bbb-8ccc-dddddddddddd",
    ...overrides,
  };
}

export function stateWith(overrides = {}) {
  return {
    v: 1,
    buyer: null,
    sellers: [],
    tx: [],
    at: Date.UTC(2026, 9, 13, 21, 0, 0),
    ...overrides,
  };
}

export function seller(id, extra = {}) {
  return {
    id,
    shop: "Atelier Nord",
    company: "Acme Corporation Limited",
    country: "GB",
    sid: null,
    signup: null,
    ...extra,
  };
}
