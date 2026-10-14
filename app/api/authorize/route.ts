import { NextRequest, NextResponse } from "next/server";

import { BASE_URL } from "@/lib/auth-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const redirectUri = searchParams.get("redirect_uri");
    const responseType = searchParams.get("response_type");
    const scope = searchParams.get("scope");
    const state = searchParams.get("state");
    const nonce = searchParams.get("nonce");

    const url = new URL(`${BASE_URL}/auth/v2/authorize`);

    url.searchParams.append("client_id", clientId || "");
    url.searchParams.append("redirect_uri", redirectUri || "");
    url.searchParams.append("response_type", responseType || "");
    url.searchParams.append("scope", scope || "");
    url.searchParams.append("state", state || "");
    url.searchParams.append("nonce", nonce || "");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to authorize");
    }

    const sessionData = await response.json();

    return NextResponse.json(sessionData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create signin session" },
      { status: 500 },
    );
  }
}
