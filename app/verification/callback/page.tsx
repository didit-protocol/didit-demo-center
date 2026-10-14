"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * The hosted flow's redirect target.
 *
 * The results themselves are a MODAL on the catalogue, so this route exists
 * only for the path where the SDK cannot hand back in place: the user finished
 * the flow on another device, or a full-page redirect was used instead of the
 * SDK modal. It forwards the session straight to the catalogue, which opens
 * the same results modal and fetches the same decision.
 */
export default function VerificationCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    const sessionId = searchParams.get("verificationSessionId");

    if (sessionId) params.set("verificationSessionId", sessionId);
    const status = searchParams.get("status");

    if (status) params.set("status", status);
    const demo = searchParams.get("demo");

    if (demo) params.set("demo", demo);

    const query = params.toString();

    router.replace(query ? `/?${query}` : "/");
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-pill border-2 border-line border-t-blue" />
        <p className="text-sm text-muted">Loading your verification results…</p>
      </div>
    </div>
  );
}
