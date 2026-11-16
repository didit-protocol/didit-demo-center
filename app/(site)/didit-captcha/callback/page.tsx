"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function DiditCaptchaCallback() {
  const searchParams = useSearchParams();
  const verificationSessionId = searchParams.get("verificationSessionId");
  const status = searchParams.get("status");

  useEffect(() => {
    if (verificationSessionId && status) {
      const message = {
        type: "DIDIT_VERIFICATION_SUCCESS",
        sessionId: verificationSessionId,
        status,
      };

      try {
        const storageKey = `didit-captcha-callback-${verificationSessionId}`;

        localStorage.setItem(storageKey, JSON.stringify(message));

        window.dispatchEvent(
          new StorageEvent("storage", {
            key: storageKey,
            newValue: JSON.stringify(message),
            storageArea: localStorage,
          }),
        );

        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage(message, "*");
          } catch (e) {}
        }
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(message, "*");
          } catch (e) {}
        }
      } catch (error) {
        console.error("Error sending callback message:", error);
      }

      setTimeout(() => {
        try {
          if (window.opener || (window.parent && window.parent !== window)) {
            window.close();
          }
        } catch (error) {}
      }, 500);
    }
  }, [verificationSessionId, status]);

  const isSuccess = status?.toLowerCase() === "approved";

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="card-base text-center max-w-sm w-full animate-fade-in-up">
        {isSuccess ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h1 className="text-title text-app-black mb-2">
              Verification Complete
            </h1>
            <p className="text-body">You can now close this window.</p>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
              <Loader2 className="h-7 w-7 text-accent animate-spin" />
            </div>
            <h1 className="text-title text-app-black mb-2">Processing...</h1>
            <p className="text-body">
              Please wait while we process your verification.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
