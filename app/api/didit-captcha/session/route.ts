import { NextRequest, NextResponse } from "next/server";

import { createCaptchaSession } from "@/lib/didit/catalogue";

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const answer = await createCaptchaSession(body);

  return withNoStore(answer.body, { status: answer.status });
}
