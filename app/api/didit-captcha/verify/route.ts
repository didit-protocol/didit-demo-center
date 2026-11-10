import { NextRequest, NextResponse } from "next/server";

import { captchaDecision } from "@/lib/didit/catalogue";

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
  const result = await captchaDecision(
    req.nextUrl.searchParams.get("sessionId"),
  );

  if (!result) {
    return withNoStore({ error: "That is not a session id." }, { status: 400 });
  }

  if (!result.ok || !result.data) {
    console.error("Didit decision error", result.status);

    return withNoStore(
      { error: "Failed to retrieve Didit decision" },
      { status: 500 },
    );
  }

  const data = result.data as {
    status?: string;
    email?: string;
    contact_details?: { email?: string };
  };
  const status = data.status;
  const contactEmail = data.contact_details?.email ?? data.email;

  return withNoStore({
    verified: status === "Approved",
    status,
    email: contactEmail ?? null,
  });
}
