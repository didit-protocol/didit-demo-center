import { NextRequest, NextResponse } from "next/server";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";
import { VerificationDecision } from "@/app/types/verification";

function isSessionExpired(createdAt: string): boolean {
  const sessionDate = new Date(createdAt);
  const now = new Date();
  const diffInHours =
    (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);

  return diffInHours > 24;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 },
    );
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
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch decision data");
    }

    const data: VerificationDecision = await response.json();

    if (isSessionExpired(data.created_at)) {
      return NextResponse.json(
        { error: "Session has expired" },
        { status: 410 }
      );
    }

    const { session_number, ...decisionWithoutSessionNumber } = data;

    return NextResponse.json(decisionWithoutSessionNumber);
  } catch (error) {
    console.error("Error in GET /api/verification:", error);

    return NextResponse.json(
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
      return NextResponse.json(
        { error: "Callback URL, vendor data and workflow ID are required" },
        { status: 400 }
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
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create verification session");
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create verification session" },
      { status: 500 },
    );
  }
}
