/**
 * The server half of the live product demos, on the shared Didit client.
 *
 * - `startSession`: `POST /v3/session/` with the demo's own workflow (never
 *   one the browser names) for this visitor.
 * - `readSession`: `GET /v3/session/{id}/decision/`, returned only when the
 *   session belongs to this visitor.
 *
 * The visitor is the signed-in Didit user when Authentication is on, and a
 * random id in an HTTP-only cookie otherwise, so a demo runs without an
 * account. Both handlers take their environment, so `npm test` drives them
 * with a recording fetch.
 */

import type { LiveDemo } from "./define";

import { type DiditCall, type DiditEnv, didit, diditMessage } from "../didit/server";
import { diditUrls, vendorDataFor } from "../didit/config";

export const VISITOR_COOKIE = "didit-demo-visitor";
export const VENDOR_PREFIX = "product-demo-";

/** A fresh visitor id for the cookie. */
export function newVisitorId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** The visitor's `vendor_data`, or null when the id is not one of ours. */
export function vendorFor(visitorId: string | null | undefined): string | null {
  return visitorId ? vendorDataFor(VENDOR_PREFIX, visitorId) : null;
}

export interface Answer {
  status: number;
  body: Record<string, unknown>;
}

const PORTRAIT = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
/** The session endpoint takes a base64 portrait up to 2 MB. */
const MAX_PORTRAIT = Math.ceil((2 * 1024 * 1024 * 4) / 3) + 64;

export async function startSession(
  demo: LiveDemo,
  vendorData: string,
  input: { portrait?: unknown },
  env?: DiditEnv,
): Promise<Answer> {
  if (!demo.workflow)
    return {
      status: 409,
      body: { error: "This demo's workflow is not published on this environment yet." },
    };
  let portrait: string | undefined;

  if (demo.requiresPortrait) {
    if (typeof input.portrait !== "string" || !PORTRAIT.test(input.portrait))
      return { status: 400, body: { error: "Choose a JPEG, PNG or WebP photo first." } };
    if (input.portrait.length > MAX_PORTRAIT)
      return { status: 400, body: { error: "The photo must be 2 MB or smaller." } };
    portrait = input.portrait.slice(input.portrait.indexOf(",") + 1);
  }

  const result = await didit.sessions.create(
    {
      workflowId: demo.workflow,
      vendorData,
      callback: `${diditUrls.site}/product-demos/${demo.id}`,
      metadata: { demo: demo.id },
      ...(portrait ? { portraitImage: portrait } : {}),
    },
    env,
  );
  const calls: DiditCall[] = [result.call];

  if (!result.ok || !result.data?.url)
    return {
      status: result.status === 0 ? 502 : result.status >= 400 ? result.status : 502,
      body: {
        error: diditMessage(result, "The session could not be created."),
        didit: calls,
      },
    };

  return {
    status: 200,
    body: {
      sessionId: result.data.session_id,
      url: result.data.url,
      didit: calls,
    },
  };
}

export async function readSession(
  sessionId: string,
  vendorData: string,
  env?: DiditEnv,
): Promise<Answer> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId))
    return { status: 400, body: { error: "That is not a session id." } };
  const result = await didit.sessions.decision(sessionId, env);
  const calls = [result.call];

  if (!result.ok || !result.data)
    return {
      status: result.status === 404 ? 404 : 502,
      body: { error: diditMessage(result, "The decision could not be read."), didit: calls },
    };
  // Only the visitor who ran the session may read it.
  if (result.data.vendor_data !== vendorData)
    return { status: 404, body: { error: "No session of yours has that id." } };

  return { status: 200, body: { decision: result.data, didit: calls } };
}
