import { NextRequest } from "next/server";

import { diditUrls } from "@/lib/didit/config";
import { didit } from "@/lib/didit/server";
import { BANK, ONBOARDING_WORKFLOW_ID } from "@/lib/fintech/alder";
import {
  failed,
  noCustomer,
  noStore,
  readCustomer,
} from "@/lib/fintech/server";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where the hosted flow returns when it finishes on another device: this
 * site's own /fintech, never an address from the request.
 */
const CALLBACK = `${diditUrls.site}/fintech`;

/**
 * KYC and AML before the IBAN: the onboarding session for this customer,
 * with the email in its contact details and notifications off, so Didit
 * knows the person without the demo ever emailing anyone.
 */
export async function POST(request: NextRequest) {
  const customerId = await readCustomer(request);

  if (!customerId) return noCustomer();

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim();
  const fullName = String(body?.fullName ?? "").trim();

  if (!EMAIL.test(email) || email.length > 120) {
    return noStore({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (fullName && (fullName.length < 2 || fullName.length > 80)) {
    return noStore({ error: "Enter your full name." }, { status: 400 });
  }

  const result = await didit.sessions.create({
    workflowId: ONBOARDING_WORKFLOW_ID,
    vendorData: customerId,
    callback: CALLBACK,
    email,
    metadata: {
      bank: BANK,
      step: "onboarding",
      ...(fullName ? { full_name: fullName } : {}),
    },
  });

  if (!result.ok || !result.data) {
    return failed(result, "The verification could not be started.");
  }

  return noStore({
    sessionId: result.data.session_id,
    url: result.data.url,
    didit: [result.call],
  });
}
