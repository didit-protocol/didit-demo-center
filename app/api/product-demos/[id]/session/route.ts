import { NextRequest, NextResponse } from "next/server";

import { authEnabled, visitorVendorData } from "@/lib/didit/auth";
import { getProductDemo } from "@/lib/product-demos/demos";
import {
  VENDOR_PREFIX,
  VISITOR_COOKIE,
  newVisitorId,
  readSession,
  startSession,
  vendorFor,
} from "@/lib/product-demos/server";

export const dynamic = "force-dynamic";

/**
 * A live product demo's session: POST creates it for this visitor with the
 * demo's own workflow, GET `?sessionId=` reads its decision back. Thin: the
 * work is in lib/product-demos/server.ts.
 */

type Params = { params: Promise<{ id: string }> };

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function liveDemo({ params }: Params) {
  const demo = getProductDemo((await params).id);

  return demo?.mode === "live" ? demo : null;
}

/** The signed-in Didit user, else the cookie's visitor id. */
async function visitor(request: NextRequest) {
  const signedIn = authEnabled()
    ? await visitorVendorData(VENDOR_PREFIX)
    : null;

  if (signedIn) return { vendorData: signedIn, cookie: null };
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const known = vendorFor(existing);

  if (known) return { vendorData: known, cookie: null };
  const fresh = newVisitorId();

  return { vendorData: vendorFor(fresh) as string, cookie: fresh };
}

export async function POST(request: NextRequest, context: Params) {
  const demo = await liveDemo(context);

  if (!demo) return reply({ error: "No live demo has that id." }, 404);
  const body = (await request.json().catch(() => ({}))) as {
    portrait?: unknown;
  };
  const who = await visitor(request);
  const answer = await startSession(demo, who.vendorData, body);
  const response = reply(answer.body, answer.status);

  if (who.cookie)
    response.cookies.set(VISITOR_COOKIE, who.cookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

  return response;
}

export async function GET(request: NextRequest, context: Params) {
  const demo = await liveDemo(context);

  if (!demo) return reply({ error: "No live demo has that id." }, 404);
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
  const who = await visitor(request);

  if (who.cookie)
    return reply({ error: "No session of yours has that id." }, 404);
  const answer = await readSession(sessionId, who.vendorData);

  return reply(answer.body, answer.status);
}
