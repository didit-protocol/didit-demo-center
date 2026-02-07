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
    const { email, diditSessionId } = await req.json();

    if (!email || !diditSessionId) {
      return withNoStore(
        { error: "Email and Didit session are required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return withNoStore(
        { error: "Server is not configured for Didit" },
        { status: 500 },
      );
    }

    // Retrieve decision again to be sure
    const res = await fetch(
      `${VERIFICATION_BASE_URL}/v2/session/${diditSessionId}/decision/`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-Api-Key": apiKey,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();

      console.error("Didit decision error (submit)", res.status, text);

      return withNoStore(
        { error: "Could not verify Didit CAPTCHA" },
        { status: 400 },
      );
    }

    const data = await res.json();
    const status: string | undefined = data.status;
    const contactEmail: string | undefined =
      data.contact_details?.email ?? data.email;

    const verified = status === "Approved";

    if (!verified) {
      return withNoStore(
        { error: "Didit CAPTCHA not completed successfully" },
        { status: 400 },
      );
    }

    // (Optional but recommended) enforce same email
    if (contactEmail && contactEmail.toLowerCase() !== email.toLowerCase()) {
      return withNoStore(
        { error: "Email does not match verified Didit session" },
        { status: 400 },
      );
    }

    // At this point, user has passed liveness via Didit.
    // In production, you would create your user / proceed with your flow here.
    // await db.user.create({ data: { email, diditSessionId } });

    return withNoStore({ ok: true, message: "Form submitted successfully" });
  } catch (err) {
    console.error(err);

    return withNoStore({ error: "Unexpected server error" }, { status: 500 });
  }
}
