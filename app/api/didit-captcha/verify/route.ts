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

  const status = (result.data as { status?: string }).status;

  // Status only: the widget needs nothing else, and the session's contact
  // details are not this endpoint's to hand out.
  return withNoStore({ verified: status === "Approved", status });
}
