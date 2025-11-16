"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";

type DiditCaptchaProps = {
  email: string | null;
  onVerified: (result: { sessionId: string; email: string | null }) => void;
};

export const DiditCaptcha: React.FC<DiditCaptchaProps> = ({
  email,
  onVerified,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkAnimation, setCheckAnimation] = useState(false);

  const startVerification = async () => {
    if (!email) {
      setError("Enter your work email first.");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Create callback URL - Didit will automatically append verificationSessionId and status
      const callbackUrl = `${window.location.origin}/didit-captcha/callback`;

      const res = await fetch("/api/didit-captcha/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          callback: callbackUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start verification");
      }

      setSessionId(data.sessionId);
      setSessionUrl(data.sessionUrl);
      setIsOpen(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Could not start verification");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = useCallback(
    (sessionId: string, email: string | null) => {
      setCheckAnimation(true);
      setIsChecked(true);
      setError(null);

      // Close modal after a brief delay to show the checkmark animation
      setTimeout(() => {
        setIsOpen(false);
        setSessionUrl(null);
        setLoading(false);
        onVerified({ sessionId, email });
      }, 800);
    },
    [onVerified]
  );

  const verifySession = async () => {
    if (!sessionId) {
      setError("Session ID is missing. Please try again.");
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const res = await fetch(
        `/api/didit-captcha/verify?sessionId=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || "Failed to verify session";
        throw new Error(errorMsg);
      }

      const status = data.status?.toLowerCase();

      if (data.verified && status === "approved") {
        handleVerificationSuccess(sessionId, data.email);
        return;
      } else if (status === "pending" || status === "in_review") {
        setError(
          "Verification is still in progress. Please complete the liveness check in the window above and wait a moment before clicking 'I'm done' again."
        );
      } else if (status === "declined" || status === "rejected") {
        setError(
          "Verification was declined. Please try again by closing this window and starting a new verification."
        );
      } else {
        setError(
          "Verification not completed yet. Please finish the liveness check above and ensure it's fully completed before clicking 'I'm done'."
        );
      }
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message ?? "Could not verify session";
      if (errorMessage.includes("Failed to retrieve")) {
        setError(
          "Unable to retrieve verification status. The session may still be processing. Please wait a moment and try again."
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckboxClick = async () => {
    if (isChecked) return;
    if (!email) {
      setError("Enter your work email first.");
      return;
    }

    // Open modal immediately
    setIsOpen(true);
    setError(null);

    // Start verification in background
    if (!loading) {
      startVerification();
    }
  };

  // Handle callback from popup window or iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const allowedOrigins: string[] = [window.location.origin];

      if (sessionUrl) {
        try {
          const sessionOrigin = new URL(sessionUrl).origin;
          allowedOrigins.push(sessionOrigin);
        } catch (e) {
          // Ignore URL parse errors
        }
      }

      if (!allowedOrigins.includes(event.origin) && event.origin !== "*") {
        return;
      }

      if (
        event.data?.type === "DIDIT_VERIFICATION_SUCCESS" &&
        event.data?.sessionId
      ) {
        fetch(
          `/api/didit-captcha/verify?sessionId=${encodeURIComponent(event.data.sessionId)}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.verified || event.data.status === "Approved") {
              handleVerificationSuccess(
                event.data.sessionId,
                data.email || null
              );
            }
          })
          .catch(() => {
            if (event.data.status === "Approved") {
              handleVerificationSuccess(event.data.sessionId, null);
            }
          });
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("didit-captcha-callback-") && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.type === "DIDIT_VERIFICATION_SUCCESS" && data.sessionId) {
            // Check if this is for our current session
            if (sessionId === data.sessionId || !sessionId) {
              fetch(
                `/api/didit-captcha/verify?sessionId=${encodeURIComponent(data.sessionId)}`
              )
                .then((res) => res.json())
                .then((verifyData) => {
                  if (verifyData.verified || data.status === "Approved") {
                    handleVerificationSuccess(
                      data.sessionId,
                      verifyData.email || null
                    );
                  }
                })
                .catch(() => {
                  if (data.status === "Approved") {
                    handleVerificationSuccess(data.sessionId, null);
                  }
                });
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    };

    // Also poll localStorage directly in case storage event doesn't fire
    const checkLocalStorage = () => {
      if (sessionId) {
        const storageKey = `didit-captcha-callback-${sessionId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            if (data.type === "DIDIT_VERIFICATION_SUCCESS") {
              localStorage.removeItem(storageKey);
              fetch(
                `/api/didit-captcha/verify?sessionId=${encodeURIComponent(data.sessionId)}`
              )
                .then((res) => res.json())
                .then((verifyData) => {
                  if (verifyData.verified || data.status === "Approved") {
                    handleVerificationSuccess(
                      data.sessionId,
                      verifyData.email || null
                    );
                  }
                })
                .catch(() => {
                  if (data.status === "Approved") {
                    handleVerificationSuccess(data.sessionId, null);
                  }
                });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);

    // Initial check of localStorage
    checkLocalStorage();

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [sessionUrl, handleVerificationSuccess, sessionId]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes checkmarkPop{0%{opacity:0;transform:scale(0.3) rotate(-45deg)}50%{opacity:1;transform:scale(1.15) rotate(5deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}`,
        }}
      />
      {/* CAPTCHA card */}
      <div className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm text-sm max-w-[302px] min-h-[74px]">
        <button
          type="button"
          onClick={handleCheckboxClick}
          disabled={loading || !email || isChecked}
          className="flex items-center gap-3 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          <div
            className={`relative w-5 h-5 rounded-sm border flex items-center justify-center transition-all duration-200 ${
              isChecked
                ? "bg-[#2667ff] border-[#2667ff] shadow-sm"
                : "bg-white border-gray-400 hover:border-gray-500"
            } ${!email ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {isChecked && (
              <Check
                className={`w-3 h-3 text-white transition-all duration-300 ${
                  checkAnimation
                    ? "scale-100 opacity-100 animate-in fade-in zoom-in"
                    : "scale-0 opacity-0"
                }`}
                style={{
                  animation: checkAnimation
                    ? "checkmarkPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards"
                    : "none",
                }}
              />
            )}
            {loading && !isChecked && (
              <Loader2 className="w-3 h-3 text-[#2667ff] animate-spin" />
            )}
          </div>
          <span className="select-none text-gray-800 font-medium">
            {loading && !isChecked
              ? "Starting Didit check…"
              : isChecked
                ? "Verified"
                : "I'm human"}
          </span>
        </button>

        <div className="flex flex-col items-end text-[10px] leading-tight text-gray-500">
          <span>Didit CAPTCHA</span>
          <span className="flex items-center gap-1">
            powered by
            <span className="font-semibold text-gray-700">Didit</span>
          </span>
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-500 max-w-xs">{error}</p>}

      {/* Modal with iframe */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[95vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div>
                <h2 className="text-sm font-medium text-gray-900">
                  Quick liveness check with Didit
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete the verification to confirm you&apos;re human
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setLoading(false);
                  setSessionUrl(null);
                  setSessionId(null);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition"
              >
                ×
              </button>
            </div>

            {loading && !sessionUrl ? (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 text-[#2667ff] animate-spin mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Creating verification session...
                  </p>
                  <p className="text-xs text-gray-500">
                    This will only take a moment
                  </p>
                </div>
              </div>
            ) : sessionUrl ? (
              <>
                <div className="flex-1 relative bg-gray-50">
                  <iframe
                    src={sessionUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    title="Didit verification"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                  />
                </div>

                <div className="border-t bg-white px-4 py-3">
                  {error && (
                    <div className="mb-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800">{error}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-600 flex-1">
                      Complete the liveness check above, then click
                      &quot;I&apos;m done&quot; when finished.
                    </p>
                    <button
                      type="button"
                      onClick={verifySession}
                      disabled={verifying}
                      className="px-4 py-2 text-sm rounded-lg bg-[#2667ff] text-white hover:bg-[#2667ff]/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        "I'm done"
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md px-4">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Verification Error
                  </p>
                  <p className="text-sm text-gray-600 mb-4">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setError(null);
                      setLoading(false);
                    }}
                    className="px-4 py-2 text-sm rounded-lg bg-[#2667ff] text-white hover:bg-[#2667ff]/90"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
};
