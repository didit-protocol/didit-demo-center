import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";
import { VerificationDecision } from "@/app/types/verification";

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
    const response = await fetch(
      `${VERIFICATION_BASE_URL}/v2/session/${sessionId}/decision/`,
      {
        method: "GET",
        headers: {
          "X-Api-Key": process.env.API_KEY || "",
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch decision data");
    }

    const data: VerificationDecision = await response.json();

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
      {
        status: 500,
      },
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

    const response = await fetch(`${VERIFICATION_BASE_URL}/v2/session/`, {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: body.workflow_id,
        vendor_data: body.vendor_data,
        callback: body.callback,
        ...(body.portrait_image ? { portrait_image: body.portrait_image } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create verification session");
    }

    const result = await response.json();

    return withNoStore(result);
  } catch (error) {
    return withNoStore(
      { error: "Failed to create verification session" },
      {
        status: 500,
      },
    );
  }
}
