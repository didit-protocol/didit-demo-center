import { NextRequest, NextResponse } from "next/server";

import { BASE_URL } from "@/lib/auth-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const action = searchParams.get("action");
  const sessionToken = searchParams.get("sessionToken");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 },
    );
  }

  try {
    if (action === "status") {
      if (!sessionToken) {
        return NextResponse.json(
          { error: "Session Token is required for status check" },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${BASE_URL}/auth/v2/session/${sessionId}/status/`,
        {
          method: "GET",
          headers: {
            "X-Api-Key": process.env.API_KEY || "",
            "Data-Session-Token": sessionToken,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch session status");
      }

      const statusData = await response.json();

      return NextResponse.json(statusData);
    } else {
      // Existing code for fetching decision data
      const response = await fetch(
        `${BASE_URL}/auth/v2/session/${sessionId}/decision/`,
        {
          method: "GET",
          headers: {
            "X-Api-Key": process.env.API_KEY || "",
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();

      return NextResponse.json(data);
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch auth data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BASE_URL}/auth/v2/session/`, {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
