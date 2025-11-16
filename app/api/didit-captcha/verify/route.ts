import { NextRequest, NextResponse } from "next/server";

import { VERIFICATION_BASE_URL } from "@/lib/auth-service";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return withNoStore({ error: "sessionId is required" }, { status: 400 });
  }

  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return withNoStore(
      { error: "Server is not configured for Didit" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `${VERIFICATION_BASE_URL}/v2/session/${sessionId}/decision/`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-Api-Key": apiKey,
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();

    console.error("Didit decision error", res.status, text);

    return withNoStore(
      { error: "Failed to retrieve Didit decision" },
      { status: 500 },
    );
  }

  const data = await res.json();

  const status: string | undefined = data.status;
  const contactEmail: string | undefined =
    data.contact_details?.email ?? data.email;

  const verified = status === "Approved";

  return withNoStore({
    verified,
    status,
    email: contactEmail ?? null,
  });
}
