"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function DiditCaptchaCallback() {
  const searchParams = useSearchParams();
  // Didit automatically appends verificationSessionId and status
  const verificationSessionId = searchParams.get("verificationSessionId");
  const status = searchParams.get("status");

  useEffect(() => {
    if (verificationSessionId && status) {
      const message = {
        type: "DIDIT_VERIFICATION_SUCCESS",
        sessionId: verificationSessionId,
        status,
      };

      // Use localStorage to communicate (works across iframe boundaries in same origin)
      try {
        const storageKey = `didit-captcha-callback-${verificationSessionId}`;
        localStorage.setItem(storageKey, JSON.stringify(message));
        
        // Trigger storage event for same-window listeners
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: storageKey,
            newValue: JSON.stringify(message),
            storageArea: localStorage,
          })
        );

        // Also try postMessage as fallback
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage(message, "*");
          } catch (e) {
            // Ignore postMessage errors
          }
        }
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(message, "*");
          } catch (e) {
            // Ignore postMessage errors
          }
        }
      } catch (error) {
        console.error("Error sending callback message:", error);
      }

      // Close window automatically after a short delay
      setTimeout(() => {
        try {
          if (window.opener || (window.parent && window.parent !== window)) {
            window.close();
          }
        } catch (error) {
          // Ignore close errors
        }
      }, 500);
    }
  }, [verificationSessionId, status]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <p className="text-sm text-gray-600">Verification complete. Closing...</p>
      </div>
    </div>
  );
}

