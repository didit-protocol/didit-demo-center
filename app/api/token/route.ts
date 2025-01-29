import { NextRequest, NextResponse } from "next/server";

import { BASE_URL } from "@/lib/auth-service";

const DIDIT_CLIENT_ID = process.env.NEXT_PUBLIC_DIDIT_CLIENT_ID || "";
const DIDIT_CLIENT_SECRET = process.env.DIDIT_CLIENT_SECRET || "";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || "";

    const url = new URL(`${BASE_URL}/auth/v2/token`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(DIDIT_CLIENT_ID + ":" + DIDIT_CLIENT_SECRET)}`,
      },
      body: JSON.stringify({
        code,
        grant_type: "authorization_code",
        redirect_uri: "https://google.com",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange code for access token");
    }

    const tokenData = await response.json();

    return NextResponse.json(tokenData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to exchange code for access token" },
      { status: 500 }
    );
  }
}
