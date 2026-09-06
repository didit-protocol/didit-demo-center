import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";

/**
 * The demo centre's own session route.
 *
 * It exists so the API key never reaches the browser: the catalogue POSTs here,
 * this handler adds `x-api-key` and calls the real Didit API. Every hosted demo
 * on the site runs through it, and so do /accs, /ibeta and the CAPTCHA widget.
 *
 * Both calls speak v3 - the version the API reference documents and the version
 * every snippet in the catalogue hands a developer, so what they copy is what
 * this app actually did.
 */
const V3 = `${VERIFICATION_BASE_URL}/v3`;

/** Only the fields this route itself reads off the decision. */
type DecisionEnvelope = {
  created_at: string;
  session_number?: number;
};

function isSessionExpired(createdAt: string): boolean {
  const sessionDate = new Date(createdAt);
  const now = new Date();
  const diffInMinutes = (now.getTime() - sessionDate.getTime()) / (1000 * 60);

  // Demo policy: sessions accessible for 60 minutes
  return diffInMinutes > 60;
}

function withNoStore<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as any, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      ...(init?.headers || {}),
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return withNoStore({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${V3}/session/${sessionId}/decision/`, {
      method: "GET",
      headers: {
        "X-Api-Key": process.env.API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return withNoStore(
        {
          error:
            response.status === 404
              ? "No decision found for this session id."
              : "The decision could not be fetched from the verification API.",
        },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    const data: DecisionEnvelope = await response.json();

    if (isSessionExpired(data.created_at)) {
      return withNoStore(
        { error: "Session results have expired" },
        { status: 410 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_number, ...decisionWithoutSessionNumber } = data;

    return withNoStore(decisionWithoutSessionNumber);
  } catch (error) {
    console.error("Error in GET /api/verification:", error);

    return withNoStore(
      { error: "Failed to fetch verification data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.callback || !body.vendor_data || !body.workflow_id) {
      return withNoStore(
        { error: "Callback URL, vendor data and workflow ID are required" },
        { status: 400 },
      );
    }

    const response = await fetch(`${V3}/session/`, {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: body.workflow_id,
        vendor_data: body.vendor_data,
        callback: body.callback,
        callback_method: "both",
        ...(body.portrait_image ? { portrait_image: body.portrait_image } : {}),
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      // Surface the API's own message so the catalogue can say WHY a session
      // could not be created (unpublished workflow, no balance, bad portrait)
      // instead of a generic failure.
      const detail =
        (result && (result.detail || result.error || result.message)) ||
        "Failed to create verification session";

      return withNoStore(
        { error: String(detail) },
        { status: response.status },
      );
    }

    return withNoStore(result);
  } catch (error) {
    console.error("Error in POST /api/verification:", error);

    return withNoStore(
      { error: "Failed to create verification session" },
      { status: 500 },
    );
  }
}
