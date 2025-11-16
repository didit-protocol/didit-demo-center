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

export async function POST(req: NextRequest) {
  try {
    const { email, vendorData, callback } = await req.json();

    if (!email) {
      return withNoStore({ error: "Email is required" }, { status: 400 });
    }

    const apiKey = process.env.API_KEY;

    // Use the dedicated CAPTCHA workflow ID
    const workflowId = "82f7360c-276e-4525-b7b3-59d8051e973c";

    if (!apiKey) {
      return withNoStore(
        { error: "Server is not configured for Didit CAPTCHA" },
        { status: 500 },
      );
    }

    const res = await fetch(`${VERIFICATION_BASE_URL}/v2/session/`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: vendorData ?? email,
        callback: callback ?? process.env.DIDIT_CALLBACK_URL ?? undefined,
        metadata: {
          source: "didit-captcha",
        },
        contact_details: {
          email,
          email_lang: "en",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Didit create session error", res.status, text);
      return withNoStore(
        { error: "Failed to create Didit session" },
        { status: 500 }
      );
    }

    const data = await res.json();

    return withNoStore({
      sessionId: data.session_id,
      sessionUrl: data.url,
    });
  } catch (err) {
    console.error("Didit session error", err);
    return withNoStore(
      { error: "Unexpected error creating Didit session" },
      { status: 500 }
    );
  }
}

