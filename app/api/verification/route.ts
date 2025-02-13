import { NextRequest, NextResponse } from "next/server";

import { getClientToken } from "@/app/api/utils";
import { VERIFICATION_BASE_URL } from "@/lib/auth-service";

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
    const clientToken = await getClientToken();
    const response = await fetch(
      `${VERIFICATION_BASE_URL}/v1/session/${sessionId}/decision/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clientToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch decision data");
    }

    const data = await response.json();

    if (isSessionExpired(data.created_at)) {
      return NextResponse.json(
        { error: "Session has expired" },
        { status: 410 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch verification data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientToken = await getClientToken();
    const body = await request.json();

    // Validate required fields
    if (!body.callback || !body.vendor_data) {
      return NextResponse.json(
        { error: "Callback URL and vendor data are required" },
        { status: 400 },
      );
    }

    const response = await fetch(`${VERIFICATION_BASE_URL}/v1/session/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        vendor_data: body.vendor_data,
        callback: body.callback,
        features: body.features, // Optional
      }).toString(),
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
