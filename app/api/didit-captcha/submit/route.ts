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

export async function POST(req: NextRequest) {
  try {
    const { email, diditSessionId } = await req.json();

    if (!email || !diditSessionId) {
      return withNoStore(
        { error: "Email and Didit session are required" },
        { status: 400 },
      );
    }

    // Retrieve decision again to be sure
    const result = await captchaDecision(diditSessionId);

    if (!result || !result.ok || !result.data) {
      console.error("Didit decision error (submit)", result?.status ?? 400);

      return withNoStore(
        { error: "Could not verify Didit CAPTCHA" },
        { status: 400 },
      );
    }

    const data = result.data as {
      status?: string;
      email?: string;
      contact_details?: { email?: string };
    };
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
